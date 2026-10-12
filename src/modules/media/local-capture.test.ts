import { describe, expect, it, vi } from "vitest";
import { LocalCapture } from "./local-capture";

function fixture() {
  const track = new EventTarget() as EventTarget & {
    stop: ReturnType<typeof vi.fn>;
  };
  track.stop = vi.fn();
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  return { track, stream };
}

describe("local device privacy and lifecycle", () => {
  it("never requests devices before an explicit start", () => {
    const devices = vi.fn();
    const capture = new LocalCapture(devices);
    expect(capture.getSnapshot().audio).toBeNull();
    expect(capture.getSnapshot().video).toBeNull();
    expect(devices).not.toHaveBeenCalled();
  });
  it("requests microphone independently and releases it on stop", async () => {
    const { stream, track } = fixture();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const capture = new LocalCapture(() => ({ getUserMedia }));
    await capture.start("audio");
    expect(getUserMedia.mock.calls[0]![0]).toMatchObject({
      video: false,
      audio: { echoCancellation: true },
    });
    expect(capture.getSnapshot().audio).toBe(stream);
    expect(capture.getSnapshot().video).toBeNull();
    capture.stopAll();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(capture.getSnapshot().audio).toBeNull();
  });
  it("closes late permission results after cancellation or page exit", async () => {
    const { stream, track } = fixture();
    let approve!: (stream: MediaStream) => void;
    const capture = new LocalCapture(() => ({
      getUserMedia: () =>
        new Promise<MediaStream>((resolve) => {
          approve = resolve;
        }),
    }));
    const pending = capture.start("video");
    capture.stopAll();
    approve(stream);
    await pending;
    expect(track.stop).toHaveBeenCalledOnce();
    expect(capture.getSnapshot().video).toBeNull();
    expect(capture.getSnapshot().pending.video).toBe(false);
  });
  it("deduplicates pending requests", async () => {
    let approve!: (stream: MediaStream) => void;
    const getUserMedia = vi.fn(
      () =>
        new Promise<MediaStream>((resolve) => {
          approve = resolve;
        }),
    );
    const capture = new LocalCapture(() => ({ getUserMedia }));
    const pending = capture.start("audio");
    await capture.start("audio");
    expect(getUserMedia).toHaveBeenCalledOnce();
    approve(fixture().stream);
    await pending;
    capture.stopAll();
  });
  it("reacts to device removal and does not close the other device", async () => {
    const mic = fixture();
    const camera = fixture();
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce(mic.stream)
      .mockResolvedValueOnce(camera.stream);
    const session = new LocalCapture(() => ({ getUserMedia }));
    await session.start("audio");
    await session.start("video");
    mic.track.dispatchEvent(new Event("ended"));
    expect(session.getSnapshot().audio).toBeNull();
    expect(session.getSnapshot().video).toBe(camera.stream);
    expect(camera.track.stop).not.toHaveBeenCalled();
    session.stopAll();
    expect(camera.track.stop).toHaveBeenCalledOnce();
  });
  it("handles a permission denial without leaving a pending request", async () => {
    const error = new Error("private device details");
    error.name = "NotAllowedError";
    const capture = new LocalCapture(() => ({
      getUserMedia: vi.fn().mockRejectedValue(error),
    }));
    await capture.start("audio");
    expect(capture.getSnapshot().audio).toBeNull();
    expect(capture.getSnapshot().pending.audio).toBe(false);
    expect(capture.getSnapshot().error).toContain("اجازه");
    expect(capture.getSnapshot().error).not.toContain(error.message);
  });
});
