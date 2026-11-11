import { create } from "zustand";
import type { Track } from "@/lib/types";
import type { RepeatMode } from "./queue";

export interface PlayerState {
  queue: Track[];
  /** queue order before shuffle, to restore it */
  baseQueue: Track[];
  index: number;
  shuffle: boolean;
  repeat: RepeatMode;
  isPlaying: boolean;
  buffering: boolean;
  position: number;
  duration: number;
  error: string | null;
  /** name of what is playing, e.g. a playlist */
  context: string | null;
  nowPlayingOpen: boolean;
}

export const usePlayer = create<PlayerState>(() => ({
  queue: [],
  baseQueue: [],
  index: -1,
  shuffle: false,
  repeat: "off",
  isPlaying: false,
  buffering: false,
  position: 0,
  duration: 0,
  error: null,
  context: null,
  nowPlayingOpen: false,
}));

export const currentTrack = (s: PlayerState): Track | undefined => s.queue[s.index];
