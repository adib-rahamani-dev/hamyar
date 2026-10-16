import { createServer } from "node:http";
import { Pool } from "pg";
import WebSocket, { WebSocketServer } from "ws";
import { TokenVerifier, RoomServiceClient } from "livekit-server-sdk";
import { gateScope, gateAllowed } from "../.gateway/media/gateway-policy.js";
import { assertRuntimeRole } from "../.gateway/identity/database-role.js";
import { assertDomesticDependencies } from "../.gateway/operations/deployment-mode.js";

// Always-on Linux service. Never run as a Vercel Function or expose the SFU's raw signaling port.
assertDomesticDependencies(process.env);
const needed = [
  "DATABASE_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "LIVEKIT_INTERNAL_URL",
  "BETTER_AUTH_URL",
];
if (
  needed.some((k) => !process.env[k]) ||
  process.env.LIVEKIT_API_SECRET.length < 32
)
  throw Error("GATE_CONFIGURATION_REQUIRED");
const backend = new URL(process.env.LIVEKIT_INTERNAL_URL);
if (
  !["http:", "https:"].includes(backend.protocol) ||
  backend.username ||
  backend.password
)
  throw Error("GATE_BACKEND_INVALID");
const origin = new URL(process.env.BETTER_AUTH_URL).origin;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 5000,
  statement_timeout: 5000,
  query_timeout: 6000,
});
pool.on("error", () =>
  console.error("Gateway database connection unavailable."),
);
await assertRuntimeRole(pool);
const verifier = new TokenVerifier(
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET,
);
const control = new RoomServiceClient(
  backend.origin,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET,
  { requestTimeout: 5, failover: false },
);
const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 2 * 1024 * 1024,
});
const clients = new Set();
let pending = 0;

