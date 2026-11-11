/**
 * Server side of "paste a Spotify link": reads a public playlist with the
 * app's own credentials (client credentials flow), so users never sign in
 * or set anything up. The secret never reaches the phone.
 */

export interface PlaylistPayload {
  id: string;
  name: string;
  owner?: string;
  image?: string;
  tracks: { title: string; artists: string[]; durationMs: number }[];
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const ID_RE = /^[A-Za-z0-9]{22}$/;
const MAX_TRACKS = 2000;

export function extractPlaylistId(input: string): string | null {
  const s = input.trim();
  const uri = s.match(/^spotify:(?:user:[^:]+:)?playlist:([A-Za-z0-9]{22})$/);
  if (uri) return uri[1];
  const url = s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(?:user\/[^/]+\/)?playlist\/([A-Za-z0-9]{22})/);
  if (url) return url[1];
  return ID_RE.test(s) ? s : null;
}

/** spotify.link / spoti.fi share links redirect to the real playlist URL. */
export async function resolveShortLink(url: string, f: typeof fetch = fetch): Promise<string | null> {
  if (!/^https:\/\/(spotify\.link|spoti\.fi|spotify\.app\.link)\//.test(url)) return null;
  const res = await f(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
  const direct = extractPlaylistId(res.url);
  if (direct) return direct;
  // some short links land on an interstitial page that links onward
  const body = await res.text();
  const found = body.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?playlist\/([A-Za-z0-9]{22})/);
  return found ? found[1] : null;
}

let cached: { token: string; expiresAt: number } | null = null;

export async function appToken(clientId: string, clientSecret: string, f: typeof fetch = fetch): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.token;
  const res = await f("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new HttpError(502, "Spotify rejected the server credentials.");
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in - 60) * 1000 };
  return cached.token;
}

export function resetTokenCache() {
  cached = null;
}

interface RawItem {
  track: { type?: string; name?: string; duration_ms?: number; artists?: { name: string }[] } | null;
}

export async function fetchPlaylist(
  id: string,
  creds: { clientId: string; clientSecret: string },
  f: typeof fetch = fetch,
): Promise<PlaylistPayload> {
  const token = await appToken(creds.clientId, creds.clientSecret, f);
  const get = async <T>(url: string): Promise<T> => {
    const res = await f(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404 || res.status === 403) {
      throw new HttpError(404, "Can't open this playlist. Make sure it's public (Spotify-made mixes can't be imported).");
    }
    if (res.status === 429) throw new HttpError(429, "Spotify is busy. Try again in a minute.");
    if (!res.ok) throw new HttpError(502, `Spotify error ${res.status}`);
    return res.json() as Promise<T>;
  };

  const meta = await get<{
    id: string;
    name: string;
    images?: { url: string }[] | null;
    owner?: { display_name?: string };
    tracks: { items: RawItem[]; next: string | null };
  }>(
    `https://api.spotify.com/v1/playlists/${id}?fields=id,name,images,owner(display_name),tracks(next,items(track(type,name,duration_ms,artists(name))))`,
  );

  const tracks: PlaylistPayload["tracks"] = [];
  const take = (items: RawItem[]) => {
    for (const { track } of items) {
      if (track && track.type === "track" && track.name) {
        tracks.push({
          title: track.name,
          artists: (track.artists ?? []).map((a) => a.name).filter(Boolean),
          durationMs: track.duration_ms ?? 0,
        });
      }
    }
  };
  take(meta.tracks.items);
  let next = meta.tracks.next;
  while (next && tracks.length < MAX_TRACKS) {
    const page = await get<{ items: RawItem[]; next: string | null }>(next);
    take(page.items);
    next = page.next;
  }
  return { id: meta.id, name: meta.name, owner: meta.owner?.display_name, image: meta.images?.[0]?.url, tracks };
}

/** Shared request handler used by the hosting function and the dev server. */
export async function handlePlaylistRequest(
  url: URL,
  env: { SPOTIFY_CLIENT_ID?: string; SPOTIFY_CLIENT_SECRET?: string },
  f: typeof fetch = fetch,
): Promise<{ status: number; body: unknown }> {
  try {
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
      throw new HttpError(503, "Spotify import isn't set up on the server yet.");
    }
    const link = url.searchParams.get("link") ?? "";
    const id = extractPlaylistId(link) ?? (await resolveShortLink(link.trim(), f));
    if (!id) throw new HttpError(400, "That doesn't look like a Spotify playlist link.");
    const playlist = await fetchPlaylist(id, { clientId: env.SPOTIFY_CLIENT_ID, clientSecret: env.SPOTIFY_CLIENT_SECRET }, f);
    return { status: 200, body: playlist };
  } catch (err) {
    if (err instanceof HttpError) return { status: err.status, body: { error: err.message } };
    return { status: 502, body: { error: "Couldn't reach Spotify. Try again." } };
  }
}
