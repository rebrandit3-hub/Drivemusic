import type { Track } from "@/lib/types";
import { matchTracks } from "./importer";

const catalogSong: Track = { id: "a1", title: "Midnight City", artist: "M83", duration: 243, source: "audius" };

vi.mock("@/api/audius", () => ({
  audius: {
    searchTracks: async (q: string) => (q.includes("Midnight City") ? [catalogSong] : [{ ...catalogSong, id: "x", title: "Something Else", artist: "Nobody" }]),
  },
}));

it("keeps every song: catalog hits are downloadable, the rest play from YouTube", async () => {
  const progress: number[] = [];
  const result = await matchTracks(
    [
      { title: "Midnight City", artists: ["M83"], durationMs: 243000 },
      { title: "Blinding Lights", artists: ["The Weeknd"], durationMs: 200000 },
    ],
    (done) => progress.push(done),
  );
  expect(result.catalog).toBe(1);
  expect(result.youtube).toBe(1);
  expect(result.tracks[0]).toBe(catalogSong);
  expect(result.tracks[1]).toMatchObject({ source: "youtube", query: "The Weeknd Blinding Lights", title: "Blinding Lights", duration: 200 });
  expect(result.tracks[1].videoId).toBeUndefined();
  expect(progress).toEqual([1, 2]);
});
