import { z } from "zod";
import {
  allowedMediaSources,
  canAccessRoom,
  type RoomAccessContext,
} from "../rooms/policy";

const opaqueId = z.uuid();

/** Pure grant builder; server adapter owns credentials and signing. */
export function buildJoinGrant(context: RoomAccessContext, now = Date.now()) {
  if (!canAccessRoom(context, "join", now))
    throw new Error("ROOM_ACCESS_DENIED");
  const organizationId = opaqueId.parse(context.actor.organizationId);
  const roomId = opaqueId.parse(context.room.id);
  const userId = opaqueId.parse(context.actor.userId);
  const sources = allowedMediaSources(context, now);
  const usesTimedApproval =
    context.actor.organizationRole === "member" &&
    context.assignment?.role === "attendee" &&
    sources.length > 0;
  const ttl = usesTimedApproval
    ? Math.min(300, Math.floor((context.mediaApproval!.expiresAt - now) / 1000))
    : 300;
  if (ttl < 1) throw new Error("MEDIA_APPROVAL_EXPIRING");

  return {
    identity: `${organizationId}:${userId}`,
    ttl,
    room: `${organizationId}:${roomId}`,
    roomJoin: true,
    roomAdmin: false,
    canSubscribe: true,
    canPublish: sources.length > 0,
    // Chat/board must go through an authenticated, moderated persistence service.
    canPublishData: false,
    sources,
  } as const;
}
