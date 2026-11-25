/**
 * Procedural sound: every effect and the background loop are synthesised with
 * the Web Audio API, so there are no audio files to load.
 */

type Prefs = { sfx: boolean; music: boolean };

const SERVER_PREFS: Prefs = { sfx: true, music: true };
let prefs: Prefs = SERVER_PREFS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    prefs = {
      sfx: localStorage.getItem("sound-sfx") !== "0",
      music: localStorage.getItem("sound-music") !== "0",
    };
  } catch {}
}

export const soundStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  getSnapshot(): Prefs {
    load();
    return prefs;
  },
  getServerSnapshot(): Prefs {
    return SERVER_PREFS;
  },
};

function setPrefs(next: Prefs) {
  prefs = next;
  try {
    localStorage.setItem("sound-sfx", next.sfx ? "1" : "0");
    localStorage.setItem("sound-music", next.music ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}

/* ---------- audio graph ---------- */

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  dest: GainNode | null,
  freq: number,
  when: number,
  dur: number,
  type: OscillatorType = "square",
  vol = 0.2,
  slideTo?: number,
) {
  const c = ctx;
  if (!c || !dest) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, when + dur);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vol, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g).connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function sfx(fn: (t: number) => void) {
  if (!prefs.sfx) return;
  const c = audio();
  if (c) fn(c.currentTime);
}

export const sound = {
  /** Browsers block audio until a gesture; call this from one. */
  unlock() {
    audio();
    if (prefs.music) startMusic();
  },
  click: () => sfx((t) => tone(sfxGain, 820, t, 0.07, "triangle", 0.25, 560)),
  place: (who: "X" | "O") =>
    sfx((t) => {
      if (who === "X") {
        tone(sfxGain, 392, t, 0.09, "square", 0.18);
        tone(sfxGain, 294, t + 0.07, 0.12, "square", 0.18);
      } else {
        tone(sfxGain, 523, t, 0.16, "sine", 0.35, 784);
      }
    }),
  win: () =>
    sfx((t) => {
      [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => tone(sfxGain, midi(n), t + i * 0.11, 0.2, "square", 0.16));
      tone(sfxGain, midi(91), t + 0.8, 0.5, "triangle", 0.25);
    }),
  lose: () =>
    sfx((t) => {
      [67, 64, 60, 55].forEach((n, i) => tone(sfxGain, midi(n), t + i * 0.18, 0.28, "sawtooth", 0.13));
    }),
  draw: () =>
    sfx((t) => {
      tone(sfxGain, midi(64), t, 0.18, "triangle", 0.25);
      tone(sfxGain, midi(64), t + 0.2, 0.3, "triangle", 0.25);
    }),
  toggleSfx() {
    const on = !prefs.sfx;
    setPrefs({ ...prefs, sfx: on });
    if (on) sound.click();
  },
  toggleMusic() {
    const on = !prefs.music;
    setPrefs({ ...prefs, music: on });
    if (on) {
      audio();
      startMusic();
    } else stopMusic();
  },
};

/* ---------- background loop ---------- */

const STEP = 0.24; // seconds per eighth note
// C, Am, F, G — arpeggio root notes (MIDI) with bass
const PROGRESSION = [
  { bass: 48, arp: [60, 64, 67, 72] },
  { bass: 45, arp: [57, 60, 64, 69] },
  { bass: 41, arp: [53, 57, 60, 65] },
  { bass: 43, arp: [55, 59, 62, 67] },
];

let timer: ReturnType<typeof setInterval> | null = null;
let nextTime = 0;
let step = 0;

function schedule() {
  const c = ctx;
  if (!c) return;
  while (nextTime < c.currentTime + 0.4) {
    const bar = Math.floor(step / 8) % PROGRESSION.length;
    const i = step % 8;
    const { bass, arp } = PROGRESSION[bar];
    if (i % 4 === 0) tone(musicGain, midi(bass), nextTime, STEP * 3.6, "triangle", 0.22);
    const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
    tone(musicGain, midi(arp[pattern[i]] + 12), nextTime, STEP * 0.9, "square", 0.05);
    nextTime += STEP;
    step++;
  }
}

function startMusic() {
  const c = audio();
  if (!c || timer) return;
  nextTime = c.currentTime + 0.1;
  schedule();
  timer = setInterval(schedule, 120);
}

function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
}

if (typeof document !== "undefined") {
  // Don't play in background tabs.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopMusic();
    else if (prefs.music && ctx && ctx.state === "running") startMusic();
  });
}
