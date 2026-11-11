import { audius } from "@/api/audius";
import type { Track } from "@/lib/types";
import type { SpotifyTrack } from "./api";
import { bestMatch } from "./match";

export interface ImportResult {
  matched: Track[];
  missing: SpotifyTrack[];
}

async function findTrack(wanted: SpotifyTrack): Promise<Track | null> {
  const artist = wanted.artists[0] ?? "";
  const queries = [`${artist} ${wanted.title}`.trim(), wanted.title];
  for (const q of queries) {
    try {
      const match = bestMatch(wanted, await audius.searchTracks(q, 10));
      if (match) return match;
    } catch {
      // one failed search shouldn't stop the import
    }
  }
  return null;
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
      results[i] = await findTrack(tracks[i]);
      onProgress(++done, tracks.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, tracks.length) }, worker));
  const matched: Track[] = [];
  const missing: SpotifyTrack[] = [];
  const seen = new Set<string>();
  results.forEach((t, i) => {
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      matched.push(t);
    } else if (!t) missing.push(tracks[i]);
  });
  return { matched, missing };
}
