export interface SpotifyTrack {
  title: string;
  artists: string[];
  durationMs: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  owner?: string;
  image?: string;
  tracks: SpotifyTrack[];
}

/** Where the import endpoint lives: same site by default, set for native builds. */
const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? "").replace(/\/+$/, "");

/** Quick check before calling the server: any Spotify playlist or share link. */
export function looksLikeSpotifyLink(input: string): boolean {
  const s = input.trim();
  return (
    /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(?:user\/[^/]+\/)?playlist\/[A-Za-z0-9]{22}/.test(s) ||
    /^spotify:(?:user:[^:]+:)?playlist:[A-Za-z0-9]{22}$/.test(s) ||
    /^https:\/\/(spotify\.link|spoti\.fi|spotify\.app\.link)\/\S+$/.test(s)
  );
}

/** Pull the first Spotify link out of whatever was pasted ("Check out this playlist https://…"). */
export function findSpotifyLink(text: string): string | null {
  const match = text.match(/(https:\/\/(?:open\.spotify\.com|spotify\.link|spoti\.fi|spotify\.app\.link)\/\S+|spotify:(?:user:[^:\s]+:)?playlist:[A-Za-z0-9]{22})/);
  const link = match?.[1].replace(/[)\].,;!?"']+$/, "") ?? null;
  return link && looksLikeSpotifyLink(link) ? link : null;
}

export async function fetchSpotifyPlaylist(link: string, signal?: AbortSignal): Promise<SpotifyPlaylist> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/spotify-playlist?link=${encodeURIComponent(link)}`, { signal });
  } catch {
    throw new Error("No connection. Check your internet and try again.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Import failed (${res.status}).`);
  return body as SpotifyPlaylist;
}
