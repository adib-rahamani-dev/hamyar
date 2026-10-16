"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Room, Track } from "livekit-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Radio,
  Volume2,
} from "lucide-react";
import { classroomRoomOptions } from "@/modules/media/room-options";
import { useDevicePreferences } from "./device-preferences";
type Feed = {
  id: string;
  name: string;
  track: Track;
  local: boolean;
  screen: boolean;
};
function FeedView({ feed }: { feed: Feed }) {
  const element = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    expanded = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = element.current;
    if (!video) return;
    feed.track.attach(video);
    return () => {
      feed.track.detach(video);
    };
  }, [feed]);
  useEffect(() => {
    const video = expanded.current;
    if (!video) return;
    return () => {
      feed.track.detach(video);
    };
  }, [feed]);
  return (
    <>
      <figure className={feed.screen ? "media-feed screen" : "media-feed"}>
        <video ref={element} autoPlay playsInline muted={feed.local} />
        <figcaption>
          {feed.name}
          {feed.screen ? " · صفحه" : ""}
        </figcaption>
        <button
          className="media-expand"
          onClick={() => {
            dialog.current?.showModal();
            if (expanded.current) feed.track.attach(expanded.current);
          }}
          aria-label={`بزرگ‌کردن تصویر ${feed.name}`}
        >
          بزرگ‌نمایی
        </button>
      </figure>
      <dialog
        className="media-dialog"
        ref={dialog}
        onClose={() => {
          if (expanded.current) feed.track.detach(expanded.current);
        }}
        aria-label={`نمایش بزرگ ${feed.name}`}
      >
        <button
          className="button secondary"
          onClick={() => dialog.current?.close()}
        >
          بستن نمایش بزرگ
        </button>
        <video ref={expanded} autoPlay playsInline muted={feed.local} />
        <p>{feed.name}</p>
      </dialog>
    </>
  );
}
/** The SDK is loaded only by Connect. No device is acquired by mounting this view.
 * A generation counter closes late joins/tracks after cancellation or unmount.
 * Chat/board use the authenticated persistence API, never unmoderated data packets.
 */
