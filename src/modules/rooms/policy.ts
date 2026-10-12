export type OrganizationRole = "owner" | "admin" | "supervisor" | "member";
export type RoomRole = "host" | "presenter" | "attendee";
export type MediaSource =
  "microphone" | "camera" | "screen_share" | "screen_share_audio";
export type RoomAction =
  | "join"
  | "manage"
  | "record"
  | "publish_audio"
  | "publish_camera"
  | "publish_screen";

/** Construct only from a verified session and tenant-scoped server records. */
export interface RoomAccessContext {
  actor: {
    userId: string;
    organizationId: string;
    organizationRole: OrganizationRole;
    membershipActive: boolean;
  };
  room: {
    id: string;
    organizationId: string;
    state: "scheduled" | "open" | "ended";
    locked: boolean;
    privacy: "standard" | "e2ee";
  };
  assignment: {
    role: RoomRole;
    admitted: boolean;
    banned: boolean;
  } | null;
  mediaApproval: {
    audio: boolean;
    camera: boolean;
    screen: boolean;
    expiresAt: number;
  } | null;
}

function isModerator(context: RoomAccessContext): boolean {
  return (
    ["owner", "admin", "supervisor"].includes(context.actor.organizationRole) ||
    context.assignment?.role === "host"
  );
}

export function canAccessRoom(
  context: RoomAccessContext,
  action: RoomAction,
  now = Date.now(),
): boolean {
  if (
    ![
      "join",
      "manage",
      "record",
      "publish_audio",
      "publish_camera",
      "publish_screen",
    ].includes(action) ||
    !Number.isFinite(now) ||
    !context.actor.membershipActive ||
    context.actor.organizationId !== context.room.organizationId ||
    context.room.state !== "open" ||
    context.assignment?.banned
  )
    return false;

  const moderator = isModerator(context);
  const mayJoin =
    moderator ||
    (context.assignment !== null &&
      context.assignment.admitted &&
      !context.room.locked);
  if (!mayJoin) return false;
  if (action === "join") return true;
  if (action === "manage") return moderator;
  if (action === "record")
    return moderator && context.room.privacy === "standard";
  if (moderator || context.assignment?.role === "presenter") return true;

  const approval = context.mediaApproval;
  if (
    !approval ||
    !Number.isFinite(approval.expiresAt) ||
    approval.expiresAt <= now
  )
    return false;
  if (action === "publish_audio") return approval.audio;
  if (action === "publish_camera") return approval.camera;
  return approval.screen;
}

export function allowedMediaSources(
  context: RoomAccessContext,
  now = Date.now(),
): MediaSource[] {
  const sources: MediaSource[] = [];
  if (canAccessRoom(context, "publish_audio", now)) sources.push("microphone");
  if (canAccessRoom(context, "publish_camera", now)) sources.push("camera");
  if (canAccessRoom(context, "publish_screen", now))
    sources.push("screen_share", "screen_share_audio");
  return sources;
}
