import type { Track } from "@/lib/types";

const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? "").replace(/\/+$/, "");

interface Result {
  videoId: string;
  title: string;
  artist: string;
  artwork?: string;
  duration: number;
}

export class YouTubeUnavailable extends Error {}

export const ytTrack = (r: Result): Track => ({
  id: `yt:${r.videoId}`,
  videoId: r.videoId,
  title: r.title,
  artist: r.artist,
  artwork: r.artwork,
  duration: r.duration,
  source: "youtube",
});

export async function searchYouTube(query: string): Promise<Track[]> {
  const res = await fetch(`${API_BASE}/api/youtube-search?q=${encodeURIComponent(query)}`);
  const body = await res.json().catch(() => ({}));
  if (res.status === 503) throw new YouTubeUnavailable(body.error ?? "YouTube search isn't set up.");
  if (!res.ok) throw new Error(body.error ?? `Search failed (${res.status})`);
  return (body.results as Result[]).map(ytTrack);
}

/** A song we know by name only (from a Spotify import); found on YouTube when first played. */
export function placeholderTrack(title: string, artist: string, durationMs: number): Track {
  const query = `${artist} ${title}`.trim();
  return {
    id: `ytq:${query.toLowerCase()}`,
    title,
    artist,
    duration: Math.round(durationMs / 1000),
    source: "youtube",
    query,
  };
}

/** Turns a placeholder into a playable YouTube track, preferring a close duration. */
export async function resolvePlaceholder(track: Track): Promise<Track | null> {
  if (track.videoId || !track.query) return track.videoId ? track : null;
  const results = await searchYouTube(`${track.query} audio`);
  if (!results.length) return null;
  const close = results.find((r) => !track.duration || Math.abs(r.duration - track.duration) <= 15);
  const pick = close ?? results[0];
  return { ...track, videoId: pick.videoId, artwork: track.artwork ?? pick.artwork, duration: pick.duration || track.duration };
}
