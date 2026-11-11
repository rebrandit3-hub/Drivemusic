import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownCircle, CheckCircle2, ChevronDown, Heart, ListMusic, MoreHorizontal,
  Repeat, Repeat1, Shuffle, SkipBack, SkipForward,
} from "lucide-react";
import { downloadTrack, useDownloadProgress } from "@/library/downloads";
import { useLibrary } from "@/library/store";
import { player } from "@/player/engine";
import { formatTime } from "@/player/queue";
import { currentTrack, usePlayer } from "@/player/store";
import { cn } from "@/lib/ui";
import { Cover } from "./Cover";
import { PlayIcon } from "./PlayButton";
import { toast } from "./Toast";
import { TrackSheet } from "./TrackSheet";
import { VIDEO_SLOT_ATTR } from "./VideoSurface";
import type { Track } from "@/lib/types";

function Seekbar() {
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const [drag, setDrag] = useState<number | null>(null);
  const value = drag ?? position;
  const fill = duration ? (value / duration) * 100 : 0;
  return (
    <div>
      <input
        type="range"
        aria-label="Seek"
        className="range w-full"
        min={0}
        max={duration || 1}
        step={0.5}
        value={value}
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={() => {
          if (drag !== null) player.seek(drag);
          setDrag(null);
        }}
        onKeyUp={() => {
          if (drag !== null) player.seek(drag);
          setDrag(null);
        }}
      />
      <div className="flex justify-between text-[11px] font-medium tabular-nums text-muted">
        <span>{formatTime(value)}</span>
        <span>-{formatTime(Math.max(0, duration - value))}</span>
      </div>
    </div>
  );
}

function QueueView({ onPick }: { onPick: () => void }) {
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const upNext = queue.slice(index + 1);
  return (
    <div className="no-scrollbar flex-1 overflow-y-auto">
      <p className="px-1 pb-2 text-sm font-bold">Now playing</p>
      {queue[index] && <QueueItem track={queue[index]} active />}
      <p className="px-1 pb-2 pt-5 text-sm font-bold">Next up</p>
      {upNext.length === 0 && <p className="px-1 text-sm text-muted">Nothing queued.</p>}
      {upNext.map((t, i) => (
        <QueueItem
          key={`${t.id}-${i}`}
          track={t}
          onClick={() => {
            player.jumpTo(index + 1 + i);
            onPick();
          }}
        />
      ))}
    </div>
  );
}

function QueueItem({ track, active, onClick }: { track: Track; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="flex w-full items-center gap-3 rounded px-1 py-1.5 text-left active:bg-white/5">
      <Cover src={track.artwork} seed={track.id} className="h-11 w-11" rounded="rounded" />
      <span className="min-w-0">
        <span className={cn("block truncate text-[14px] font-medium", active && "text-mint")}>{track.title}</span>
        <span className="block truncate text-[12.5px] text-muted">{track.artist}</span>
      </span>
    </button>
  );
}

