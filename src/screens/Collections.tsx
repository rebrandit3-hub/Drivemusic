import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDown, Heart, ListPlus, Pencil, Search, Trash2 } from "lucide-react";
import { audius } from "@/api/audius";
import { CollectionView } from "@/components/CollectionView";
import { Sheet, SheetItem } from "@/components/Sheet";
import { EmptyState, ErrorState, Spinner } from "@/components/states";
import { toast } from "@/components/Toast";
import { formatBytes, removeDownload } from "@/library/downloads";
import { useLibrary } from "@/library/store";
import { useQuery } from "@/lib/useQuery";

export function LikedScreen() {
  const liked = useLibrary((s) => s.liked);
  return (
    <CollectionView
      title="Liked Songs"
      seed="liked-songs"
      coverIcon={<Heart className="h-1/3 w-1/3 fill-white" />}
      tracks={liked}
      empty={<EmptyState icon={<Heart />} title="Songs you like will appear here" body="Tap the heart on any song to save it." />}
    />
  );
}

export function DownloadsScreen() {
  const downloads = useLibrary((s) => s.downloads);
  const metas = Object.values(downloads).sort((a, b) => b.savedAt - a.savedAt);
  const bytes = metas.reduce((sum, m) => sum + m.bytes, 0);
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <CollectionView
        title="Downloads"
        subtitle={metas.length ? `${formatBytes(bytes)} on this phone · plays without internet` : "Plays without internet"}
        seed="downloads"
        coverIcon={<ArrowDown className="h-1/3 w-1/3" strokeWidth={2.5} />}
        tracks={metas.map((m) => m.track)}
        onMore={metas.length ? () => setConfirm(true) : undefined}
        empty={<EmptyState icon={<ArrowDown />} title="Nothing downloaded yet" body="Tap the download arrow on a song or playlist to keep it on your phone." />}
      />
      <Sheet open={confirm} onClose={() => setConfirm(false)} label="Downloads options">
        <div className="py-2">
          <SheetItem
            danger
            icon={<Trash2 />}
            label={`Remove all downloads (${formatBytes(bytes)})`}
            onClick={() => {
              setConfirm(false);
              void Promise.all(metas.map((m) => removeDownload(m.track.id))).then(() => toast("Downloads removed"));
            }}
          />
        </div>
      </Sheet>
    </>
  );
}

export function PlaylistScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const playlist = useLibrary((s) => s.playlists.find((p) => p.id === id));
  const ready = useLibrary((s) => s.ready);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  if (!ready) return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  if (!playlist) return <ErrorState message="This playlist was deleted." onRetry={() => navigate("/library")} />;
  const lib = useLibrary.getState();
  return (
    <>
      <CollectionView
        title={playlist.name}
        subtitle={playlist.importedFrom ? `Imported from Spotify` : undefined}
        artwork={playlist.artwork}
        seed={playlist.id}
        tracks={playlist.tracks}
        playlistId={playlist.id}
        onMore={() => setMenu(true)}
        empty={
          <EmptyState
            icon={<ListPlus />}
            title="Let's find something for your playlist"
            body="Use the ⋮ menu on any song and pick “Add to playlist”."
            action={
              <button onClick={() => navigate("/search")} className="flex items-center gap-2 rounded-full bg-text px-5 py-2.5 text-sm font-bold text-bg">
                <Search className="h-4 w-4" /> Find songs
              </button>
            }
          />
        }
      />
      <Sheet open={menu} onClose={() => setMenu(false)} label="Playlist options">
        {renaming ? (
          <form
            className="flex flex-col gap-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) lib.renamePlaylist(playlist.id, name.trim());
              setRenaming(false);
              setMenu(false);
            }}
          >
            <p className="text-center font-bold">Rename playlist</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="border-b-2 border-mint bg-transparent pb-2 text-center text-xl font-bold outline-none"
            />
            <button className="mx-auto rounded-full bg-mint px-8 py-3 font-bold text-on-mint">Save</button>
          </form>
        ) : (
          <div className="py-2">
            <SheetItem icon={<Pencil />} label="Rename" onClick={() => { setName(playlist.name); setRenaming(true); }} />
            <SheetItem
              danger
              icon={<Trash2 />}
              label="Delete playlist"
              onClick={() => {
                setMenu(false);
                lib.deletePlaylist(playlist.id);
                toast("Playlist deleted");
                navigate("/library", { replace: true });
              }}
            />
          </div>
        )}
      </Sheet>
    </>
  );
}

export function RemotePlaylistScreen() {
  const { id = "" } = useParams();
  const { data, error, loading, retry } = useQuery(`playlist:${id}`, () => audius.playlist(id));
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  if (loading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  if (error || !data) return <ErrorState message="Couldn't load this playlist." onRetry={retry} />;
  return (
    <>
      <CollectionView
        title={data.name}
        subtitle={`By ${data.owner}`}
        artwork={data.artwork}
        seed={data.id}
        tracks={data.tracks}
        onMore={() => setMenu(true)}
      />
      <Sheet open={menu} onClose={() => setMenu(false)} label="Playlist options">
        <div className="py-2">
          <SheetItem
            icon={<ListPlus />}
            label="Save to Your Library"
            onClick={() => {
              const p = useLibrary.getState().createPlaylist(data.name, data.tracks);
              setMenu(false);
              toast("Saved to Your Library");
              navigate(`/playlist/${p.id}`);
            }}
          />
        </div>
      </Sheet>
    </>
  );
}