async function check(claims) {
  const scoped = gateScope(claims),
    client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('app.user_id',$1,true),set_config('app.tenant_id',$2,true)",
      [scoped.userId, scoped.organizationId],
    );
    const row = (
      await client.query(
        "SELECT s.id AS session_id,m.role AS org_role,m.status,r.state,r.locked,a.role AS room_role,a.admitted,a.banned,a.audio_allowed,a.camera_allowed,a.screen_allowed,a.grant_expires_at FROM auth_session s JOIN membership m ON m.user_id=s.user_id AND m.organization_id=$2 JOIN meeting_room r ON r.organization_id=m.organization_id AND r.id=$3 LEFT JOIN room_assignment a ON a.organization_id=r.organization_id AND a.room_id=r.id AND a.membership_id=m.id WHERE s.id=$4 AND s.user_id=$1 AND s.expires_at>now()",
        [scoped.userId, scoped.organizationId, scoped.roomId, scoped.sessionId],
      )
    ).rows[0];
    if (!row) return false;
    if (process.env.AUTH_EMAIL_VERIFICATION_REQUIRED !== "false") {
      const user = (
        await client.query("SELECT email_verified FROM auth_user WHERE id=$1", [
          scoped.userId,
        ])
      ).rows[0];
      if (!user?.email_verified) return false;
    }
    const context = {
      actor: {
        userId: scoped.userId,
        organizationId: scoped.organizationId,
        organizationRole: row.org_role,
        membershipActive: row.status === "active",
      },
      room: {
        id: scoped.roomId,
        organizationId: scoped.organizationId,
        state: row.state,
        locked: row.locked,
        privacy: "standard",
      },
      assignment: row.room_role
        ? { role: row.room_role, admitted: row.admitted, banned: row.banned }
        : null,
      mediaApproval: row.grant_expires_at
        ? {
            audio: row.audio_allowed,
            camera: row.camera_allowed,
            screen: row.screen_allowed,
            expiresAt: new Date(row.grant_expires_at).getTime(),
          }
        : null,
    };
    return gateAllowed(claims, context, true);
  } finally {
    try {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }
}
async function authenticate(req) {
  const url = new URL(req.url, "http://gateway.local");
  if (
    !/^\/rtc(?:\/validate|\/v1)?$/.test(url.pathname) ||
    req.headers.origin !== origin
  )
    throw Error("GATE_DENIED");
  const token = url.searchParams.get("access_token");
  if (!token || token.length > 8192) throw Error("GATE_DENIED");
  const claims = await verifier.verify(token);
  if (!(await check(claims))) throw Error("GATE_DENIED");
  return { claims, url };
}
async function remove(claims) {
  // Closing the websocket alone is insufficient; explicitly remove media at the SFU.
  await control.removeParticipant(claims.video.room, claims.sub).catch(() => {
    console.error(
      "Media revocation failed; check private SFU control connectivity.",
    );
  });
}
const server = createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"service":"hamyar-media-gateway"}');
    return;
  }
  try {
    if (req.headers.origin === origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    if (
      req.method === "OPTIONS" &&
      req.headers.origin === origin &&
      /^\/rtc(?:\/validate|\/v1)?(?:\?|$)/.test(req.url)
    ) {
      res.writeHead(204, {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "authorization",
      });
      res.end();
      return;
    }
    if (req.method !== "GET") throw Error("GATE_DENIED");
    const { url } = await authenticate(req);
    const upstream = await fetch(new URL(url.pathname + url.search, backend), {
      signal: AbortSignal.timeout(7000),
    });
    res.writeHead(upstream.status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(await upstream.text());
  } catch {
    res.writeHead(403, { "Cache-Control": "no-store" });
    res.end("Access denied");
  }
});
server.on("upgrade", async (req, socket, head) => {
  if (clients.size + pending >= 200) {
    socket.end("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n");
    return;
  }
  pending++;
  try {
    const { claims, url } = await authenticate(req);
    const target = new URL(url.pathname + url.search, backend);
    target.protocol = backend.protocol === "https:" ? "wss:" : "ws:";
    wss.handleUpgrade(req, socket, head, (browser) => {
      const upstream = new WebSocket(target, {
        handshakeTimeout: 7000,
        maxPayload: 2 * 1024 * 1024,
      });
      const entry = { browser, upstream, claims, checking: false };
      clients.add(entry);
      const queue = [];
      let queuedBytes = 0;
      browser.on("message", (data, binary) => {
        if (upstream.bufferedAmount > 1024 * 1024)
          browser.close(1009, "Slow connection");
        else if (upstream.readyState === WebSocket.OPEN)
          upstream.send(data, { binary });
        else if (
          queue.length < 20 &&
          (queuedBytes += data.length) <= 1024 * 1024
        )
          queue.push([data, binary]);
        else browser.close(1009, "Too much buffered data");
      });
      upstream.on("open", () => {
        for (const [data, binary] of queue) upstream.send(data, { binary });
        queue.length = 0;
      });
      upstream.on("message", (data, binary) => {
        if (browser.bufferedAmount > 1024 * 1024)
          browser.close(1009, "Slow connection");
        else if (browser.readyState === WebSocket.OPEN)
          browser.send(data, { binary });
      });
      const close = () => {
        clients.delete(entry);
        browser.close();
        upstream.close();
      };
      browser.on("close", close);
      browser.on("error", close);
      upstream.on("close", close);
      upstream.on("error", close);
    });
  } catch {
    socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
  } finally {
    pending--;
  }
});
const timer = setInterval(() => {
  for (const entry of clients) {
    if (entry.checking) continue;
    entry.checking = true;
    void check(entry.claims)
      .then(async (valid) => {
        if (!valid) {
          await remove(entry.claims);
          entry.browser.close(4003, "Access revoked");
          entry.upstream.close();
        }
      })
      .catch(async () => {
        await remove(entry.claims);
        entry.browser.close(4003, "Authorization unavailable");
        entry.upstream.close();
      })
      .finally(() => {
        entry.checking = false;
      });
  }
}, 5000);
server.listen(Number(process.env.MEDIA_GATEWAY_PORT ?? 8090), "127.0.0.1", () =>
  console.log("Hamyar media gateway listening on loopback."),
);
async function shutdown() {
  clearInterval(timer);
  for (const entry of clients) {
    entry.browser.close();
    entry.upstream.close();
  }
  server.close();
  await pool.end();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
// No URL, token, message payload or credential is logged, including denied handshakes.
