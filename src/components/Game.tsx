"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { aiMove, getWinner, type Cell, type Player } from "@/lib-game";
import { sound } from "@/lib-sound";
import SoundToggle from "./SoundToggle";
import ThemeToggle from "./ThemeToggle";

type Mode = "friend" | "easy" | "hard";
type Screen = "menu" | "level" | "game";

const CONFETTI = ["#ffc61a", "#e8264f", "#2f7bff", "#3fe07a", "#ff8a3d"];

/* Shared gradients for the X / O marks. */
function MarkDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="0" y1="6" x2="0" y2="34">
          <stop offset="0" stopColor="#ffe45c" />
          <stop offset="1" stopColor="#ff9f0a" />
        </linearGradient>
        <linearGradient id="red" gradientUnits="userSpaceOnUse" x1="0" y1="6" x2="0" y2="34">
          <stop offset="0" stopColor="#ff4d6d" />
          <stop offset="1" stopColor="#c8102e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Mark({ player, className = "h-3/4 w-3/4" }: { player: Player; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={`mark ${className}`} fill="none" strokeLinecap="round">
      {player === "X" ? (
        <g stroke="url(#red)" strokeWidth="8.5">
          <path className="draw" pathLength="100" d="M8 8 L32 32" />
          <path className="draw draw-delay" pathLength="100" d="M32 8 L8 32" />
        </g>
      ) : (
        <circle
          className="draw"
          pathLength="100"
          cx="20"
          cy="20"
          r="12"
          stroke="url(#gold)"
          strokeWidth="9"
          transform="rotate(-90 20 20)"
        />
      )}
    </svg>
  );
}

function Title() {
  const rows: [string, string][] = [
    ["TIC", "l-yellow l-yellow l-yellow"],
    ["TAC", "l-red l-red l-red"],
    ["TOE", "l-yellow l-red l-yellow"],
  ];
  return (
    <h1 className="flex flex-col items-center" aria-label="Tic Tac Toe">
      {rows.map(([word, colors], r) => (
        <div
          key={word}
          className="logo-in flex"
          style={{ animationDelay: `${r * 0.12}s` }}
          aria-hidden="true"
        >
          {word.split("").map((ch, i) => (
            <span key={i} className={`logo-letter text-[5.5rem] sm:text-[6.5rem] ${colors.split(" ")[i]}`}>
              {ch}
            </span>
          ))}
        </div>
      ))}
    </h1>
  );
}

