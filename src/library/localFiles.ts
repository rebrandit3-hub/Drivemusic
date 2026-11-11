import type { Track } from "@/lib/types";
import { saveAudio } from "./downloads";
import { useLibrary } from "./store";
import { readId3, tagsFromFilename } from "./tags";

export const ACCEPTED = "audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus";
const MAX_BYTES = 200 * 1024 * 1024;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function readDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) ? value : 0);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(0);
    setTimeout(() => done(audio.duration || 0), 5000);
    audio.src = url;
  });
}

/** Shrinks embedded cover art to a small JPEG so the library stays light. */
async function coverDataUrl(picture: { mime: string; data: Uint8Array }): Promise<string | undefined> {
  try {
    const bitmap = await createImageBitmap(new Blob([picture.data], { type: picture.mime }));
    const size = 300;
    const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return undefined;
  }
}

export interface ImportOutcome {
  added: Track[];
  skipped: string[];
}

/** Copies the picked files into the app so they play offline, forever. */
export async function importFiles(files: File[], onProgress?: (done: number, total: number) => void): Promise<ImportOutcome> {
  const added: Track[] = [];
  const skipped: string[] = [];
  for (const [i, file] of files.entries()) {
    try {
      if (file.size > MAX_BYTES) throw new Error("too big");
      if (file.type && !file.type.startsWith("audio/") && !/\.(mp3|m4a|aac|wav|flac|ogg|opus)$/i.test(file.name)) {
        throw new Error("not audio");
      }
      const data = await file.arrayBuffer();
      const tags = readId3(data);
      const fallback = tagsFromFilename(file.name);
      const type = file.type || "audio/mpeg";
      const duration = await readDuration(new Blob([data], { type }));
      const track: Track = {
        id: `local:${newId()}`,
        title: tags.title || fallback.title,
        artist: tags.artist || fallback.artist || "Unknown artist",
        artwork: tags.picture ? await coverDataUrl(tags.picture) : undefined,
        duration,
        source: "local",
      };
      await saveAudio(track.id, data, type);
      useLibrary.getState().setDownload({ track, bytes: file.size, savedAt: Date.now() });
      added.push(track);
    } catch {
      skipped.push(file.name);
    }
    onProgress?.(i + 1, files.length);
  }
  return { added, skipped };
}
