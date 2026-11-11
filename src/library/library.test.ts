import { get } from "idb-keyval";
import type { Track } from "@/lib/types";
import { downloadTrack, getOfflineBlob, removeDownload } from "./downloads";
import { useLibrary } from "./store";

const t = (id: string): Track => ({ id, title: `Song ${id}`, artist: "A", duration: 100, source: "audius" });

vi.mock("@/api/audius", () => ({
  audius: { streamUrl: async (id: string) => `https://stream.test/${id}` },
}));

beforeEach(() => {
  useLibrary.setState({ liked: [], playlists: [], downloads: {}, recent: [], ready: true });
});

describe("library", () => {
  it("likes and unlikes", () => {
    useLibrary.getState().toggleLike(t("1"));
    expect(useLibrary.getState().isLiked("1")).toBe(true);
    useLibrary.getState().toggleLike(t("1"));
    expect(useLibrary.getState().isLiked("1")).toBe(false);
  });

  it("creates playlists without duplicate tracks", () => {
    const p = useLibrary.getState().createPlaylist("Road trip");
    useLibrary.getState().addToPlaylist(p.id, t("1"));
    useLibrary.getState().addToPlaylist(p.id, t("1"));
    useLibrary.getState().addToPlaylist(p.id, t("2"));
    expect(useLibrary.getState().playlists[0].tracks.map((x) => x.id)).toEqual(["1", "2"]);
  });

  it("keeps recent plays unique and newest first", () => {
    const { addRecent } = useLibrary.getState();
    addRecent(t("1"));
    addRecent(t("2"));
    addRecent(t("1"));
    expect(useLibrary.getState().recent.map((x) => x.id)).toEqual(["1", "2"]);
  });
});

describe("downloads", () => {
  it("saves audio to IndexedDB and plays it back offline", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(bytes, { headers: { "content-type": "audio/mpeg", "content-length": "4" } })),
    );
    await downloadTrack(t("9"));
    expect(useLibrary.getState().downloads["9"].bytes).toBe(4);
    const blob = await getOfflineBlob("9");
    expect(blob?.size).toBe(4);

    await removeDownload("9");
    expect(useLibrary.getState().downloads["9"]).toBeUndefined();
    expect(await get("drivemusic:audio:9")).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("records a failed download without saving it", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 503 })));
    await expect(downloadTrack(t("8"))).rejects.toThrow();
    expect(useLibrary.getState().downloads["8"]).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
