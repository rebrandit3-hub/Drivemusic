import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronLeft, ClipboardPaste, X } from "lucide-react";
import { Cover } from "@/components/Cover";
import { Spinner } from "@/components/states";
import { useLibrary } from "@/library/store";
import { fetchSpotifyPlaylist, findSpotifyLink, type SpotifyTrack } from "@/spotify/api";
import { matchTracks } from "@/spotify/importer";

type Phase =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "matching"; name: string; image?: string; done: number; total: number }
  | { kind: "done"; playlistId: string; name: string; image?: string; matched: number; missing: SpotifyTrack[] };

const SPOTIFY_GREEN = "#1ed760";

const STEPS = [
  "In Spotify, open the playlist",
  "Tap ⋯ then Share → Copy link",
  "Come back here and tap Paste",
];

export default function ImportScreen() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const abort = useRef<AbortController | null>(null);
  const started = useRef<string | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const run = async (link: string) => {
    if (started.current === link) return;
    started.current = link;
    setError(null);
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      setPhase({ kind: "reading" });
      const source = await fetchSpotifyPlaylist(link, ctrl.signal);
      if (!source.tracks.length) throw new Error("This playlist is empty.");
      const base = { name: source.name, image: source.image };
      setPhase({ kind: "matching", ...base, done: 0, total: source.tracks.length });
      const { matched, missing } = await matchTracks(
        source.tracks,
        (done, total) => setPhase({ kind: "matching", ...base, done, total }),
        ctrl.signal,
      );
      if (ctrl.signal.aborted) return;
      const playlist = useLibrary.getState().createPlaylist(source.name, matched, `spotify:${source.id}`);
      setPhase({ kind: "done", playlistId: playlist.id, ...base, matched: matched.length, missing });
    } catch (err) {
      if (ctrl.signal.aborted) return;
      started.current = null;
      setError(err instanceof Error ? err.message : "Import failed.");
      setPhase({ kind: "idle" });
    }
  };

  /** Any text with a Spotify link in it starts the import right away. */
  const accept = (value: string) => {
    setText(value);
    setError(null);
    const link = findSpotifyLink(value);
    if (link) void run(link);
    else if (value.trim().length > 8) setError("That's not a Spotify playlist link.");
  };

  const pasteFromClipboard = async () => {
    try {
      accept(await navigator.clipboard.readText());
    } catch {
      setError("Long-press the box and choose Paste.");
    }
  };

  const reset = () => {
    started.current = null;
    setText("");
    setPhase({ kind: "idle" });
  };

  return (
    <div className="no-scrollbar h-full overflow-y-auto pb-10">
      <header className="pt-safe flex items-center gap-2 px-2 pb-2">
        <button aria-label="Back" onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[20px] font-bold">Import from Spotify</h1>
      </header>

      {phase.kind === "reading" || phase.kind === "matching" ? (
        <div className="flex flex-col items-center gap-4 px-8 pt-12 text-center">
          {phase.kind === "matching" ? (
            <Cover src={phase.image} seed={phase.name} className="h-40 w-40 shadow-2xl shadow-black/60" />
          ) : (
            <Spinner className="h-10 w-10" />
          )}
          <p className="text-lg font-bold">{phase.kind === "matching" ? phase.name : "Opening playlist…"}</p>
          {phase.kind === "matching" && (
            <>
              <p className="text-sm text-muted">
                Finding songs · {phase.done} of {phase.total}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-mint transition-[width]" style={{ width: `${(phase.done / Math.max(1, phase.total)) * 100}%` }} />
              </div>
            </>
          )}
          <button onClick={() => { abort.current?.abort(); reset(); }} className="text-sm font-semibold text-muted">
            Cancel
          </button>
        </div>
      ) : phase.kind === "done" ? (
        <div className="flex flex-col items-center gap-3 px-6 pt-8 text-center">
          <div className="relative">
            <Cover src={phase.image} seed={phase.name} className="h-40 w-40 shadow-2xl shadow-black/60" />
            <CheckCircle2 className="absolute -bottom-3 -right-3 h-10 w-10 rounded-full bg-bg fill-mint text-bg" />
          </div>
          <p className="mt-3 text-xl font-bold">{phase.name}</p>
          <p className="text-sm text-muted">
            {phase.matched} of {phase.matched + phase.missing.length} songs added to Your Library
          </p>
          <button onClick={() => navigate(`/playlist/${phase.playlistId}`, { replace: true })} className="mt-2 h-12 rounded-full bg-mint px-8 font-bold text-on-mint">
            Open playlist
          </button>
          <button onClick={reset} className="py-2 text-sm font-semibold text-muted">Import another</button>
          {phase.missing.length > 0 && (
            <div className="mt-4 w-full text-left">
              <p className="pb-1 text-sm font-bold">Not in the catalog ({phase.missing.length})</p>
              {phase.missing.slice(0, 100).map((t, i) => (
                <p key={i} className="truncate py-1 text-[13px] text-muted">{t.title} — {t.artists.join(", ")}</p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 pt-4">
          <button
            onClick={() => void pasteFromClipboard()}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-bold text-black active:scale-[0.98]"
            style={{ background: SPOTIFY_GREEN }}
          >
            <ClipboardPaste className="h-5 w-5" /> Paste playlist link
          </button>

          <label className="mt-4 flex h-12 items-center gap-2 rounded-md bg-surface px-3 ring-mint focus-within:ring-2">
            <input
              value={text}
              onChange={(e) => accept(e.target.value)}
              placeholder="…or paste it here"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
            />
            {text && (
              <button aria-label="Clear" onClick={reset}>
                <X className="h-5 w-5 text-muted" />
              </button>
            )}
          </label>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <ol className="mt-8 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-3 text-[15px]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elevated text-[13px] font-bold text-mint">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-8 text-[13px] leading-relaxed text-faint">
            Works with any public playlist, up to 2,000 songs. Spotify-made mixes (like Discover Weekly) can't be
            imported — save their songs to your own playlist first.
          </p>
        </div>
      )}
    </div>
  );
}
