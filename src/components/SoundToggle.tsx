"use client";

import { useSyncExternalStore } from "react";
import { sound, soundStore } from "@/lib-sound";

function IconButton({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      data-silent
      className={`gbtn grid h-11 w-11 place-items-center rounded-full! ${on ? "gbtn-blue" : "gbtn-off"}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="relative z-10 h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
        {!on && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}

export default function SoundToggle() {
  const prefs = useSyncExternalStore(soundStore.subscribe, soundStore.getSnapshot, soundStore.getServerSnapshot);
  return (
    <>
      <IconButton on={prefs.music} label={prefs.music ? "Turn music off" : "Turn music on"} onClick={sound.toggleMusic}>
        <path d="M9 18V5l11-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="17" cy="16" r="3" />
      </IconButton>
      <IconButton on={prefs.sfx} label={prefs.sfx ? "Mute sound effects" : "Unmute sound effects"} onClick={sound.toggleSfx}>
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
      </IconButton>
    </>
  );
}