export function NowPlaying() {
  const open = usePlayer((s) => s.nowPlayingOpen);
  const track = usePlayer(currentTrack);
  const { isPlaying, buffering, shuffle, repeat, context, error } = usePlayer();
  const liked = useLibrary((s) => (track ? s.liked.some((t) => t.id === track.id) : false));
  const downloaded = useLibrary((s) => (track ? Boolean(s.downloads[track.id]) : false));
  const downloading = useDownloadProgress((s) => (track ? s.progress[track.id] !== undefined : false));
  const [showQueue, setShowQueue] = useState(false);
  const [menu, setMenu] = useState<Track | null>(null);
  const navigate = useNavigate();
  const close = () => usePlayer.setState({ nowPlayingOpen: false });

  useEffect(() => {
    if (!open) setShowQueue(false);
  }, [open]);

  if (!open || !track) return null;

  return (
    <div className="animate-sheet-up fixed inset-0 z-[60] mx-auto flex max-w-[520px] flex-col overflow-hidden bg-bg">
      {/* blurred artwork as the backdrop, darkened toward the controls */}
      {track.artwork && (
        <img src={track.artwork} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-3xl" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-bg/60 to-bg" />

      <div className="pt-safe pb-safe relative flex flex-1 flex-col px-6">
        <header className="flex items-center justify-between pb-4">
          <button aria-label="Close player" onClick={close} className="-ml-2 flex h-10 w-10 items-center justify-center">
            <ChevronDown className="h-7 w-7" />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted">
              {showQueue ? "Queue" : "Playing from"}
            </p>
            {!showQueue && <p className="truncate text-[13px] font-bold">{context ?? "DriveMusic"}</p>}
          </div>
          <button aria-label="More options" onClick={() => setMenu(track)} className="-mr-2 flex h-10 w-10 items-center justify-center">
            <MoreHorizontal className="h-6 w-6" />
          </button>
        </header>

        {showQueue ? (
          <QueueView onPick={() => setShowQueue(false)} />
        ) : (
          <div className="flex flex-1 items-center justify-center py-2">
            {track.source === "youtube" ? (
              <div
                {...{ [VIDEO_SLOT_ATTR]: "" }}
                className="aspect-square w-full max-w-[min(100%,46dvh)] rounded-lg bg-black"
              />
            ) : (
            <Cover
              src={track.artwork}
              seed={track.id}
              rounded="rounded-lg"
              className={cn(
                "aspect-square w-full max-w-[min(100%,46dvh)] shadow-2xl shadow-black/60 transition-transform duration-300",
                !isPlaying && "scale-[0.92]",
              )}
            />
            )}
          </div>
        )}

        <div className="pt-5">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[22px] font-bold leading-tight">{track.title}</p>
              <button
                className="block max-w-full truncate text-[15px] text-muted"
                onClick={() => {
                  if (!track.artistId) return;
                  close();
                  navigate(`/artist/${track.artistId}`);
                }}
              >
                {track.artist}
              </button>
            </div>
            {track.source !== "youtube" && (
            <button
              aria-label={downloaded ? "Downloaded" : "Download"}
              disabled={downloaded || downloading}
              onClick={() =>
                void downloadTrack(track).then(
                  () => toast("Downloaded — plays offline"),
                  () => toast("Download failed"),
                )
              }
              className="flex h-10 w-10 items-center justify-center"
            >
              {downloaded ? (
                <CheckCircle2 className="h-6 w-6 text-mint" />
              ) : (
                <ArrowDownCircle className={cn("h-6 w-6", downloading && "animate-pulse text-mint")} />
              )}
            </button>
            )}
            <button
              aria-label={liked ? "Remove from Liked Songs" : "Like"}
              onClick={() => useLibrary.getState().toggleLike(track)}
              className="flex h-10 w-10 items-center justify-center"
            >
              <Heart className={cn("h-6 w-6", liked && "fill-mint text-mint")} />
            </button>
          </div>

          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-4">
            <Seekbar />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button aria-label="Shuffle" aria-pressed={shuffle} onClick={() => player.toggleShuffle()} className="relative flex h-12 w-12 items-center justify-center">
              <Shuffle className={cn("h-6 w-6", shuffle ? "text-mint" : "text-text")} />
              {shuffle && <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-mint" />}
            </button>
            <button aria-label="Previous" onClick={() => player.prev()} className="flex h-14 w-14 items-center justify-center">
              <SkipBack className="h-8 w-8 fill-current" />
            </button>
            <button
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={() => player.toggle()}
              className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-mint text-on-mint transition-transform active:scale-95"
            >
              <PlayIcon playing={isPlaying} buffering={buffering} className="h-8 w-8" />
            </button>
            <button aria-label="Next" onClick={() => player.next()} className="flex h-14 w-14 items-center justify-center">
              <SkipForward className="h-8 w-8 fill-current" />
            </button>
            <button aria-label={`Repeat ${repeat}`} onClick={() => player.cycleRepeat()} className="relative flex h-12 w-12 items-center justify-center">
              {repeat === "one" ? (
                <Repeat1 className="h-6 w-6 text-mint" />
              ) : (
                <Repeat className={cn("h-6 w-6", repeat === "all" ? "text-mint" : "text-text")} />
              )}
              {repeat !== "off" && <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-mint" />}
            </button>
          </div>

          <div className="flex justify-end pb-4 pt-1">
            <button
              aria-label="Queue"
              aria-pressed={showQueue}
              onClick={() => setShowQueue((v) => !v)}
              className="flex h-10 w-10 items-center justify-center"
            >
              <ListMusic className={cn("h-5 w-5", showQueue ? "text-mint" : "text-text")} />
            </button>
          </div>
        </div>
      </div>
      <TrackSheet track={menu} onClose={() => setMenu(null)} />
    </div>
  );
}
