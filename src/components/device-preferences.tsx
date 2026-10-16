"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { CaptureKind } from "@/modules/media/local-capture";
type Selection = Record<CaptureKind, string>;
const DevicePreferences = createContext<{
  selected: Selection;
  select: (kind: CaptureKind, deviceId: string) => void;
}>({ selected: { audio: "", video: "" }, select: () => {} });

/** Ephemeral tab memory across client navigation; never storage, URLs or server state. */
export function DevicePreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Selection>({ audio: "", video: "" });
  return (
    <DevicePreferences.Provider
      value={{
        selected,
        select: (kind, deviceId) =>
          setSelected((current) => ({ ...current, [kind]: deviceId })),
      }}
    >
      {children}
    </DevicePreferences.Provider>
  );
}
export function useDevicePreferences() {
  return useContext(DevicePreferences);
}
