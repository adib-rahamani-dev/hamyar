import { z } from "zod";
import {
  canAccessRoom,
  allowedMediaSources,
  type RoomAccessContext,
} from "../rooms/policy.js";
const uuid = z.uuid();
export type GateClaims = {
  sub?: string;
  video?: {
    room?: string;
    roomJoin?: boolean;
    roomAdmin?: boolean;
    roomCreate?: boolean;
    roomList?: boolean;
    canPublish?: boolean;
    canPublishData?: boolean;
    canUpdateOwnMetadata?: boolean;
    canPublishSources?: string[];
  };
  attributes?: Record<string, string>;
};
export function gateScope(claims: GateClaims) {
  const identity = claims.sub?.split(":"),
    room = claims.video?.room?.split(":");
  const sessionId = claims.attributes?.hamyar_session_id;
  if (
    !identity ||
    !room ||
    identity.length !== 2 ||
    room.length !== 2 ||
    identity[0] !== room[0] ||
    !sessionId
  )
    throw new Error("GATE_SCOPE_INVALID");
  return {
    organizationId: uuid.parse(identity[0]),
    userId: uuid.parse(identity[1]),
    roomId: uuid.parse(room[1]),
    sessionId: uuid.parse(sessionId),
  };
}
/** The JWT is verified before this function. Mutable claims never establish role or admission.
 * Reject over-privileged old grants on every reconnect and periodic reauthorization.
 */
export function gateAllowed(
  claims: GateClaims,
  context: RoomAccessContext,
  sessionAlive: boolean,
  now = Date.now(),
) {
  if (!sessionAlive || !canAccessRoom(context, "join", now)) return false;
  try {
    const scope = gateScope(claims);
    if (
      scope.userId !== context.actor.userId ||
      scope.organizationId !== context.actor.organizationId ||
      scope.roomId !== context.room.id
    )
      return false;
  } catch {
    return false;
  }
  const grant = claims.video;
  if (
    !grant?.roomJoin ||
    grant.roomAdmin ||
    grant.roomCreate ||
    grant.roomList ||
    grant.canPublishData !== false ||
    grant.canUpdateOwnMetadata
  )
    return false;
  if (!grant.canPublish) return true;
  const allowed: string[] = allowedMediaSources(context, now);
  return (
    !!grant.canPublishSources?.length &&
    grant.canPublishSources.every((s) => allowed.includes(s))
  );
}
