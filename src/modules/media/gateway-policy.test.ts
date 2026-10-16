import { describe, expect, it } from "vitest";
import { AccessToken, TokenVerifier, TrackSource } from "livekit-server-sdk";
import { gateAllowed, gateScope, type GateClaims } from "./gateway-policy";
import type { RoomAccessContext } from "../rooms/policy";
const organizationId = "c4000851-d910-4331-876b-0c0ae69f289c",
  userId = "876f2ba0-a06b-4989-a204-06f2bd26a98d",
  roomId = "f6e34e97-d8f9-42ba-b621-255b0ce77f71",
  sessionId = "a49bdb5c-17fb-430e-b25b-74572663425b";
function context(): RoomAccessContext {
  return {
    actor: {
      userId,
      organizationId,
      organizationRole: "member",
      membershipActive: true,
    },
    room: {
      id: roomId,
      organizationId,
      state: "open",
      locked: false,
      privacy: "standard",
    },
    assignment: { role: "attendee", admitted: true, banned: false },
    mediaApproval: {
      audio: true,
      camera: false,
      screen: false,
      expiresAt: 6000,
    },
  };
}
function claims(): GateClaims {
  return {
    sub: `${organizationId}:${userId}`,
    attributes: { hamyar_session_id: sessionId },
    video: {
      room: `${organizationId}:${roomId}`,
      roomJoin: true,
      canPublish: true,
      canPublishSources: ["microphone"],
      canPublishData: false,
      canUpdateOwnMetadata: false,
    },
  };
}
describe("session-bound media gateway", () => {
  it("rejects revoked, expired, banned, suspended, locked and ended permissions, including reconnects", () => {
    const c = context();
    expect(gateAllowed(claims(), c, true, 1000)).toBe(true);
    expect(gateAllowed(claims(), c, false, 1000)).toBe(false);
    expect(gateAllowed(claims(), c, true, 6000)).toBe(false);
    c.assignment!.banned = true;
    expect(gateAllowed(claims(), c, true, 1000)).toBe(false);
    c.assignment!.banned = false;
    c.actor.membershipActive = false;
    expect(gateAllowed(claims(), c, true, 1000)).toBe(false);
    c.actor.membershipActive = true;
    c.room.locked = true;
    expect(gateAllowed(claims(), c, true, 1000)).toBe(false);
    c.room.locked = false;
    c.room.state = "ended";
    expect(gateAllowed(claims(), c, true, 1000)).toBe(false);
  });
  it("does not trust token role, foreign tenant, missing session or over-broad publication claims", () => {
    const c = context(),
      token = claims();
    token.video!.canPublishSources!.push("camera");
    expect(gateAllowed(token, c, true, 1000)).toBe(false);
    token.video!.canPublish = false;
    token.video!.roomAdmin = true;
    expect(gateAllowed(token, c, true, 1000)).toBe(false);
    token.video!.roomAdmin = false;
    token.attributes = {};
    expect(gateAllowed(token, c, true, 1000)).toBe(false);
    expect(() =>
      gateScope({ ...claims(), sub: `${roomId}:${userId}` }),
    ).toThrow();
  });
  it("checks actual serialized SDK tokens (string sources), not only mocked grants", async () => {
    const key = "test-gateway-key",
      secret = "synthetic-gateway-signature-secret-not-production";
    const token = new AccessToken(key, secret, {
      identity: `${organizationId}:${userId}`,
      ttl: 60,
      attributes: { hamyar_session_id: sessionId },
    });
    token.addGrant({
      room: `${organizationId}:${roomId}`,
      roomJoin: true,
      canPublish: true,
      canPublishSources: [TrackSource.MICROPHONE],
      canPublishData: false,
      canUpdateOwnMetadata: false,
    });
    const jwt = await token.toJwt(),
      decoded = await new TokenVerifier(key, secret).verify(jwt);
    expect(
      gateAllowed(decoded as unknown as GateClaims, context(), true, 1000),
    ).toBe(true);
    await expect(
      new TokenVerifier(key, "a-different-synthetic-signature-secret").verify(
        jwt,
      ),
    ).rejects.toThrow();
  });
});
