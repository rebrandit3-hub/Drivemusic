import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, Heart, Import, Plus, Smartphone } from "lucide-react";
import { Cover } from "@/components/Cover";
import { Sheet, SheetItem } from "@/components/Sheet";
import { useLibrary } from "@/library/store";
import { cn } from "@/lib/ui";

type Filter = "all" | "playlists" | "downloaded";

function Row({ to, title, subtitle, cover }: { to: string; title: string; subtitle: string; cover: React.ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-2 active:bg-white/5">
      {cover}
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-medium">{title}</span>
        <span className="block truncate text-[13px] text-muted">{subtitle}</span>
      </span>
    </Link>
  );
}

export default function Library() {
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  const liked = useLibrary((s) => s.liked);
  const playlists = useLibrary((s) => s.playlists);
  const downloads = useLibrary((s) => s.downloads);
  const metas = Object.values(downloads);
  const downloadCount = metas.filter((m) => m.track.source !== "local").length;
  const localCount = metas.length - downloadCount;
  const shownPlaylists = filter === "downloaded"
    ? playlists.filter((p) => p.tracks.length > 0 && p.tracks.every((t) => downloads[t.id]))
    : playlists;

  return (
    <div className="no-scrollbar h-full overflow-y-auto pb-8">
      <div className="pt-safe sticky top-0 z-10 bg-bg pb-2">
        <header className="flex items-center justify-between px-4 pb-3 pt-2">
          <h1 className="text-[24px] font-extrabold tracking-tight">Your Library</h1>
          <button aria-label="Create" onClick={() => setAdding(true)} className="flex h-10 w-10 items-center justify-center">
            <Plus className="h-7 w-7" />
          </button>
        </header>
        <div className="flex gap-2 px-4">
          {(["all", "playlists", "downloaded"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-semibold capitalize",
                filter === f ? "bg-mint text-on-mint" : "bg-white/[0.08]",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        {filter !== "playlists" && (
          <>
            <Row
              to="/liked"
              title="Liked Songs"
              subtitle={`Playlist · ${liked.length} songs`}
              cover={
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-gradient-to-br from-mint-deep to-[#1d3d8f]">
                  <Heart className="h-6 w-6 fill-white text-white" />
                </div>
              }
            />
            <Row
              to="/local"
              title="Music on this phone"
              subtitle={localCount ? `${localCount} of your own files` : "Add the MP3s you own"}
              cover={
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-gradient-to-br from-[#3b2a6b] to-[#14532d]">
                  <Smartphone className="h-7 w-7 text-white" />
                </div>
              }
            />
            <Row
              to="/downloads"
              title="Downloads"
              subtitle={`${downloadCount} songs on this phone`}
              cover={
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-gradient-to-br from-[#14532d] to-mint-deep">
                  <ArrowDown className="h-7 w-7 text-white" strokeWidth={2.5} />
                </div>
              }
            />
          </>
        )}
        {shownPlaylists.map((p) => (
          <Row
            key={p.id}
            to={`/playlist/${p.id}`}
            title={p.name}
            subtitle={`${p.importedFrom ? "Imported" : "Playlist"} · ${p.tracks.length} songs`}
            cover={<Cover src={p.artwork} seed={p.id} className="h-16 w-16" rounded="rounded" />}
          />
        ))}
        <Link to="/import" className="mx-4 mt-6 flex items-center gap-3 rounded-lg bg-surface p-4 active:bg-elevated">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1ed760]/15 text-[#1ed760]">
            <Import className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold">Import from Spotify</span>
            <span className="block text-[13px] text-muted">Bring your playlists over</span>
          </span>
        </Link>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} label="Create">
        <div className="py-2">
          <SheetItem
            icon={<Plus />}
            label="New playlist"
            onClick={() => {
              const p = useLibrary.getState().createPlaylist(`My playlist #${playlists.length + 1}`);
              setAdding(false);
              navigate(`/playlist/${p.id}`);
            }}
          />
          <SheetItem icon={<Smartphone />} label="Add music files" onClick={() => { setAdding(false); navigate("/local"); }} />
          <SheetItem icon={<Import />} label="Import from Spotify" onClick={() => { setAdding(false); navigate("/import"); }} />
        </div>
      </Sheet>
    </div>
  );
}
