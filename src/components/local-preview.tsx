"use client";

import { useEffect, useRef } from "react";
import { AudioLines, VideoOff } from "lucide-react";

export function LocalPreview({
  stream,
  audioActive,
  pending,
}: {
  stream: MediaStream | null;
  audioActive: boolean;
  pending: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.srcObject = stream;
    if (stream) void element.play().catch(() => {});
    return () => {
      element.srcObject = null;
    };
  }, [stream]);

  return (
    <section className={`presenter-panel ${audioActive ? "audio-active" : ""}`}>
      <div className="presenter-preview">
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          aria-label="پیش‌نمایش دوربین شما"
          hidden={!stream}
        />
        {!stream && (
          <>
            <span className="presenter-avatar">ش</span>
            <span>
              <VideoOff size={17} />
              {pending ? "منتظر اجازهٔ مرورگر…" : "دوربین شما خاموش است"}
            </span>
          </>
        )}
        {audioActive && (
          <span className="audio-preview-badge">
            <AudioLines size={15} /> میکروفون روشن
          </span>
        )}
      </div>
      <div className="presenter-caption">
        <strong>پیش‌نمایش شما</strong>
        <span>فقط در این دستگاه</span>
      </div>
    </section>
  );
}