function Confetti() {
  // Deterministic layout keeps render pure.
  return (
    <>
      {Array.from({ length: 40 }, (_, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${(i * 29) % 100}%`,
            background: CONFETTI[i % CONFETTI.length],
            animationDuration: `${2.2 + ((i * 7) % 10) / 6}s`,
            animationDelay: `${0.5 + ((i * 13) % 10) / 12}s`,
          }}
        />
      ))}
    </>
  );
}

const emptyBoard = (): Cell[] => Array(9).fill(null);

export default function Game() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<Mode>("hard");
  const [board, setBoard] = useState<Cell[]>(emptyBoard);
  const [turn, setTurn] = useState<Player>("X");
  const [score, setScore] = useState({ X: 0, O: 0, draw: 0 });
  const scored = useRef(false);

  const result = getWinner(board);
  const full = board.every(Boolean);
  const over = !!result || full;
  const cpuTurn = mode !== "friend" && turn === "O";
  const youWon = !!result && (mode === "friend" || result.player === "X");

  // Unlock audio on the first gesture, and click-sound every UI button
  // (board cells and the sound toggles make their own sounds).
  useEffect(() => {
    const onDown = () => sound.unlock();
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest("button");
      if (btn && !btn.disabled && !btn.hasAttribute("data-cell") && !btn.hasAttribute("data-silent")) sound.click();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const play = useCallback((i: number, who: Player) => {
    sound.place(who);
    setBoard((b) => {
      if (b[i]) return b;
      const n = [...b];
      n[i] = who;
      return n;
    });
    setTurn(who === "X" ? "O" : "X");
  }, []);

  // Tally the score once per finished round.
  useEffect(() => {
    if (!over || scored.current) return;
    scored.current = true;
    if (!result) sound.draw();
    else if (mode === "friend" || result.player === "X") sound.win();
    else sound.lose();
    setScore((s) => (result ? { ...s, [result.player]: s[result.player] + 1 } : { ...s, draw: s.draw + 1 }));
  }, [over, result, mode]);

  // CPU plays "O" after a short thinking delay.
  useEffect(() => {
    if (screen !== "game" || !cpuTurn || over) return;
    const t = setTimeout(() => play(aiMove(board, "O", mode === "hard"), "O"), 650);
    return () => clearTimeout(t);
  }, [screen, cpuTurn, over, board, mode, play]);

  const newRound = () => {
    scored.current = false;
    setBoard(emptyBoard());
    setTurn("X");
  };
  const start = (m: Mode) => {
    setMode(m);
    setScore({ X: 0, O: 0, draw: 0 });
    newRound();
    setScreen("game");
  };

  const headline = result
    ? mode === "friend" ? `Player ${result.player === "X" ? 1 : 2} Wins!` : result.player === "X" ? "You Win!" : "CPU Wins!"
    : "It's a Draw!";

  const players = [
    { id: "X" as Player, name: "Player 1", emoji: "🥷", bg: "#c9b8ff", n: score.X },
    {
      id: "O" as Player,
      name: mode === "friend" ? "Player 2" : "CPU",
      emoji: mode === "friend" ? "🧑‍💻" : "🤖",
      bg: "#9fe6ff",
      n: score.O,
    },
  ];

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-5">
      <MarkDefs />
      <a
        href="https://marklaurencepangan.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="credit fixed bottom-3 right-3 z-30 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
      >
        Made by Mark Laurence Pangan
        <span aria-hidden="true">↗</span>
      </a>
      {youWon && <Confetti key={score.X + score.O} />}

      <header className="flex h-11 items-center justify-between">
        {screen !== "menu" ? (
          <button
            onClick={() => setScreen("menu")}
            aria-label="Back to menu"
            className="gbtn gbtn-blue grid h-11 w-11 place-items-center rounded-full! text-xl"
          >
            <span className="relative z-10">←</span>
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <SoundToggle />
          <ThemeToggle />
        </div>
      </header>

      {screen === "menu" && (
        <section className="flex flex-1 flex-col items-center justify-between gap-10 py-6">
          <div className="flex flex-1 items-center">
            <Title />
          </div>
          <div className="rise flex w-full max-w-xs flex-col gap-4 pb-6">
            <button onClick={() => setScreen("level")} className="gbtn gbtn-blue py-4 text-2xl">
              <span className="relative z-10">Single Player</span>
            </button>
            <button onClick={() => start("friend")} className="gbtn gbtn-orange py-4 text-2xl">
              <span className="relative z-10">Multiplayer</span>
            </button>
          </div>
        </section>
      )}

      {screen === "level" && (
        <section className="flex flex-1 flex-col items-center justify-center gap-8 py-6">
          <h2 className="font-display pop text-4xl tracking-wide drop-shadow-[0_3px_0_rgba(0,0,0,0.3)]">Choose Level</h2>
          <div className="rise flex w-full max-w-xs flex-col gap-4">
            <button onClick={() => start("easy")} className="gbtn gbtn-green py-4 text-2xl">
              <span className="relative z-10">Easy 😊</span>
            </button>
            <button onClick={() => start("hard")} className="gbtn gbtn-orange py-4 text-2xl">
              <span className="relative z-10">Hard 😈</span>
            </button>
          </div>
        </section>
      )}

      {screen === "game" && (
        <section className="rise flex flex-1 flex-col items-center justify-center gap-7 py-4">
          {/* Player cards */}
          <div className="grid w-full grid-cols-2 gap-4 px-2">
            {players.map((p) => {
              const active = !over && turn === p.id;
              return (
                <div key={p.id} className={`pcard relative px-3 pb-5 pt-4 text-center ${active ? "pcard-active" : "opacity-80"}`}>
                  <div
                    className={`mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-white/80 text-3xl ${active ? "bob" : ""}`}
                    style={{ background: p.bg }}
                  >
                    {p.emoji}
                  </div>
                  <div className="font-display mt-2 text-lg leading-none">{p.name}</div>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Mark player={p.id} className="h-9 w-9" />
                    <span key={p.n} className="pop font-display text-2xl">
                      {p.n}
                    </span>
                  </div>
                  {active && (
                    <span className="pop font-display absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/80 bg-gradient-to-b from-[#3fe07a] to-[#12a64a] px-3 py-0.5 text-xs text-white shadow">
                      {cpuTurn ? "Thinking…" : "Your Turn"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Board */}
          <div className="board-panel w-full max-w-sm">
            <div className="grid grid-cols-3 gap-2.5">
              {board.map((cell, i) => {
                const winning = !!result?.line.includes(i);
                return (
                  <button
                    key={i}
                    data-cell
                    disabled={!!cell || over || cpuTurn}
                    onClick={() => play(i, turn)}
                    aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ""}`}
                    className={`board-cell grid aspect-square place-items-center enabled:cursor-pointer ${
                      winning ? "win-cell glow" : ""
                    } ${over && !winning ? "opacity-60" : ""}`}
                  >
                    {cell && <Mark player={cell} />}
                  </button>
                );
              })}
            </div>
          </div>

          {draws(score.draw)}
        </section>
      )}

      {/* Round result */}
      {screen === "game" && over && (
        <div className="overlay fixed inset-0 z-40 grid place-items-center bg-black/55 px-6 backdrop-blur-sm">
          <div className="pop flex w-full max-w-xs flex-col items-center gap-5 rounded-3xl border-[3px] border-white bg-gradient-to-b from-[#4a3aff] to-[#1b1f8f] p-7 text-white shadow-2xl">
            <div className="flex h-16 items-center">
              {result ? <Mark player={result.player} className="h-16 w-16" /> : <span className="text-5xl">🤝</span>}
            </div>
            <h2 className="font-display text-4xl tracking-wide drop-shadow-[0_3px_0_rgba(0,0,0,0.35)]">{headline}</h2>
            <div className="flex w-full flex-col gap-3">
              <button onClick={newRound} className="gbtn gbtn-green py-3 text-xl">
                <span className="relative z-10">Play Again</span>
              </button>
              <button onClick={() => setScreen("menu")} className="gbtn gbtn-orange py-3 text-xl">
                <span className="relative z-10">Menu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function draws(n: number) {
  return (
    <p className="text-sm font-medium text-muted">
      Draws: <span key={n} className="pop inline-block font-bold text-fg">{n}</span>
    </p>
  );
}
