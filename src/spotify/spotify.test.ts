import { createHash } from "node:crypto";
import type { Track } from "@/lib/types";
import { parsePlaylistId } from "./api";
import { pkceChallenge } from "./auth";
import { bestMatch, normalize, similarity } from "./match";

const ID = "37i9dQZF1DXcBWIGoYBM5M";

describe("parsePlaylistId", () => {
  it.each([
    [`https://open.spotify.com/playlist/${ID}?si=abc123`, ID],
    [`https://open.spotify.com/intl-de/playlist/${ID}`, ID],
    [`spotify:playlist:${ID}`, ID],
    [ID, ID],
    ["https://open.spotify.com/album/1A2GTWGtFfWp7KSQTwWOyo", null],
    ["hello", null],
  ])("%s", (input, expected) => {
    expect(parsePlaylistId(input)).toBe(expected);
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

it("computes the S256 PKCE challenge as base64url(sha256(verifier))", async () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFcXjbOFs";
  const expected = createHash("sha256").update(verifier).digest("base64url");
  expect(await pkceChallenge(verifier)).toBe(expected);
  expect(expected).not.toMatch(/[+/=]/);
});
