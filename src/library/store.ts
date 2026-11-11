import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import type { Playlist, Track } from "@/lib/types";

export interface DownloadMeta {
  track: Track;
  bytes: number;
  savedAt: number;
}

interface LibraryState {
  ready: boolean;
  liked: Track[];
  playlists: Playlist[];
  downloads: Record<string, DownloadMeta>;
  recent: Track[];
  load: () => Promise<void>;
  isLiked: (id: string) => boolean;
  toggleLike: (track: Track) => void;
  createPlaylist: (name: string, tracks?: Track[], importedFrom?: string) => Playlist;
  renamePlaylist: (id: string, name: string) => void;
  setPlaylistArtwork: (id: string, artwork: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  addRecent: (track: Track) => void;
  /** update a song's details everywhere (e.g. a placeholder found on YouTube) */
  replaceTrack: (track: Track) => void;
  setDownload: (meta: DownloadMeta) => void;
  removeDownload: (id: string) => void;
}

const KEY = "drivemusic:library:v1";
const RECENT_MAX = 30;

type Persisted = Pick<LibraryState, "liked" | "playlists" | "downloads" | "recent">;

function persist(state: LibraryState) {
  const data: Persisted = {
    liked: state.liked,
    playlists: state.playlists,
    downloads: state.downloads,
    recent: state.recent,
  };
  void idbSet(KEY, data).catch(() => {});
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const useLibrary = create<LibraryState>((set, get) => {
  const update = (fn: (s: LibraryState) => Partial<LibraryState>) => {
    set(fn);
    persist(get());
  };
  return {
    ready: false,
    liked: [],
    playlists: [],
    downloads: {},
    recent: [],
    async load() {
      try {
        const data = await idbGet<Persisted>(KEY);
        if (data) set({ ...data });
      } finally {
        set({ ready: true });
      }
    },
    isLiked: (id) => get().liked.some((t) => t.id === id),
    toggleLike: (track) =>
      update((s) => ({
        liked: s.liked.some((t) => t.id === track.id)
          ? s.liked.filter((t) => t.id !== track.id)
          : [track, ...s.liked],
      })),
    createPlaylist(name, tracks = [], importedFrom) {
      const playlist: Playlist = {
        id: newId(),
        name: name.trim() || "My playlist",
        tracks,
        createdAt: Date.now(),
        importedFrom,
        artwork: tracks.find((t) => t.artwork)?.artwork,
      };
      update((s) => ({ playlists: [playlist, ...s.playlists] }));
      return playlist;
    },
    renamePlaylist: (id, name) =>
      update((s) => ({
        playlists: s.playlists.map((p) => (p.id === id ? { ...p, name } : p)),
      })),
    setPlaylistArtwork: (id, artwork) =>
      update((s) => ({
        playlists: s.playlists.map((p) => (p.id === id ? { ...p, artwork } : p)),
      })),
    deletePlaylist: (id) =>
      update((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),
    addToPlaylist: (playlistId, track) =>
      update((s) => ({
        playlists: s.playlists.map((p) =>
          p.id !== playlistId || p.tracks.some((t) => t.id === track.id)
            ? p
            : {
                ...p,
                tracks: [...p.tracks, track],
                artwork: p.artwork ?? track.artwork,
              },
        ),
      })),
    removeFromPlaylist: (playlistId, trackId) =>
      update((s) => ({
        playlists: s.playlists.map((p) =>
          p.id === playlistId
            ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) }
            : p,
        ),
      })),
    addRecent: (track) =>
      update((s) => ({
        recent: [track, ...s.recent.filter((t) => t.id !== track.id)].slice(0, RECENT_MAX),
      })),
    replaceTrack: (track) =>
      update((s) => {
        const swap = (list: Track[]) => list.map((t) => (t.id === track.id ? track : t));
        return {
          liked: swap(s.liked),
          recent: swap(s.recent),
          playlists: s.playlists.map((p) =>
            p.tracks.some((t) => t.id === track.id)
              ? { ...p, tracks: swap(p.tracks), artwork: p.artwork ?? track.artwork }
              : p,
          ),
        };
      }),
    setDownload: (meta) =>
      update((s) => ({ downloads: { ...s.downloads, [meta.track.id]: meta } })),
    removeDownload: (id) =>
      update((s) => {
        const next = { ...s.downloads };
        delete next[id];
        return { downloads: next };
      }),
  };
});
