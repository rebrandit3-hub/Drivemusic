import { clearSearchCache, handleSearchRequest, parseIsoDuration, splitTitle } from "./youtubeSearch";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => clearSearchCache());

it("parses ISO 8601 durations", () => {
  expect(parseIsoDuration("PT3M25S")).toBe(205);
  expect(parseIsoDuration("PT1H2M")).toBe(3720);
  expect(parseIsoDuration("P0D")).toBe(0);
});

it.each([
  ["The Weeknd - Blinding Lights (Official Video)", "TheWeekndVEVO", "The Weeknd", "Blinding Lights"],
  ["Blinding Lights", "The Weeknd - Topic", "The Weeknd", "Blinding Lights"],
  ["Rock &amp; Roll [Lyrics]", "Band", "Band", "Rock & Roll"],
])("splits %s", (title, channel, artist, song) => {
  expect(splitTitle(title, channel)).toEqual({ artist, title: song });
});

it("searches music videos, adds durations, drops mixes, and caches", async () => {
  const f = vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes("/search?")) {
      expect(u).toContain("videoCategoryId=10");
      expect(u).toContain("videoEmbeddable=true");
      return json({
        items: [
          { id: { videoId: "a1" }, snippet: { title: "Artist - Song", channelTitle: "ArtistVEVO", thumbnails: { high: { url: "https://i/a1" } } } },
          { id: { videoId: "m1" }, snippet: { title: "3 hour mix", channelTitle: "Mixes" } },
        ],
      });
    }
    return json({ items: [{ id: "a1", contentDetails: { duration: "PT3M10S" } }, { id: "m1", contentDetails: { duration: "PT3H" } }] });
  }) as unknown as typeof fetch;

  const run = () => handleSearchRequest(new URL("http://x/api?q=song"), { YOUTUBE_API_KEY: "k" }, f);
  const res = await run();
  expect(res.status).toBe(200);
  expect((res.body as { results: unknown[] }).results).toEqual([
    { videoId: "a1", title: "Song", artist: "Artist", artwork: "https://i/a1", duration: 190 },
  ]);
  await run();
  expect(f).toHaveBeenCalledTimes(2); // second search came from cache
});

it("reports a spent quota and a missing key", async () => {
  const f = vi.fn(async () => json({}, 403)) as unknown as typeof fetch;
  const res = await handleSearchRequest(new URL("http://x/api?q=a"), { YOUTUBE_API_KEY: "k" }, f);
  expect(res.status).toBe(429);
  expect((await handleSearchRequest(new URL("http://x/api?q=a"), {})).status).toBe(503);
});
