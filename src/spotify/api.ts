import { accessToken } from "./auth";

export interface SpotifyTrack {
  title: string;
  artists: string[];
  durationMs: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  image?: string;
  total: number;
  owner?: string;
}

/** Accepts playlist links, spotify: URIs and bare ids. */
export function parsePlaylistId(input: string): string | null {
  const s = input.trim();
  const uri = s.match(/^spotify:(?:user:[^:]+:)?playlist:([A-Za-z0-9]{22})$/);
  if (uri) return uri[1];
  const url = s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:user\/[^/]+\/)?playlist\/([A-Za-z0-9]{22})/);
  if (url) return url[1];
  return /^[A-Za-z0-9]{22}$/.test(s) ? s : null;
}

export class SpotifyAuthError extends Error {}

async function api<T>(path: string): Promise<T> {
  const token = await accessToken();
  if (!token) throw new SpotifyAuthError("Connect Spotify to import playlists.");
  const res = await fetch(path.startsWith("http") ? path : `https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new SpotifyAuthError("Spotify session expired. Connect again.");
  if (res.status === 404) throw new Error("Playlist not found, or it's private.");
  if (!res.ok) throw new Error(`Spotify error ${res.status}`);
  return res.json() as Promise<T>;
}

interface RawPlaylist {
  id: string;
  name: string;
  images?: { url: string }[] | null;
  owner?: { display_name?: string };
  tracks: { total: number };
}

export async function myPlaylists(): Promise<SpotifyPlaylist[]> {
  const out: SpotifyPlaylist[] = [];
  let url: string | null = "/me/playlists?limit=50";
  while (url && out.length < 200) {
    const page: { items: (RawPlaylist | null)[]; next: string | null } = await api(url);
    for (const p of page.items) {
      if (p) out.push({ id: p.id, name: p.name, image: p.images?.[0]?.url, total: p.tracks.total, owner: p.owner?.display_name });
    }
    url = page.next;
  }
  return out;
}

export async function playlistWithTracks(id: string): Promise<SpotifyPlaylist & { tracks: SpotifyTrack[] }> {
  const meta = await api<RawPlaylist>(`/playlists/${id}?fields=id,name,images,owner(display_name),tracks(total)`);
  const tracks: SpotifyTrack[] = [];
  let url: string | null =
    `/playlists/${id}/tracks?limit=100&fields=next,items(track(type,name,duration_ms,is_local,artists(name)))`;
  while (url) {
    const page: {
      next: string | null;
      items: { track: { type: string; name: string; duration_ms: number; artists: { name: string }[] } | null }[];
    } = await api(url);
    for (const item of page.items) {
      const t = item.track;
      if (t && t.type === "track" && t.name) {
        tracks.push({ title: t.name, artists: t.artists.map((a) => a.name), durationMs: t.duration_ms });
      }
    }
    url = page.next;
  }
  return {
    id: meta.id,
    name: meta.name,
    image: meta.images?.[0]?.url,
    total: meta.tracks.total,
    owner: meta.owner?.display_name,
    tracks,
  };
}
