export type CaptureKind = "audio" | "video";
export interface CaptureState {
  audio: MediaStream | null;
  video: MediaStream | null;
  pending: Record<CaptureKind, boolean>;
  error: string | null;
}

export const emptyCaptureState: CaptureState = {
  audio: null,
  video: null,
  pending: { audio: false, video: false },
  error: null,
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function captureErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "اجازهٔ دسترسی داده نشد. مجوز دستگاه را در تنظیمات مرورگر بررسی کنید.";
  if (name === "NotFoundError")
    return "دستگاه مورد نظر پیدا نشد. اتصال دوربین یا میکروفون را بررسی کنید.";
  if (name === "NotReadableError")
    return "دستگاه در دسترس نیست؛ ممکن است برنامهٔ دیگری از آن استفاده کند.";
  return "فعال‌کردن دستگاه ممکن نشد. از مرورگر به‌روز و اتصال امن استفاده کنید.";
}

/** Local device ownership only. No upload, recording or transport connection. */
export class LocalCapture {
  private state: CaptureState = emptyCaptureState;
  private generation = { audio: 0, video: 0 };
  private listeners = new Set<() => void>();

  constructor(
    private readonly devices: () =>
      Pick<MediaDevices, "getUserMedia"> | undefined,
  ) {}

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(state: CaptureState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }

  async start(kind: CaptureKind): Promise<void> {
    if (this.state[kind] || this.state.pending[kind]) return;
    const generation = ++this.generation[kind];
    this.update({
      ...this.state,
      error: null,
      pending: { ...this.state.pending, [kind]: true },
    });
    try {
      const devices = this.devices();
      if (!devices) throw new Error("UNSUPPORTED_CAPTURE");
      const stream = await devices.getUserMedia(
        kind === "audio"
          ? {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: false,
            }
          : {
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 24, max: 30 },
                facingMode: "user",
              },
              audio: false,
            },
      );
      // Permission can resolve after the user cancels or leaves the page.
      if (generation !== this.generation[kind]) {
        stopStream(stream);
        return;
      }
      stream.getTracks().forEach((track) =>
        track.addEventListener(
          "ended",
          () => {
            if (this.state[kind] === stream) this.stop(kind);
          },
          { once: true },
        ),
      );
      this.update({
        ...this.state,
        [kind]: stream,
        pending: { ...this.state.pending, [kind]: false },
      });
    } catch (error) {
      if (generation !== this.generation[kind]) return;
      this.update({
        ...this.state,
        error: captureErrorMessage(error),
        pending: { ...this.state.pending, [kind]: false },
      });
    }
  }

  stop(kind: CaptureKind) {
    ++this.generation[kind];
    stopStream(this.state[kind]);
    this.update({
      ...this.state,
      [kind]: null,
      pending: { ...this.state.pending, [kind]: false },
    });
  }

  stopAll = () => {
    this.stop("audio");
    this.stop("video");
  };
  clearError = () => {
    this.update({ ...this.state, error: null });
  };
}
