"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";
import { audioLevel } from "@/modules/media/audio-level";

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

/** Never connects to audio output. Raw samples stay in this effect's memory. */
export function useAudioReaction(
  stream: MediaStream | null,
  enabled: boolean,
  root: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const element = root.current;
    if (!stream || !enabled || !element || !window.AudioContext) return;
    let context: AudioContext;
    try {
      context = new AudioContext();
    } catch {
      return;
    }
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let frame = 0;
    let previousTime = 0;
    let level = 0;
    let stopped = false;
    void context.resume().catch(() => {});

    function draw(time: number) {
      if (stopped) return;
      if (!document.hidden && time - previousTime >= 50) {
        previousTime = time;
        analyser.getFloatTimeDomainData(samples);
        const target = audioLevel(samples);
        level += (target - level) * (target > level ? 0.3 : 0.12);
        element!.style.setProperty("--voice-level", level.toFixed(3));
      }
      frame = requestAnimationFrame(draw);
    }
    function visibility() {
      if (document.hidden) {
        element!.style.setProperty("--voice-level", "0");
        void context.suspend().catch(() => {});
      } else void context.resume().catch(() => {});
    }
    document.addEventListener("visibilitychange", visibility);
    frame = requestAnimationFrame(draw);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      source.disconnect();
      analyser.disconnect();
      void context.close().catch(() => {});
      element.style.setProperty("--voice-level", "0");
    };
  }, [stream, enabled, root]);
}
