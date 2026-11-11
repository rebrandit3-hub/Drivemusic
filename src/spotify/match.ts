import type { Track } from "@/lib/types";
import type { SpotifyTrack } from "./api";

/** lowercase, no accents, no "(feat. …)" / "- Remastered 2011" noise */
export function normalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s*[([].*?(feat|ft\.|with|remaster|radio edit|version|edit|mono|stereo|live|explicit|clean).*?[)\]]/g, " ")
    .replace(/\s+-\s+.*(remaster|version|edit|mix|live|mono|stereo).*$/g, " ")
    .replace(/\b(feat|ft)\.?\s.*$/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string) {
  return new Set(normalize(s).split(" ").filter(Boolean));
}

/** Dice coefficient over word sets: 1 = same words, 0 = nothing shared. */
export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return (2 * shared) / (ta.size + tb.size);
}

export function scoreMatch(wanted: SpotifyTrack, candidate: Track): number {
  const title = similarity(wanted.title, candidate.title);
  const artist = Math.max(
    0,
    ...wanted.artists.map((a) => similarity(a, candidate.artist)),
    // uploaders often put the artist in the title: "Artist - Song"
    ...wanted.artists.map((a) => (normalize(candidate.title).includes(normalize(a)) ? 0.8 : 0)),
  );
  const wantedS = wanted.durationMs / 1000;
  const diff = Math.abs(wantedS - candidate.duration);
  const duration = !candidate.duration || !wantedS ? 0.5 : diff <= 3 ? 1 : diff <= 15 ? 0.6 : diff <= 45 ? 0.2 : 0;
  return title * 0.6 + artist * 0.3 + duration * 0.1;
}

export const MATCH_THRESHOLD = 0.62;

export function bestMatch(wanted: SpotifyTrack, candidates: Track[]): Track | null {
  let best: Track | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const score = scoreMatch(wanted, c);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}
