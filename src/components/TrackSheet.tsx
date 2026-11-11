import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownCircle, CheckCircle2, Heart, ListEnd, ListPlus, ListStart, Plus, Trash2, User,
} from "lucide-react";
import { downloadTrack, removeDownload } from "@/library/downloads";
import { useLibrary } from "@/library/store";
import { player } from "@/player/engine";
import type { Track } from "@/lib/types";
import { Cover } from "./Cover";
import { Sheet, SheetItem } from "./Sheet";
import { toast } from "./Toast";

interface Props {
  track: Track | null;
  onClose: () => void;
  /** shown when the track sits in one of your playlists */
  playlistId?: string;
}

export function TrackSheet({ track, onClose, playlistId }: Props) {
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const liked = useLibrary((s) => (track ? s.liked.some((t) => t.id === track.id) : false));
  const downloaded = useLibrary((s) => (track ? Boolean(s.downloads[track.id]) : false));
  const playlists = useLibrary((s) => s.playlists);
  const lib = useLibrary.getState();

  const close = () => {
    setPicking(false);
    onClose();
  };
  if (!track) return null;
  const run = (fn: () => void, message?: string) => () => {
    fn();
    if (message) toast(message);
    close();
  };

  return (
    <Sheet open={Boolean(track)} onClose={close} label={`Options for ${track.title}`}>
      <div className="flex items-center gap-3 border-b border-line px-5 pb-4 pt-3">
        <Cover src={track.artwork} seed={track.id} className="h-12 w-12" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{track.title}</p>
          <p className="truncate text-sm text-muted">{track.artist}</p>
        </div>
      </div>
      {picking ? (
        <div className="py-2">
          <p className="px-5 py-2 text-sm font-bold text-muted">Add to playlist</p>
          <SheetItem
            icon={<Plus />}
            label="New playlist"
            onClick={run(() => {
              const p = lib.createPlaylist(`My playlist #${playlists.length + 1}`, [track]);
              navigate(`/playlist/${p.id}`);
            }, "Added to new playlist")}
          />
          {playlists.map((p) => (
            <SheetItem
              key={p.id}
              icon={<Cover src={p.artwork} seed={p.id} className="h-6 w-6" rounded="rounded-sm" />}
              label={p.name}
              onClick={run(() => lib.addToPlaylist(p.id, track), `Added to ${p.name}`)}
            />
          ))}
        </div>
      ) : (
        <div className="py-2">
          <SheetItem
            icon={<Heart className={liked ? "fill-mint text-mint" : ""} />}
            label={liked ? "Remove from Liked Songs" : "Add to Liked Songs"}
            onClick={run(() => lib.toggleLike(track), liked ? "Removed from Liked Songs" : "Added to Liked Songs")}
          />
          <SheetItem icon={<ListPlus />} label="Add to playlist" onClick={() => setPicking(true)} />
          {playlistId && (
            <SheetItem
              icon={<Trash2 />}
              label="Remove from this playlist"
              onClick={run(() => lib.removeFromPlaylist(playlistId, track.id), "Removed")}
            />
          )}
          <SheetItem icon={<ListStart />} label="Play next" onClick={run(() => player.playNext(track), "Playing next")} />
          <SheetItem icon={<ListEnd />} label="Add to queue" onClick={run(() => player.addToQueue(track), "Added to queue")} />
          {track.source === "local" ? (
            <SheetItem
              icon={<Trash2 />}
              label="Delete from this phone"
              onClick={run(() => void removeDownload(track.id), "Deleted")}
            />
          ) : track.source === "youtube" ? null : downloaded ? (
            <SheetItem
              icon={<CheckCircle2 className="text-mint" />}
              label="Remove download"
              onClick={run(() => void removeDownload(track.id), "Download removed")}
            />
          ) : (
            <SheetItem
              icon={<ArrowDownCircle />}
              label="Download"
              onClick={run(
                () => void downloadTrack(track).then(
                  () => toast("Downloaded — plays offline"),
                  () => toast("Download failed"),
                ),
                "Downloading…",
              )}
            />
          )}
          {track.artistId && (
            <SheetItem icon={<User />} label="Go to artist" onClick={run(() => navigate(`/artist/${track.artistId}`))} />
          )}
        </div>
      )}
    </Sheet>
  );
}
