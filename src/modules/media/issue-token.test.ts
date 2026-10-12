import { afterEach, describe, expect, it, vi } from "vitest";
import { TokenVerifier } from "livekit-server-sdk";
import type { RoomAccessContext } from "../rooms/policy";

// The production module remains server-only; tests run in a Node environment.
vi.mock("server-only", () => ({}));
import { issueRoomToken } from "./issue-token.server";

const apiKey = "hamyar_test_key";
const apiSecret = "synthetic-test-secret-never-use-in-production-0123456789";

function context(): RoomAccessContext {
  const organizationId = "8d9fb789-5221-44f2-936f-874d3c44a9a2";
  return {
    actor: {
      userId: "ba6b60c9-3100-4f26-843c-219d3935aa27",
      organizationId,
      organizationRole: "member",
      membershipActive: true,
    },
    room: {
      id: "f7a5dd8a-9a3f-4b65-9e44-15c42c6c1fd5",
      organizationId,
      state: "open",
      locked: false,
      privacy: "standard",
    },
    assignment: { role: "attendee", admitted: true, banned: false },
    mediaApproval: null,
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("server token signing", () => {
  it("signs verifiable tenant-scoped receive-only claims", async () => {
    vi.stubEnv("LIVEKIT_API_KEY", apiKey);
    vi.stubEnv("LIVEKIT_API_SECRET", apiSecret);
    const c = context();
    const token = await issueRoomToken(c);
    const claims = await new TokenVerifier(apiKey, apiSecret).verify(token);
    expect(claims.video).toMatchObject({
      room: `${c.actor.organizationId}:${c.room.id}`,
      roomJoin: true,
      roomAdmin: false,
      canPublish: false,
      canPublishData: false,
    });
  });
  it("serializes only the granted source into the actual signed JWT", async () => {
    vi.stubEnv("LIVEKIT_API_KEY", apiKey);
    vi.stubEnv("LIVEKIT_API_SECRET", apiSecret);
    const c = context();
    c.mediaApproval = {
      audio: true,
      camera: false,
      screen: false,
      expiresAt: Date.now() + 60000,
    };
    const token = await issueRoomToken(c);
    const claims = await new TokenVerifier(apiKey, apiSecret).verify(token);
    expect(claims.video?.canPublish).toBe(true);
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1]!, "base64url").toString(),
    );
    expect(payload.video.canPublishSources).toEqual(["microphone"]);
    expect(payload.exp - payload.nbf).toBeLessThanOrEqual(60);
  });
  it("rejects development credentials in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LIVEKIT_API_KEY", "devkey");
    vi.stubEnv("LIVEKIT_API_SECRET", "secret");
    await expect(issueRoomToken(context())).rejects.toThrow(
      "UNSAFE_LIVEKIT_CREDENTIALS",
    );
  });
});
