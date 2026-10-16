"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Headphones,
  Mic,
  MicOff,
  ShieldCheck,
  Video,
  VideoOff,
  Volume2,
  X,
} from "lucide-react";
import { useLocalMedia } from "./use-local-media";
import { useAudioReaction } from "./use-audio-reaction";
import { useHydrated } from "./use-hydrated";
import { useDevicePreferences } from "./device-preferences";
import type { CaptureKind } from "@/modules/media/local-capture";
import "@/app/device-check.css";

/** Local-only checks. Device identifiers are never persisted or sent to the server. */
export function DeviceCheck({ roomId }: { roomId?: string }) {
  const { state, capture } = useLocalMedia();
  const hydrated = useHydrated();
  const preview = useRef<HTMLVideoElement>(null);
  const meter = useRef<HTMLDivElement>(null);
  const speaker = useRef<AudioContext | null>(null);
  const speakerEpoch = useRef(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const { selected, select } = useDevicePreferences();
  const [speakerState, setSpeakerState] = useState("idle");
  const [deviceNotice, setDeviceNotice] = useState("");
  const [guidance, setGuidance] = useState(false);
  useAudioReaction(state.audio, true, meter);

  useEffect(() => {
    const video = preview.current;
    if (!video) return;
    video.srcObject = state.video;
    if (state.video) void video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [state.video]);

  // Enumerate only after a user has explicitly granted a device permission.
  useEffect(() => {
    if (!state.audio && !state.video) return;
    const media = navigator.mediaDevices;
    if (!media?.enumerateDevices) return;
    let active = true;
    const update = async () => {
      try {
        const list = await media.enumerateDevices();
        if (active)
          setDevices(
            list.filter(
              (device) =>
                device.deviceId &&
                ["audioinput", "videoinput"].includes(device.kind),
            ),
          );
      } catch {
        if (active)
          setDeviceNotice(
            "فهرست دستگاه‌ها در دسترس نیست؛ می‌توانید دستگاه پیش‌فرض را آزمایش کنید.",
          );
      }
    };
    void update();
    media.addEventListener("devicechange", update);
    return () => {
      active = false;
      media.removeEventListener("devicechange", update);
    };
  }, [state.audio, state.video]);

  useEffect(() => {
    function stopSpeaker() {
      speakerEpoch.current++;
      void speaker.current?.close().catch(() => {});
      speaker.current = null;
    }
    window.addEventListener("pagehide", stopSpeaker);
    return () => {
      window.removeEventListener("pagehide", stopSpeaker);
      stopSpeaker();
    };
  }, []);

  function toggle(kind: CaptureKind) {
    setDeviceNotice("");
    if (state[kind] || state.pending[kind]) {
      capture.stop(kind);
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setDeviceNotice(
        "تست دستگاه به مرورگر به‌روز و نشانی امن HTTPS یا localhost نیاز دارد.",
      );
      return;
    }
    void capture.start(kind, selected[kind] || undefined);
  }
  function choose(kind: CaptureKind, deviceId: string) {
    const wasActive = !!state[kind];
    capture.stop(kind);
    select(kind, deviceId);
    if (wasActive) void capture.start(kind, deviceId || undefined);
  }
  function stopAll() {
    capture.stopAll();
    speakerEpoch.current++;
    void speaker.current?.close().catch(() => {});
    speaker.current = null;
    setSpeakerState("idle");
  }
  async function testSpeaker() {
    if (speaker.current) return;
    const generation = ++speakerEpoch.current;
    setSpeakerState("playing");
    try {
      if (!window.AudioContext) throw Error("UNSUPPORTED_AUDIO");
      const context = new AudioContext();
      speaker.current = context;
      await context.resume();
      if (speaker.current !== context || generation !== speakerEpoch.current)
        return;
      const tone = context.createOscillator();
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, context.currentTime + 0.03);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.7);
      tone.frequency.value = 523.25;
      tone.connect(gain);
      gain.connect(context.destination);
      tone.onended = () => {
        void context.close().catch(() => {});
        if (
          speaker.current === context &&
          generation === speakerEpoch.current
        ) {
          speaker.current = null;
          setSpeakerState("played");
        }
      };
      tone.start();
      tone.stop(context.currentTime + 0.75);
    } catch {
      if (generation !== speakerEpoch.current) return;
      void speaker.current?.close().catch(() => {});
      speaker.current = null;
      setSpeakerState("error");
    }
  }
  const audioOptions = devices.filter((device) => device.kind === "audioinput");
  const videoOptions = devices.filter((device) => device.kind === "videoinput");
  return (
    <section className="device-check" aria-labelledby="device-title">
      <div className="device-heading">
        <span className="landing-eyebrow">چند لحظه برای شروعی بهتر</span>
        <h1 id="device-title">با خیال راحت وارد کلاس شوید.</h1>
        <p>
          دوربین، میکروفون و صدای دستگاهتان را همین‌جا بررسی کنید. این آزمایش به
          حساب یا سرور رسانه نیاز ندارد.
        </p>
      </div>
      <div className="device-layout">
        <div className="device-camera-panel">
          <div className="device-preview">
            <video
              ref={preview}
              autoPlay
              muted
              playsInline
              hidden={!state.video}
              aria-label="پیش‌نمایش دوربین شما"
            />
            {!state.video && (
              <div className="device-camera-empty">
                <span>
                  <VideoOff size={34} strokeWidth={1.3} />
                </span>
                <strong>
                  {state.pending.video
                    ? "منتظر اجازهٔ شما…"
                    : "اینجا فقط شما را می‌بینید."}
                </strong>
                <p>برای پیش‌نمایش، «تست دوربین» را بزنید.</p>
              </div>
            )}
            <span className="device-preview-label">
              <ShieldCheck size={15} /> پیش‌نمایش خصوصی
            </span>
          </div>
          <div className="device-camera-toolbar">
            <span>
              <i className={state.video ? "device-led active" : "device-led"} />
              {state.video
                ? "دوربین روشن؛ فقط روی دستگاه شما"
                : "دوربین خاموش است"}
            </span>
            <button
              className="button secondary"
              disabled={!hydrated}
              aria-pressed={!!state.video}
              onClick={() => toggle("video")}
            >
              {state.video ? <VideoOff size={18} /> : <Video size={18} />}
              {state.pending.video
                ? "لغو درخواست دوربین"
                : state.video
                  ? "خاموش‌کردن دوربین"
                  : "تست دوربین"}
            </button>
          </div>
          <label className="device-select-label" htmlFor="camera-choice">
            انتخاب دوربین
          </label>
          <select
            id="camera-choice"
            value={selected.video}
            onChange={(event) => choose("video", event.target.value)}
            disabled={!videoOptions.length || state.pending.video}
          >
            <option value="">دوربین پیش‌فرض دستگاه</option>
            {videoOptions.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label ||
                  `دوربین ${(index + 1).toLocaleString("fa-IR")}`}
              </option>
            ))}
          </select>
          <small>
            گزینه‌ها پس از اجازهٔ دسترسی نمایش داده می‌شوند. انتخاب شما تا
            تازه‌کردن این تب، برای اتصال به اتاق هم استفاده می‌شود.
          </small>
        </div>
        <div className="device-tests">
          <section className="device-test-card" aria-labelledby="mic-title">
            <div className="device-card-title">
              <span className="device-test-icon">
                <Mic size={21} />
              </span>
              <div>
                <h2 id="mic-title">صدای شما</h2>
                <p>چند کلمه بگویید و حرکت نوار را ببینید.</p>
              </div>
              <span className="device-step">۰۱</span>
            </div>
            <div
              className="device-level"
              ref={meter}
              role="img"
              aria-label={
                state.audio
                  ? "نشانگر سطح صدای میکروفون روشن است"
                  : "میکروفون خاموش است"
              }
            >
              <span />
            </div>
            <p className="device-test-status" role="status">
              {state.pending.audio
                ? "مجوز میکروفون را در مرورگر بررسی کنید."
                : state.audio
                  ? "میکروفون روشن است؛ اگر نوار حرکت نمی‌کند، دستگاه و تنظیمات صدا را بررسی کنید."
                  : "میکروفون خاموش است؛ هیچ صدایی دریافت نمی‌شود."}
            </p>
            <label className="device-select-label" htmlFor="microphone-choice">
              انتخاب میکروفون
            </label>
            <select
              id="microphone-choice"
              value={selected.audio}
              onChange={(event) => choose("audio", event.target.value)}
              disabled={!audioOptions.length || state.pending.audio}
            >
              <option value="">میکروفون پیش‌فرض دستگاه</option>
              {audioOptions.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label ||
                    `میکروفون ${(index + 1).toLocaleString("fa-IR")}`}
                </option>
              ))}
            </select>
            <button
              className="button secondary full"
              disabled={!hydrated}
              aria-pressed={!!state.audio}
              onClick={() => toggle("audio")}
            >
              {state.audio ? <MicOff size={18} /> : <Mic size={18} />}
              {state.pending.audio
                ? "لغو درخواست میکروفون"
                : state.audio
                  ? "خاموش‌کردن میکروفون"
                  : "تست میکروفون"}
            </button>
          </section>
          <section className="device-test-card" aria-labelledby="speaker-title">
            <div className="device-card-title">
              <span className="device-test-icon">
                <Headphones size={21} />
              </span>
              <div>
                <h2 id="speaker-title">صدای کلاس</h2>
                <p>صدای کوتاهی از خروجی فعلی پخش می‌شود.</p>
              </div>
              <span className="device-step">۰۲</span>
            </div>
            <button
              className="button secondary full"
              onClick={() => void testSpeaker()}
              disabled={!hydrated || speakerState === "playing"}
            >
              <Volume2 size={18} />
              {speakerState === "playing" ? "در حال پخش…" : "پخش صدای آزمایشی"}
            </button>
            <p className="device-test-status" role="status">
              {speakerState === "played"
                ? "صدایی شنیدید؟ اگر نه، خروجی صدا و میزان بلندی دستگاه را بررسی کنید."
                : speakerState === "error"
                  ? "پخش صدا ممکن نشد؛ اجازهٔ پخش و تنظیمات مرورگر را بررسی کنید."
                  : "صدای دستگاه را کم کنید؛ استفاده از هدفون به کاهش پژواک کمک می‌کند."}
            </p>
          </section>
        </div>
      </div>
      {(state.error || deviceNotice) && (
        <div className="device-error" role="alert">
          <strong>یک مورد نیاز به بررسی دارد</strong>
          <p>{state.error || deviceNotice}</p>
          <button className="text-action" onClick={() => setGuidance(true)}>
            راهنمای رفع مشکل
          </button>
        </div>
      )}
      <div className="device-privacy">
        <ShieldCheck size={21} />
        <div>
          <strong>این بررسی خصوصی است.</strong>
          <p>
            صدا و تصویر ضبط، ذخیره یا به سرور ارسال نمی‌شوند. تست موفق دستگاه به
            معنی اتصال موفق به کلاس نیست؛ کیفیت شبکه و سرور رسانه جدا بررسی
            می‌شوند.
          </p>
        </div>
      </div>
      <div className="device-bottom">
        <div>
          <Link
            className="button primary"
            href={roomId ? `/rooms/${roomId}` : "/workspace"}
            onClick={stopAll}
          >
            {roomId ? "بازگشت به اتاق" : "ادامه به مجموعه‌های شما"}
            <ArrowLeft size={18} />
          </Link>
          <button className="button secondary" onClick={stopAll}>
            <X size={17} />
            خاموش‌کردن همه
          </button>
        </div>
        <span>
          <Check size={15} /> برای ادامه، روشن‌کردن دستگاه‌ها لازم نیست.
        </span>
      </div>
      <details
        className="device-help"
        open={guidance}
        onToggle={(event) => setGuidance(event.currentTarget.open)}
      >
        <summary>چیزی درست کار نمی‌کند؟</summary>
        <div>
          <h3>دستگاه پیدا نمی‌شود یا اجازه رد شده</h3>
          <p>
            از تنظیمات کنار نشانی مرورگر، دسترسی دوربین و میکروفون را بررسی
            کنید. برنامه‌ای را که از دستگاه استفاده می‌کند ببندید و دوباره تست
            کنید. در نشانی ناامن، تست دستگاه در دسترس نیست.
          </p>
          <h3>برای اینترنت محدود چه کنم؟</h3>
          <p>
            در اتاق ابتدا فقط به صدا متصل شوید و دوربین را خاموش نگه دارید. چت و
            تخته مستقل از رسانه‌اند. اگر صدا پخش نشد، «اجازهٔ پخش صدا» را در
            اتاق بزنید.
          </p>
          <h3>دستگاه را عوض کردم</h3>
          <p>
            گزینهٔ تازه را از فهرست انتخاب کنید یا درخواست قبلی را لغو و دوباره
            آزمایش کنید. انتخاب شما در همین تب به اتصال اتاق منتقل می‌شود؛ پس از
            تازه‌کردن صفحه، پیش‌فرض مرورگر استفاده می‌شود. هیچ دستگاهی با ورود
            به اتاق خودکار روشن نمی‌شود.
          </p>
        </div>
      </details>
    </section>
  );
}
