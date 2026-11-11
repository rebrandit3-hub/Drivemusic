export type RepeatMode = "off" | "all" | "one";

/**
 * Index to move to after the current track. `auto` is true when the track
 * ended on its own (repeat-one replays), false when the user pressed next.
 */
export function nextIndex(
  length: number,
  index: number,
  repeat: RepeatMode,
  auto: boolean,
): number | null {
  if (length === 0) return null;
  if (auto && repeat === "one") return index;
  if (index + 1 < length) return index + 1;
  return repeat === "off" ? null : 0;
}

export function prevIndex(length: number, index: number, repeat: RepeatMode): number {
  if (length === 0) return 0;
  if (index > 0) return index - 1;
  return repeat === "all" ? length - 1 : 0;
}

/** Fisher–Yates on everything but the current item, which moves to the front. */
export function shuffleAround<T>(items: T[], current: number, rand = Math.random): T[] {
  if (items.length < 2) return [...items];
  const head = items[current];
  const rest = items.filter((_, i) => i !== current);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return head === undefined ? rest : [head, ...rest];
}

/** "Previous" restarts the song unless it just started, like every player does. */
export const RESTART_THRESHOLD_S = 3;

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
