import { memo } from "react";
import { ArrowDown, MoreVertical } from "lucide-react";
import { useDownloadProgress } from "@/library/downloads";
import { useLibrary } from "@/library/store";
import { currentTrack, usePlayer } from "@/player/store";
import type { Track } from "@/lib/types";
import { cn } from "@/lib/ui";
import { Cover } from "./Cover";

interface Props {
  track: Track;
  rank?: number;
  onPlay: () => void;
  onMore: (track: Track) => void;
}

function DownloadMark({ id }: { id: string }) {
  const done = useLibrary((s) => Boolean(s.downloads[id]));
  const progress = useDownloadProgress((s) => s.progress[id]);
  if (done) {
    return (
      <span aria-label="Downloaded" className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-mint">
        <ArrowDown className="h-2.5 w-2.5 text-on-mint" strokeWidth={3} />
      </span>
    );
  }
  if (progress === undefined) return null;
  const pct = progress < 0 ? 30 : Math.round(progress * 100);
  return (
    <span
      aria-label={`Downloading ${pct}%`}
      className="h-3.5 w-3.5 shrink-0 rounded-full"
      style={{ background: `conic-gradient(var(--color-mint) ${pct}%, rgba(255,255,255,.2) 0)` }}
    />
  );
}

export const TrackRow = memo(function TrackRow({ track, rank, onPlay, onMore }: Props) {
  const playing = usePlayer((s) => currentTrack(s)?.id === track.id);
  return (
    <div className="flex items-center gap-3 py-2 pl-4 pr-1 active:bg-white/5">
      {rank !== undefined && (
        <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-muted">{rank}</span>
      )}
      <button onClick={onPlay} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Cover src={track.artwork} seed={track.id} className="h-12 w-12" rounded="rounded" />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[15px] font-medium", playing ? "text-mint" : "text-text")}>
            {track.title}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] text-muted">
            <DownloadMark id={track.id} />
            <span className="truncate">{track.artist}</span>
          </span>
        </span>
      </button>
      <button
        aria-label={`More options for ${track.title}`}
        onClick={() => onMore(track)}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-muted"
      >
        <MoreVertical className="h-5 w-5" />
      </button>
    </div>
  );
});
