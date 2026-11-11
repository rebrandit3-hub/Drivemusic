import { extractPlaylistId, handlePlaylistRequest, resetTokenCache } from "./spotifyPlaylist";

const ID = "3cEYpjA9oz9GiPac4AsH4n";
const env = { SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const item = (name: string, artist: string) => ({ track: { type: "track", name, duration_ms: 200000, artists: [{ name: artist }] } });

beforeEach(() => resetTokenCache());

it.each([
  [`https://open.spotify.com/playlist/${ID}?si=x1`, ID],
  [`https://open.spotify.com/intl-fr/playlist/${ID}`, ID],
  [`https://open.spotify.com/embed/playlist/${ID}`, ID],
  [`spotify:playlist:${ID}`, ID],
  ["https://open.spotify.com/album/1A2GTWGtFfWp7KSQTwWOyo", null],
])("extracts the id from %s", (input, id) => {
  expect(extractPlaylistId(input)).toBe(id);
});

it("reads every page of a public playlist with app credentials", async () => {
  const calls: string[] = [];
  const f = vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("accounts.spotify.com")) return json({ access_token: "tok", expires_in: 3600 });
    if (u.includes("page2")) return json({ items: [item("Song C", "C")], next: null });
    return json({
      id: ID, name: "Road Trip", images: [{ url: "https://i/cover" }], owner: { display_name: "sam" },
      tracks: { items: [item("Song A", "A"), { track: null }, { track: { type: "episode", name: "Pod" } }, item("Song B", "B")], next: "https://api.spotify.com/page2" },
    });
  }) as unknown as typeof fetch;

  const res = await handlePlaylistRequest(new URL(`http://x/api?link=${encodeURIComponent(`https://open.spotify.com/playlist/${ID}?si=abc`)}`), env, f);
  expect(res.status).toBe(200);
  const body = res.body as { name: string; tracks: { title: string }[] };
  expect(body.name).toBe("Road Trip");
  expect(body.tracks.map((t) => t.title)).toEqual(["Song A", "Song B", "Song C"]);
  expect(calls.filter((c) => c.includes("accounts.spotify.com"))).toHaveLength(1);
});

it("follows spotify.link share links", async () => {
  const f = vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.startsWith("https://spotify.link/")) {
      const r = new Response("<html></html>");
      Object.defineProperty(r, "url", { value: `https://open.spotify.com/playlist/${ID}?si=1` });
      return r;
    }
    if (u.includes("accounts.spotify.com")) return json({ access_token: "tok", expires_in: 3600 });
    return json({ id: ID, name: "Short", tracks: { items: [item("X", "Y")], next: null } });
  }) as unknown as typeof fetch;
  const res = await handlePlaylistRequest(new URL("http://x/api?link=https://spotify.link/AbCdEf"), env, f);
  expect((res.body as { name: string }).name).toBe("Short");
});

it("explains private or Spotify-made playlists", async () => {
  const f = vi.fn(async (url: string | URL | Request) =>
    String(url).includes("accounts") ? json({ access_token: "t", expires_in: 3600 }) : json({}, 404),
  ) as unknown as typeof fetch;
  const res = await handlePlaylistRequest(new URL(`http://x/api?link=${ID}`), env, f);
  expect(res.status).toBe(404);
  expect((res.body as { error: string }).error).toMatch(/public/);
});

it("rejects non-playlist links and missing server setup", async () => {
  expect((await handlePlaylistRequest(new URL("http://x/api?link=hello"), env)).status).toBe(400);
  expect((await handlePlaylistRequest(new URL(`http://x/api?link=${ID}`), {})).status).toBe(503);
});
