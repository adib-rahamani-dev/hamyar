import type { RoomOptions } from "livekit-client";

// Import the SDK dynamically only from the future real room route.
export const classroomRoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  disconnectOnPageLeave: true,
  audioCaptureDefaults: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  videoCaptureDefaults: {
    resolution: { width: 1280, height: 720, frameRate: 24 },
  },
  publishDefaults: {
    simulcast: true,
    videoCodec: "vp8",
    videoEncoding: { maxBitrate: 1_200_000, maxFramerate: 24 },
  },
} satisfies RoomOptions;
