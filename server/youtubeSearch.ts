/**
 * Server side of YouTube search. Keeps the API key off the phone and caches
 * results, because the free quota is about 100 searches a day.
 */

export interface YouTubeResult {
  videoId: string;
  title: string;
  artist: string;
  artwork?: string;
  duration: number;
}

const CACHE_MS = 12 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; results: YouTubeResult[] }>();

export function clearSearchCache() {
  cache.clear();
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&quot;": '"', "&#39;": "'", "&lt;": "<", "&gt;": ">" };
export const decodeEntities = (s: string) =>
  s.replace(/&(amp|quot|#39|lt|gt);/g, (m) => ENTITIES[m] ?? m).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/** PT3M25S -> 205 */
export function parseIsoDuration(iso: string): number {
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

const NOISE = /\s*[([](official\s*(music\s*)?(video|audio|lyric video|visualizer)|lyrics?|lyric video|audio|hd|hq|4k|visualizer|mv)[)\]]/gi;

/** "Artist - Song (Official Video)" on "ArtistVEVO" -> { artist, title } */
export function splitTitle(rawTitle: string, channel: string): { title: string; artist: string } {
  const title = decodeEntities(rawTitle).replace(NOISE, "").trim();
  const cleanChannel = decodeEntities(channel).replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
  const dash = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash) return { artist: dash[1].trim(), title: dash[2].trim() };
  return { artist: cleanChannel, title };
}

export class SearchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function searchYouTube(query: string, apiKey: string, f: typeof fetch = fetch): Promise<YouTubeResult[]> {
  const key = query.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.results;

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoCategoryId: "10", // Music
    videoEmbeddable: "true",
    maxResults: "15",
    q: query,
    key: apiKey,
  });
  const res = await f(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (res.status === 403) throw new SearchError(429, "Daily YouTube search limit reached. Try again tomorrow.");
  if (!res.ok) throw new SearchError(502, `YouTube error ${res.status}`);
  const body = (await res.json()) as {
    items: { id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails?: Record<string, { url: string }> } }[];
  };
  const items = body.items.filter((i) => i.id?.videoId);
  if (!items.length) return [];

  // durations cost 1 quota unit for all 15 videos
  const details = await f(
    `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ part: "contentDetails", id: items.map((i) => i.id.videoId).join(","), key: apiKey })}`,
  );
  const durations = new Map<string, number>();
  if (details.ok) {
    const d = (await details.json()) as { items: { id: string; contentDetails: { duration: string } }[] };
    for (const v of d.items) durations.set(v.id, parseIsoDuration(v.contentDetails.duration));
  }

  const results = items
    .map((i) => {
      const { title, artist } = splitTitle(i.snippet.title, i.snippet.channelTitle);
      const t = i.snippet.thumbnails ?? {};
      return {
        videoId: i.id.videoId,
        title,
        artist,
        artwork: (t.high ?? t.medium ?? t.default)?.url,
        duration: durations.get(i.id.videoId) ?? 0,
      };
    })
    // skip hour-long mixes and live streams (duration 0)
    .filter((r) => r.duration > 30 && r.duration < 20 * 60);
  cache.set(key, { at: Date.now(), results });
  return results;
}

export async function handleSearchRequest(
  url: URL,
  env: { YOUTUBE_API_KEY?: string },
  f: typeof fetch = fetch,
): Promise<{ status: number; body: unknown }> {
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (!q) return { status: 400, body: { error: "Missing search." } };
  if (!env.YOUTUBE_API_KEY) return { status: 503, body: { error: "YouTube search isn't set up on the server yet." } };
  try {
    return { status: 200, body: { results: await searchYouTube(q, env.YOUTUBE_API_KEY, f) } };
  } catch (err) {
    if (err instanceof SearchError) return { status: err.status, body: { error: err.message } };
    return { status: 502, body: { error: "Couldn't reach YouTube." } };
  }
}
