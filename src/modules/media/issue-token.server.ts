import "server-only";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import { z } from "zod";
import type { MediaSource, RoomAccessContext } from "../rooms/policy";
import { buildJoinGrant } from "./token-grant";

const sourceMap: Record<MediaSource, TrackSource> = {
  microphone: TrackSource.MICROPHONE,
  camera: TrackSource.CAMERA,
  screen_share: TrackSource.SCREEN_SHARE,
  screen_share_audio: TrackSource.SCREEN_SHARE_AUDIO,
};

/** NOT an endpoint. Caller must resolve session, membership, ban and admission first. */
export async function issueRoomToken(
  context: RoomAccessContext,
  participant?: { sessionId: string; name: string },
): Promise<string> {
  const config = z
    .object({
      LIVEKIT_API_KEY: z.string().min(1),
      LIVEKIT_API_SECRET: z.string().min(1),
    })
    .parse(process.env);
  if (
    process.env.NODE_ENV === "production" &&
    (config.LIVEKIT_API_KEY === "devkey" ||
      config.LIVEKIT_API_SECRET.length < 32)
  ) {
    throw new Error("UNSAFE_LIVEKIT_CREDENTIALS");
  }
  const grant = buildJoinGrant(context);
  const token = new AccessToken(
    config.LIVEKIT_API_KEY,
    config.LIVEKIT_API_SECRET,
    {
      identity: grant.identity,
      ttl: grant.ttl,
      name: participant?.name,
      attributes: participant
        ? { hamyar_session_id: z.uuid().parse(participant.sessionId) }
        : undefined,
    },
  );
  token.addGrant({
    room: grant.room,
    roomJoin: grant.roomJoin,
    roomAdmin: grant.roomAdmin,
    canSubscribe: grant.canSubscribe,
    canPublish: grant.canPublish,
    canPublishData: grant.canPublishData,
    canUpdateOwnMetadata: false,
    canPublishSources: grant.sources.map((source) => sourceMap[source]),
  });
  return token.toJwt();
}
