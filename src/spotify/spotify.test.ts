import type { Track } from "@/lib/types";
import { findSpotifyLink } from "./api";
import { bestMatch, normalize, similarity } from "./match";


describe("findSpotifyLink", () => {
  const ID = "37i9dQZF1DXcBWIGoYBM5M";
  it.each([
    [`https://open.spotify.com/playlist/${ID}?si=abc123`, `https://open.spotify.com/playlist/${ID}?si=abc123`],
    [`Check this out! https://open.spotify.com/playlist/${ID}?si=a.`, `https://open.spotify.com/playlist/${ID}?si=a`],
    ["https://spotify.link/Xy12Ab", "https://spotify.link/Xy12Ab"],
    [`spotify:playlist:${ID}`, `spotify:playlist:${ID}`],
    ["https://open.spotify.com/album/1A2GTWGtFfWp7KSQTwWOyo", null],
    ["hello", null],
  ])("%s", (input, expected) => {
    expect(findSpotifyLink(input)).toBe(expected);
  });
});

describe("matching", () => {
  const track = (title: string, artist: string, duration = 200): Track => ({
    id: `${title}-${artist}`, title, artist, duration, source: "audius",
  });

  it("strips featuring, remaster and punctuation noise", () => {
    expect(normalize("Blinding Lights (feat. Someone) - 2020 Remaster")).toBe("blinding lights");
    expect(normalize("Café Del Mar")).toBe("cafe del mar");
  });

  it("scores word overlap", () => {
    expect(similarity("Ocean Eyes", "ocean eyes")).toBe(1);
    expect(similarity("Ocean Eyes", "Fire Walk")).toBe(0);
  });

  it("picks the right song and rejects lookalikes", () => {
    const wanted = { title: "Midnight City", artists: ["M83"], durationMs: 243000 };
    const right = track("Midnight City", "M83", 244);
    const wrong = track("Midnight Drive", "Someone Else", 180);
    expect(bestMatch(wanted, [wrong, right])).toBe(right);
    expect(bestMatch(wanted, [wrong])).toBeNull();
  });

  it("accepts uploads named 'Artist - Song'", () => {
    const wanted = { title: "Midnight City", artists: ["M83"], durationMs: 243000 };
    const upload = track("M83 - Midnight City", "random uploader", 243);
    expect(bestMatch(wanted, [upload])).toBe(upload);
  });
});
