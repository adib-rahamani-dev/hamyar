import { describe, expect, it } from "vitest";
import {
  allowedMediaSources,
  canAccessRoom,
  type RoomAccessContext,
} from "./policy";

function context(): RoomAccessContext {
  return {
    actor: {
      userId: "user-a",
      organizationId: "school-a",
      organizationRole: "member",
      membershipActive: true,
    },
    room: {
      id: "room-a",
      organizationId: "school-a",
      state: "open",
      locked: false,
      privacy: "standard",
    },
    assignment: { role: "attendee", admitted: true, banned: false },
    mediaApproval: null,
  };
}

describe("room access boundary", () => {
  it("denies unknown runtime actions even for moderators", () => {
    const c = context();
    c.actor.organizationRole = "supervisor";
    expect(canAccessRoom(c, "untrusted_action" as never)).toBe(false);
  });
  it("denies malformed approval expiry", () => {
    const c = context();
    c.mediaApproval = {
      audio: true,
      camera: true,
      screen: true,
      expiresAt: Number.NaN,
    };
    expect(allowedMediaSources(c)).toEqual([]);
  });
  it("admits an assigned attendee without publishing privileges", () => {
    expect(canAccessRoom(context(), "join")).toBe(true);
    expect(allowedMediaSources(context())).toEqual([]);
    expect(canAccessRoom(context(), "record")).toBe(false);
  });
  it.each(["owner", "admin", "supervisor"] as const)(
    "denies %s across tenants",
    (role) => {
      const c = context();
      c.actor.organizationRole = role;
      c.room.organizationId = "school-b";
      expect(canAccessRoom(c, "join")).toBe(false);
      expect(canAccessRoom(c, "manage")).toBe(false);
      expect(allowedMediaSources(c)).toEqual([]);
    },
  );
  it("gives a supervisor control across rooms in their own organization", () => {
    const c = context();
    c.actor.organizationRole = "supervisor";
    c.assignment = null;
    c.room.locked = true;
    expect(canAccessRoom(c, "join")).toBe(true);
    expect(canAccessRoom(c, "manage")).toBe(true);
    expect(canAccessRoom(c, "record")).toBe(true);
  });
  it("denies revoked memberships even for supervisors", () => {
    const c = context();
    c.actor.organizationRole = "supervisor";
    c.actor.membershipActive = false;
    expect(canAccessRoom(c, "join")).toBe(false);
  });
  it("denies unassigned members and lobby participants", () => {
    const c = context();
    c.assignment = null;
    expect(canAccessRoom(c, "join")).toBe(false);
    c.assignment = { role: "attendee", admitted: false, banned: false };
    expect(canAccessRoom(c, "join")).toBe(false);
  });
  it("denies a banned host", () => {
    const c = context();
    c.assignment = { role: "host", admitted: true, banned: true };
    expect(canAccessRoom(c, "join")).toBe(false);
  });
  it.each(["scheduled", "ended"] as const)("denies %s sessions", (state) => {
    const c = context();
    c.room.state = state;
    c.actor.organizationRole = "owner";
    expect(canAccessRoom(c, "join")).toBe(false);
  });
  it("locks out attendees while allowing the host", () => {
    const c = context();
    c.room.locked = true;
    expect(canAccessRoom(c, "join")).toBe(false);
    c.assignment!.role = "host";
    expect(canAccessRoom(c, "join")).toBe(true);
  });
  it("grants sources independently and respects expiry", () => {
    const c = context();
    c.mediaApproval = {
      audio: true,
      camera: false,
      screen: false,
      expiresAt: 2000,
    };
    expect(allowedMediaSources(c, 1000)).toEqual(["microphone"]);
    expect(allowedMediaSources(c, 2000)).toEqual([]);
    c.mediaApproval.screen = true;
    expect(allowedMediaSources(c, 1000)).toEqual([
      "microphone",
      "screen_share",
      "screen_share_audio",
    ]);
  });
  it("lets presenters publish, but not manage or record", () => {
    const c = context();
    c.assignment!.role = "presenter";
    expect(allowedMediaSources(c)).toHaveLength(4);
    expect(canAccessRoom(c, "manage")).toBe(false);
    expect(canAccessRoom(c, "record")).toBe(false);
  });
  it("disables server recording for E2EE rooms even for hosts", () => {
    const c = context();
    c.assignment!.role = "host";
    c.room.privacy = "e2ee";
    expect(canAccessRoom(c, "record")).toBe(false);
  });
});