export function MediaStage({
  roomId,
  open,
  canSpeak,
}: {
  roomId: string;
  open: boolean;
  canSpeak: boolean;
}) {
  const { selected } = useDevicePreferences();
  const room = useRef<Room | null>(null),
    epoch = useRef(0),
    alive = useRef(true),
    audio = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("idle"),
    [error, setError] = useState(""),
    [feeds, setFeeds] = useState<Feed[]>([]),
    [sources, setSources] = useState<string[]>([]);
  const [mic, setMic] = useState(false),
    [camera, setCamera] = useState(false),
    [screen, setScreen] = useState(false),
    [pending, setPending] = useState(false),
    [quality, setQuality] = useState("");
  const close = useCallback(() => {
    epoch.current++;
    const previous = room.current;
    room.current = null;
    if (previous) {
      for (const publication of previous.localParticipant.trackPublications.values())
        publication.track?.stop();
      void previous.disconnect(true);
    }
    audio.current?.replaceChildren();
    if (alive.current) {
      setFeeds([]);
      setStatus("idle");
      setMic(false);
      setCamera(false);
      setScreen(false);
      setPending(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    window.addEventListener("pagehide", close);
    return () => {
      alive.current = false;
      window.removeEventListener("pagehide", close);
      close();
    };
  }, [close]);
  useEffect(() => {
    if (!open || !canSpeak) {
      const current = room.current;
      if (
        !open ||
        current?.localParticipant.isMicrophoneEnabled ||
        current?.localParticipant.isCameraEnabled ||
        current?.localParticipant.isScreenShareEnabled
      )
        close();
    }
  }, [open, canSpeak, close]);
  async function connect() {
    if (status !== "idle") return;
    const generation = ++epoch.current;
    setStatus("connecting");
    setError("");
    try {
      const response = await fetch(
        `/api/workspace/classroom/${roomId}/join-media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          cache: "no-store",
        },
      );
      const value = await response.json();
      if (!response.ok)
        throw Error(
          value.error === "MEDIA_NOT_CONFIGURED"
            ? "سرور رسانه هنوز به این محیط وصل نشده است. چت و تخته مستقل کار می‌کنند."
            : "اجازهٔ اتصال رسانه صادر نشد؛ وضعیت اتاق و عضویت را بررسی کنید.",
        );
      const { Room, RoomEvent, Track } = await import("livekit-client");
      if (!alive.current || generation !== epoch.current) return;
      const current = new Room(classroomRoomOptions);
      room.current = current;
      const active = () => alive.current && room.current === current;
      const update = () => {
        if (!active()) return;
        const next: Feed[] = [];
        for (const person of [
          current.localParticipant,
          ...current.remoteParticipants.values(),
        ]) {
          for (const publication of person.trackPublications.values()) {
            const track = publication.track;
            if (track?.kind === Track.Kind.Video && !publication.isMuted)
              next.push({
                id: publication.trackSid,
                name: person.name || "شرکت‌کننده",
                track,
                local: person === current.localParticipant,
                screen: publication.source === Track.Source.ScreenShare,
              });
          }
        }
        setFeeds(next);
        setMic(current.localParticipant.isMicrophoneEnabled);
        setCamera(current.localParticipant.isCameraEnabled);
        setScreen(current.localParticipant.isScreenShareEnabled);
      };
      current.on(RoomEvent.TrackSubscribed, (track) => {
        if (!active()) return;
        if (track.kind === Track.Kind.Audio && audio.current) {
          const element = track.attach();
          element.dataset.track = track.sid;
          audio.current.append(element);
        }
        update();
      });
      current.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove());
        update();
      });
      current
        .on(RoomEvent.LocalTrackPublished, update)
        .on(RoomEvent.LocalTrackUnpublished, update)
        .on(RoomEvent.TrackMuted, update)
        .on(RoomEvent.TrackUnmuted, update)
        .on(RoomEvent.ParticipantDisconnected, update);
      current.on(RoomEvent.Reconnecting, () => {
        if (active()) setStatus("reconnecting");
      });
      current.on(RoomEvent.Reconnected, () => {
        if (active()) setStatus("connected");
      });
      current.on(RoomEvent.Disconnected, () => {
        if (active()) {
          close();
          setError(
            "اتصال رسانه پایان یافت؛ برای بررسی مجوز تازه دوباره متصل شوید.",
          );
        }
      });
      current.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        if (active() && participant === current.localParticipant)
          setQuality(quality);
      });
      await current.connect(value.url, value.token, { autoSubscribe: true });
      if (!active() || generation !== epoch.current) {
        await current.disconnect(true);
        return;
      }
      setSources(value.sources);
      setStatus("connected");
      update();
    } catch (cause) {
      if (alive.current && generation === epoch.current) {
        close();
        setError(
          (cause instanceof Error && cause.message.includes("محیط")) ||
            (cause instanceof Error && cause.message.includes("اجازه"))
            ? cause.message
            : "ارتباط با سرور رسانه برقرار نشد. دوباره تلاش کنید.",
        );
      }
    }
  }
  async function toggle(kind: "microphone" | "camera" | "screen_share") {
    const current = room.current;
    if (!current || pending || status !== "connected") return;
    setPending(true);
    setError("");
    try {
      if (kind === "microphone")
        await current.localParticipant.setMicrophoneEnabled(
          !current.localParticipant.isMicrophoneEnabled,
          selected.audio ? { deviceId: { exact: selected.audio } } : undefined,
        );
      else if (kind === "camera")
        await current.localParticipant.setCameraEnabled(
          !current.localParticipant.isCameraEnabled,
          selected.video ? { deviceId: { exact: selected.video } } : undefined,
        );
      else
        await current.localParticipant.setScreenShareEnabled(
          !current.localParticipant.isScreenShareEnabled,
          { audio: true },
        );
      if (room.current !== current) {
        for (const p of current.localParticipant.trackPublications.values())
          p.track?.stop();
        await current.disconnect(true);
      }
    } catch {
      if (alive.current)
        setError(
          "دستگاه فعال نشد؛ اجازهٔ مرورگر، دستگاه و مجوز میزبان را بررسی کنید.",
        );
    } finally {
      if (alive.current) setPending(false);
    }
  }
  return (
    <section
      className="media-stage"
      aria-label="صوت و تصویر کلاس"
      data-media-status={status}
    >
      <div className="media-stage-heading">
        <Radio size={17} />
        <strong>صوت و تصویر</strong>
        <span>
          {status === "connected"
            ? "متصل"
            : status === "reconnecting"
              ? "تلاش برای اتصال…"
              : status === "connecting"
                ? "در حال اتصال…"
                : "آمادهٔ اتصال"}
        </span>
      </div>
      <div ref={audio} className="media-audio" />
      {feeds.length > 0 ? (
        <div className="media-feeds">
          {feeds.map((feed) => (
            <FeedView key={feed.id} feed={feed} />
          ))}
        </div>
      ) : (
        <div className="media-empty">
          <VideoOff size={27} />
          <p>
            {status === "connected"
              ? "به رسانه متصل هستید؛ دوربین فعالی برای نمایش وجود ندارد."
              : "با اتصال، صدای کلاس را می‌شنوید. دستگاه‌های شما خاموش می‌مانند."}
          </p>
        </div>
      )}
      {error && (
        <p role="status" className="section-note">
          {error}
        </p>
      )}
      {status === "idle" ? (
        <>
          <Link
            className="media-preflight-link"
            href={`/device-check?room=${roomId}`}
          >
            بررسی دوربین و میکروفون پیش از اتصال
          </Link>
          <button
            className="button primary"
            disabled={!open}
            onClick={() => void connect()}
          >
            اتصال به صوت و تصویر
          </button>
        </>
      ) : (
        <button className="text-action" onClick={close}>
          قطع اتصال رسانه
        </button>
      )}
      {(status === "connected" || status === "reconnecting") && (
        <>
          <div className="media-device-controls">
            <button
              aria-label="میکروفون کلاس"
              aria-pressed={mic}
              disabled={
                !sources.includes("microphone") ||
                pending ||
                status !== "connected"
              }
              onClick={() => void toggle("microphone")}
            >
              {mic ? <Mic size={19} /> : <MicOff size={19} />} میکروفون
            </button>
            <button
              aria-label="دوربین کلاس"
              aria-pressed={camera}
              disabled={
                !sources.includes("camera") || pending || status !== "connected"
              }
              onClick={() => void toggle("camera")}
            >
              {camera ? <Video size={19} /> : <VideoOff size={19} />} دوربین
            </button>
            <button
              aria-label="اشتراک صفحه"
              aria-pressed={screen}
              disabled={
                !sources.includes("screen_share") ||
                pending ||
                status !== "connected"
              }
              onClick={() => void toggle("screen_share")}
            >
              <MonitorUp size={19} /> صفحه
            </button>
          </div>
          <button
            className="text-action"
            onClick={() =>
              void room.current
                ?.startAudio()
                .catch(() =>
                  setError("پخش صدا مجاز نشد؛ تنظیمات مرورگر را بررسی کنید."),
                )
            }
          >
            <Volume2 size={16} /> اجازهٔ پخش صدا
          </button>
          <small className="section-note">
            کیفیت خودکار
            {quality
              ? ` · ${quality === "excellent" ? "اتصال عالی" : quality === "good" ? "اتصال خوب" : "اتصال محدود"}`
              : ""}{" "}
            · پس از دریافت اجازهٔ تازه، قطع و دوباره متصل شوید.
          </small>
        </>
      )}
    </section>
  );
}
