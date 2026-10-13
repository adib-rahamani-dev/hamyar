"use client";

import { useSyncExternalStore } from "react";
import { Sparkles } from "lucide-react";

function subscribe(callback: () => void) {
  function storage(event: StorageEvent) {
    if (event.key !== "hamyar-effects" && event.key !== null) return;
    document.documentElement.dataset.effects =
      event.newValue === "off" ? "off" : "on";
    callback();
  }
  window.addEventListener("hamyar-effects", callback);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener("hamyar-effects", callback);
    window.removeEventListener("storage", storage);
  };
}
function snapshot() {
  return document.documentElement.dataset.effects !== "off";
}

export function AppearanceToggle() {
  const enabled = useSyncExternalStore(subscribe, snapshot, () => true);
  const label = enabled ? "خاموش‌کردن جلوه‌های پنل" : "روشن‌کردن جلوه‌های پنل";
  return (
    <button
      className="icon-button"
      aria-label={label}
      title={label}
      aria-pressed={enabled}
      onClick={() => {
        const next = enabled ? "off" : "on";
        document.documentElement.dataset.effects = next;
        try {
          localStorage.setItem("hamyar-effects", next);
        } catch {
          /* Remains usable without storage. */
        }
        window.dispatchEvent(new Event("hamyar-effects"));
      }}
    >
      <Sparkles size={18} />
    </button>
  );
}
