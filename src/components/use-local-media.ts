"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { emptyCaptureState, LocalCapture } from "@/modules/media/local-capture";

export function useLocalMedia() {
  const [capture] = useState(
    () => new LocalCapture(() => navigator.mediaDevices),
  );
  const state = useSyncExternalStore(
    capture.subscribe,
    capture.getSnapshot,
    () => emptyCaptureState,
  );
  useEffect(() => {
    window.addEventListener("pagehide", capture.stopAll);
    return () => {
      window.removeEventListener("pagehide", capture.stopAll);
      capture.stopAll();
    };
  }, [capture]);
  return { state, capture };
}
