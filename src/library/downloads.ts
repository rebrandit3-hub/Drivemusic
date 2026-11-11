import { create } from "zustand";
import { del, get, set } from "idb-keyval";
import { audius } from "@/api/audius";
import type { Track } from "@/lib/types";
import { useLibrary } from "./store";

const audioKey = (id: string) => `drivemusic:audio:${id}`;

interface StoredAudio {
  type: string;
  data: ArrayBuffer;
}

interface DownloadProgress {
  /** 0..1, or -1 when the size is unknown */
  progress: Record<string, number>;
  errors: Record<string, string>;
}

export const useDownloadProgress = create<DownloadProgress>(() => ({
  progress: {},
  errors: {},
}));

const setProgress = (id: string, value: number | null) =>
  useDownloadProgress.setState((s) => {
    const progress = { ...s.progress };
    if (value === null) delete progress[id];
    else progress[id] = value;
    return { progress };
  });

/** Ask the browser not to evict our audio when the phone runs low on space. */
async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // not supported: downloads still work, they are just evictable
  }
}

export async function downloadTrack(track: Track): Promise<void> {
  if (useLibrary.getState().downloads[track.id]) return;
  if (useDownloadProgress.getState().progress[track.id] !== undefined) return;
  void requestPersistence();
  setProgress(track.id, 0);
  useDownloadProgress.setState((s) => {
    const errors = { ...s.errors };
    delete errors[track.id];
    return { errors };
  });
  try {
    const res = await fetch(await audius.streamUrl(track.id));
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const total = Number(res.headers.get("content-length")) || 0;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      setProgress(track.id, total ? received / total : -1);
    }
    // raw bytes, not a Blob: older iOS Safari can't keep Blobs in IndexedDB
    const data = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const stored: StoredAudio = {
      type: res.headers.get("content-type") || "audio/mpeg",
      data: data.buffer,
    };
    await set(audioKey(track.id), stored);
    useLibrary
      .getState()
      .setDownload({ track, bytes: received, savedAt: Date.now() });
  } catch (err) {
    useDownloadProgress.setState((s) => ({
      errors: { ...s.errors, [track.id]: String(err) },
    }));
    throw err;
  } finally {
    setProgress(track.id, null);
  }
}

export async function downloadMany(tracks: Track[]) {
  // one at a time keeps memory low and leaves bandwidth for playback
  for (const track of tracks) {
    try {
      await downloadTrack(track);
    } catch {
      // keep going; the error is shown on that track
    }
  }
}

export async function removeDownload(id: string) {
  await del(audioKey(id));
  useLibrary.getState().removeDownload(id);
}

export async function getOfflineBlob(id: string): Promise<Blob | undefined> {
  if (!useLibrary.getState().downloads[id]) return undefined;
  try {
    const stored = await get<StoredAudio>(audioKey(id));
    return stored ? new Blob([stored.data], { type: stored.type }) : undefined;
  } catch {
    return undefined;
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
