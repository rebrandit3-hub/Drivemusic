import { Heart } from "lucide-react";
import { useLibrary } from "@/library/store";
import { player } from "@/player/engine";
import { currentTrack, usePlayer } from "@/player/store";
import { Cover } from "./Cover";
import { PlayIcon } from "./PlayButton";

export function MiniPlayer() {
  const track = usePlayer(currentTrack);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const buffering = usePlayer((s) => s.buffering);
  const progress = usePlayer((s) => (s.duration ? s.position / s.duration : 0));
  const error = usePlayer((s) => s.error);
  const liked = useLibrary((s) => (track ? s.liked.some((t) => t.id === track.id) : false));
  if (!track) return null;

  return (
    <div className="px-2 pb-1.5">
      <div className="relative overflow-hidden rounded-lg bg-highlight shadow-xl shadow-black/50">
        <div className="flex items-center gap-3 p-2 pr-1">
          <button
            aria-label="Open player"
            onClick={() => usePlayer.setState({ nowPlayingOpen: true })}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <Cover src={track.artwork} seed={track.id} className="h-10 w-10" rounded="rounded" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{track.title}</span>
              <span className={`block truncate text-[12.5px] ${error ? "text-danger" : "text-muted"}`}>
                {error ?? track.artist}
              </span>
            </span>
          </button>
          <button
            aria-label={liked ? "Remove from Liked Songs" : "Like"}
            onClick={() => useLibrary.getState().toggleLike(track)}
            className="flex h-10 w-10 items-center justify-center"
          >
            <Heart className={`h-[22px] w-[22px] ${liked ? "fill-mint text-mint" : "text-text"}`} />
          </button>
          <button
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={() => player.toggle()}
            className="flex h-10 w-10 items-center justify-center"
          >
            <PlayIcon playing={isPlaying} buffering={buffering} className="h-[22px] w-[22px]" />
          </button>
        </div>
        <div className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-white/15">
          <div className="h-full rounded-full bg-text" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
