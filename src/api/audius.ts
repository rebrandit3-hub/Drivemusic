import type { Artist, RemotePlaylist, Track } from "@/lib/types";

const APP_NAME = "DriveMusic";
const DISCOVERY = "https://api.audius.co";
const FALLBACK_HOST = "https://discoveryprovider.audius.co";

let hostPromise: Promise<string> | null = null;

/** Audius is served by many discovery nodes; ask the gateway for a healthy one. */
export function getHost(): Promise<string> {
  if (!hostPromise) {
    hostPromise = fetch(DISCOVERY)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((body: { data?: string[] }) => {
        const hosts = body.data ?? [];
        return hosts.length
          ? hosts[Math.floor(Math.random() * hosts.length)]
          : FALLBACK_HOST;
      })
      .catch(() => FALLBACK_HOST);
  }
  return hostPromise;
}

export function resetHost() {
  hostPromise = null;
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const host = await getHost();
  const url = new URL(`${host}/v1${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("app_name", APP_NAME);
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status >= 500) resetHost();
    throw new Error(`Catalog error ${res.status}`);
  }
  const body = (await res.json()) as { data: T };
  return body.data;
}

interface RawTrack {
  id: string;
  title: string;
  duration: number;
  genre?: string;
  artwork?: Record<string, string> | null;
  user: { id: string; name: string };
  is_streamable?: boolean;
}
interface RawUser {
  id: string;
  name: string;
  handle: string;
  follower_count: number;
  track_count: number;
  profile_picture?: Record<string, string> | null;
  cover_photo?: Record<string, string> | null;
}
interface RawPlaylist {
  id: string;
  playlist_name: string;
  track_count?: number;
  artwork?: Record<string, string> | null;
  user: { name: string };
}

export function toTrack(t: RawTrack): Track {
  return {
    id: t.id,
    title: t.title,
    artist: t.user?.name ?? "Unknown artist",
    artistId: t.user?.id,
    artwork: t.artwork?.["480x480"] ?? t.artwork?.["150x150"],
    duration: t.duration ?? 0,
    genre: t.genre,
    source: "audius",
  };
}
function toArtist(u: RawUser): Artist {
  return {
    id: u.id,
    name: u.name,
    handle: u.handle,
    avatar: u.profile_picture?.["480x480"] ?? u.profile_picture?.["150x150"],
    cover: u.cover_photo?.["2000x"] ?? u.cover_photo?.["640x"],
    followers: u.follower_count ?? 0,
    trackCount: u.track_count ?? 0,
  };
}
function toPlaylist(p: RawPlaylist): RemotePlaylist {
  return {
    id: p.id,
    name: p.playlist_name,
    owner: p.user?.name ?? "",
    artwork: p.artwork?.["480x480"] ?? p.artwork?.["150x150"],
    trackCount: p.track_count ?? 0,
  };
}
const streamable = (t: RawTrack) => t.is_streamable !== false;

export const GENRES = [
  "Electronic", "Hip-Hop/Rap", "Pop", "R&B/Soul", "Alternative", "Rock",
  "Lo-Fi", "House", "Afrobeat", "Latin", "Jazz", "Ambient",
] as const;

export const audius = {
  async trending(opts: { genre?: string; time?: "week" | "month" | "allTime"; limit?: number } = {}) {
    const params: Record<string, string> = { time: opts.time ?? "week", limit: String(opts.limit ?? 20) };
    if (opts.genre) params.genre = opts.genre;
    const data = await get<RawTrack[]>("/tracks/trending", params);
    return data.filter(streamable).map(toTrack);
  },
  async searchTracks(query: string, limit = 20) {
    const data = await get<RawTrack[]>("/tracks/search", { query, limit: String(limit) });
    return data.filter(streamable).map(toTrack);
  },
  async searchArtists(query: string, limit = 8) {
    return (await get<RawUser[]>("/users/search", { query, limit: String(limit) })).map(toArtist);
  },
  async searchPlaylists(query: string, limit = 8) {
    return (await get<RawPlaylist[]>("/playlists/search", { query, limit: String(limit) })).map(toPlaylist);
  },
  async trendingPlaylists(limit = 12) {
    return (await get<RawPlaylist[]>("/playlists/trending", { limit: String(limit) })).map(toPlaylist);
  },
  async playlist(id: string) {
    const [meta] = await get<RawPlaylist[]>(`/playlists/${id}`);
    const tracks = await get<RawTrack[]>(`/playlists/${id}/tracks`);
    return { ...toPlaylist(meta), tracks: tracks.filter(streamable).map(toTrack) };
  },
  async artist(id: string) {
    return toArtist(await get<RawUser>(`/users/${id}`));
  },
  async artistTracks(id: string, limit = 30) {
    const data = await get<RawTrack[]>(`/users/${id}/tracks`, { limit: String(limit), sort: "plays" });
    return data.filter(streamable).map(toTrack);
  },
  async streamUrl(trackId: string) {
    const host = await getHost();
    return `${host}/v1/tracks/${trackId}/stream?app_name=${APP_NAME}`;
  },
};
