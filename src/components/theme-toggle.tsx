"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

function subscribe(callback: () => void) {
  function syncStorage(event: StorageEvent) {
    if (event.key !== "hamyar-theme" && event.key !== null) return;
    document.documentElement.dataset.theme =
      event.newValue === "light" ? "light" : "dark";
    callback();
  }
  window.addEventListener("hamyar-theme", callback);
  window.addEventListener("storage", syncStorage);
  return () => {
    window.removeEventListener("hamyar-theme", callback);
    window.removeEventListener("storage", syncStorage);
  };
}

function getSnapshot() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "dark");
  const label = theme === "dark" ? "فعال‌کردن تم روشن" : "فعال‌کردن تم تیره";
  return (
    <button
      className="icon-button"
      aria-label={label}
      title={label}
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("hamyar-theme", next);
        } catch {
          /* Theme still works without storage. */
        }
        window.dispatchEvent(new Event("hamyar-theme"));
      }}
    >
      {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
