import { describe, expect, it } from "vitest";
import type { RoomAccessContext } from "../rooms/policy";
import { buildJoinGrant } from "./token-grant";

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

describe("media token grants", () => {
  it("scopes room and identity and gives no attendee publishing or admin permission", () => {
    const c = context();
    const grant = buildJoinGrant(c);
    expect(grant.room).toBe(`${c.actor.organizationId}:${c.room.id}`);
    expect(grant.identity).toBe(`${c.actor.organizationId}:${c.actor.userId}`);
    expect(grant.ttl).toBe(300);
    expect(grant.canPublish).toBe(false);
    expect(grant.canPublishData).toBe(false);
    expect(grant.roomAdmin).toBe(false);
  });
  it("never gives a supervisor a browser roomAdmin grant", () => {
    const c = context();
    c.actor.organizationRole = "supervisor";
    expect(buildJoinGrant(c).roomAdmin).toBe(false);
    expect(buildJoinGrant(c).sources).toHaveLength(4);
  });
  it("fails closed for cross-tenant access", () => {
    const c = context();
    c.room.organizationId = "other";
    expect(() => buildJoinGrant(c)).toThrow("ROOM_ACCESS_DENIED");
  });
  it("rejects non-opaque identifiers", () => {
    const c = context();
    c.actor.userId = "student@example.com";
    expect(() => buildJoinGrant(c)).toThrow();
  });
  it("caps initial token lifetime at the approval expiry", () => {
    const c = context();
    c.mediaApproval = {
      audio: true,
      camera: false,
      screen: false,
      expiresAt: 31000,
    };
    expect(buildJoinGrant(c, 1000).ttl).toBe(30);
    expect(buildJoinGrant(c, 1000).sources).toEqual(["microphone"]);
    expect(() => buildJoinGrant(c, 30999)).toThrow("MEDIA_APPROVAL_EXPIRING");
  });
});
