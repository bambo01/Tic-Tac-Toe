export type Player = "X" | "O";
export type Cell = Player | null;

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function getWinner(b: Cell[]): { player: Player; line: number[] } | null {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { player: b[a]!, line };
  }
  return null;
}

function minimax(b: Cell[], turn: Player, ai: Player, depth: number): number {
  const w = getWinner(b);
  if (w) return w.player === ai ? 10 - depth : depth - 10;
  if (b.every(Boolean)) return 0;
  const other: Player = turn === "X" ? "O" : "X";
  let best = turn === ai ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = turn;
    const s = minimax(b, other, ai, depth + 1);
    b[i] = null;
    best = turn === ai ? Math.max(best, s) : Math.min(best, s);
  }
  return best;
}

/** Returns a cell index. `hard` plays perfectly; otherwise ~40% of moves are random. */
export function aiMove(board: Cell[], ai: Player, hard: boolean): number {
  const empty = board.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  if (!hard && Math.random() < 0.4) return empty[Math.floor(Math.random() * empty.length)];
  const human: Player = ai === "X" ? "O" : "X";
  let bestScore = -Infinity;
  let moves: number[] = [];
  for (const i of empty) {
    const b = [...board];
    b[i] = ai;
    const s = minimax(b, human, ai, 1);
    if (s > bestScore) {
      bestScore = s;
      moves = [i];
    } else if (s === bestScore) moves.push(i);
  }
  return moves[Math.floor(Math.random() * moves.length)];
}
