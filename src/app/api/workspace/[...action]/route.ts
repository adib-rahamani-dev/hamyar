import { getIdentity } from "@/modules/identity/runtime.server";
import { createTenancy, DomainError } from "@/modules/tenancy/service";
import { ZodError } from "zod";
import { createRoomRepository } from "@/modules/rooms/repository";

export const dynamic = "force-dynamic";
async function handle(
  request: Request,
  context: { params: Promise<{ action: string[] }> },
) {
  try {
    const { auth, pool, assertReady } = getIdentity();
    await assertReady();
    if (
      request.method !== "GET" &&
      request.headers.get("origin") !==
        new URL(process.env.BETTER_AUTH_URL!).origin
    )
      throw new DomainError("ORIGIN_DENIED");
    const service = createTenancy(pool, auth);
    const rooms = createRoomRepository(pool, auth);
    const who = await service.actor(request.headers);
    const limited = await pool.query(
      "INSERT INTO workspace_rate_limit(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET count=CASE WHEN workspace_rate_limit.started_at<=now()-interval '1 minute' THEN 1 ELSE workspace_rate_limit.count+1 END,started_at=CASE WHEN workspace_rate_limit.started_at<=now()-interval '1 minute' THEN now() ELSE workspace_rate_limit.started_at END WHERE workspace_rate_limit.count<60 OR workspace_rate_limit.started_at<=now()-interval '1 minute' RETURNING user_id",
      [who.userId],
    );
    if (!limited.rows.length) throw new DomainError("RATE_LIMITED", 429);
    const { action } = await context.params;
    let body: unknown = null;
    if (request.method !== "GET") {
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        throw new DomainError("JSON_REQUIRED", 415);
      const reader = request.body?.getReader();
      let length = 0;
      const chunks: Uint8Array[] = [];
      if (reader)
        while (true) {
          const value = await reader.read();
          if (value.done) break;
          length += value.value.byteLength;
          if (length > 8192) {
            await reader.cancel();
            throw new DomainError("PAYLOAD_TOO_LARGE", 413);
          }
          chunks.push(value.value);
        }
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        throw new DomainError("INVALID_JSON", 400);
      }
    }
    let result: unknown;
    const path = action.join("/");
    if (request.method === "GET" && path === "rooms")
      result = await rooms.list(request.headers);
    else if (request.method === "POST" && path === "rooms")
      result = await rooms.create(request.headers, body);
    else if (
      request.method === "PATCH" &&
      action[0] === "rooms" &&
      action.length === 2
    )
      result = await rooms.update(request.headers, action[1]!, body);
    else if (
      request.method === "POST" &&
      action[0] === "rooms" &&
      action[2] === "assignments" &&
      action.length === 3
    )
      result = await rooms.assign(request.headers, action[1]!, body);
    else if (request.method === "GET" && path === "organizations")
      result = await service.list(request.headers);
    else if (request.method === "POST" && path === "organizations")
      result = await service.create(request.headers, body);
    else if (
      request.method === "POST" &&
      action[0] === "switch" &&
      action.length === 2
    )
      result = await service.switch(request.headers, action[1]!);
    else if (request.method === "GET" && path === "members")
      result = await service.members(request.headers);
    else if (
      request.method === "PATCH" &&
      action[0] === "members" &&
      action.length === 2
    )
      result = await service.updateMember(request.headers, action[1]!, body);
    else if (request.method === "GET" && path === "invitations")
      result = await service.invitations(request.headers);
    else if (request.method === "POST" && path === "invitations")
      result = await service.invite(request.headers, body);
    else if (
      request.method === "POST" &&
      action[0] === "cancel" &&
      action.length === 2
    )
      result = await service.cancelInvite(request.headers, action[1]!);
    else if (request.method === "POST" && path === "accept") {
      if (
        !body ||
        typeof body !== "object" ||
        !("token" in body) ||
        typeof body.token !== "string" ||
        Object.keys(body).length !== 1
      )
        throw new DomainError("INVALID_REQUEST", 400);
      result = await service.acceptInvite(request.headers, body.token);
    } else throw new DomainError("NOT_FOUND", 404);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code =
      error instanceof DomainError
        ? error.code
        : error instanceof ZodError
          ? "INVALID_REQUEST"
          : error instanceof Error &&
              error.message === "IDENTITY_NOT_CONFIGURED"
            ? "IDENTITY_NOT_CONFIGURED"
            : "REQUEST_FAILED";
    const status =
      error instanceof DomainError
        ? error.status
        : error instanceof ZodError
          ? 400
          : code === "IDENTITY_NOT_CONFIGURED"
            ? 503
            : 500;
    return Response.json(
      { error: code },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export { handle as GET, handle as POST, handle as PATCH };
