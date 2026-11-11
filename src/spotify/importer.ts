import { audius } from "@/api/audius";
import { placeholderTrack } from "@/api/youtube";
import type { Track } from "@/lib/types";
import type { SpotifyTrack } from "./api";
import { scoreMatch } from "./match";

export interface ImportResult {
  /** every song, in playlist order */
  tracks: Track[];
  /** found in the open catalog (downloadable) */
  catalog: number;
  /** will play from YouTube */
  youtube: number;
}

/** a catalog hit must be this sure, or we'd add a cover version instead of the song */
export const CATALOG_THRESHOLD = 0.8;

async function findInCatalog(wanted: SpotifyTrack): Promise<Track | null> {
  const artist = wanted.artists[0] ?? "";
  try {
    const candidates = await audius.searchTracks(`${artist} ${wanted.title}`.trim(), 10);
    let best: Track | null = null;
    let bestScore = 0;
    for (const c of candidates) {
      const score = scoreMatch(wanted, c);
      if (score > bestScore) [best, bestScore] = [c, score];
    }
    return bestScore >= CATALOG_THRESHOLD ? best : null;
  } catch {
    return null;
  }
}

/** Looks every song up in the catalog, a few at a time, keeping playlist order. */
export async function matchTracks(
  tracks: SpotifyTrack[],
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
  concurrency = 4,
): Promise<ImportResult> {
  const results: (Track | null)[] = new Array(tracks.length).fill(null);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < tracks.length && !signal?.aborted) {
      const i = next++;
      results[i] = await findInCatalog(tracks[i]);
      onProgress(++done, tracks.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, tracks.length) }, worker));
  const out: Track[] = [];
  const seen = new Set<string>();
  let catalog = 0;
  results.forEach((hit, i) => {
    // songs the catalog doesn't have are looked up on YouTube when first played
    const track = hit ?? placeholderTrack(tracks[i].title, tracks[i].artists.join(", "), tracks[i].durationMs);
    if (seen.has(track.id)) return;
    seen.add(track.id);
    if (hit) catalog++;
    out.push(track);
  });
  return { tracks: out, catalog, youtube: out.length - catalog };
}
