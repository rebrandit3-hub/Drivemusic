import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronLeft, ExternalLink, Link2 } from "lucide-react";
import { Cover } from "@/components/Cover";
import { Spinner } from "@/components/states";
import { useLibrary } from "@/library/store";
import {
  myPlaylists, parsePlaylistId, playlistWithTracks, SpotifyAuthError,
  type SpotifyPlaylist, type SpotifyTrack,
} from "@/spotify/api";
import {
  disconnect, getClientId, isConnected, PENDING_KEY, redirectUri, setClientId, startLogin,
} from "@/spotify/auth";
import { matchTracks } from "@/spotify/importer";

type Phase =
  | { kind: "idle" }
  | { kind: "loading"; name: string }
  | { kind: "matching"; name: string; done: number; total: number }
  | { kind: "done"; playlistId: string; name: string; matched: number; missing: SpotifyTrack[] };

const SPOTIFY_GREEN = "#1ed760";

function Setup({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-4 px-4">
      <p className="text-[15px] text-muted">
        Spotify only lets apps read playlists through its official API. One-time setup (2 minutes):
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-[14px] text-muted">
        <li>
          Open the{" "}
          <a className="font-semibold text-mint underline" href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
            Spotify Developer Dashboard <ExternalLink className="inline h-3.5 w-3.5" />
          </a>{" "}
          and create an app (pick “Web API”).
        </li>
        <li>
          Add this Redirect URI:
          <code className="mt-1 block break-all rounded bg-surface px-2 py-1.5 text-[12px] text-text">{redirectUri()}</code>
        </li>
        <li>Copy the app's Client ID and paste it below.</li>
      </ol>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Client ID"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="h-12 w-full rounded-md bg-surface px-3 font-mono text-[15px] outline-none ring-mint focus:ring-2"
      />
      <button
        disabled={value.trim().length < 20}
        onClick={() => {
          setClientId(value);
          onSaved();
        }}
        className="h-12 w-full rounded-full bg-mint font-bold text-on-mint disabled:opacity-40"
      >
        Save
      </button>
    </div>
  );
}

export default function ImportScreen() {
  const navigate = useNavigate();
  const [hasClient, setHasClient] = useState(Boolean(getClientId()));
  const [connected, setConnected] = useState(isConnected());
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [mine, setMine] = useState<SpotifyPlaylist[] | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = async (id: string) => {
    setError(null);
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      setPhase({ kind: "loading", name: "" });
      const source = await playlistWithTracks(id);
      setPhase({ kind: "matching", name: source.name, done: 0, total: source.tracks.length });
      const { matched, missing } = await matchTracks(
        source.tracks,
        (done, total) => setPhase({ kind: "matching", name: source.name, done, total }),
        ctrl.signal,
      );
      if (ctrl.signal.aborted) return;
      const playlist = useLibrary.getState().createPlaylist(source.name, matched, `spotify:${id}`);
      setPhase({ kind: "done", playlistId: playlist.id, name: source.name, matched: matched.length, missing });
    } catch (err) {
      if (err instanceof SpotifyAuthError) {
        disconnect();
        setConnected(false);
      }
      setError(err instanceof Error ? err.message : "Import failed.");
      setPhase({ kind: "idle" });
    }
  };

  // came back from the Spotify login with a link waiting
  useEffect(() => {
    if (!connected) return;
    const pending = sessionStorage.getItem(PENDING_KEY);
    if (pending) {
      sessionStorage.removeItem(PENDING_KEY);
      void run(pending);
    }
    myPlaylists().then(setMine, () => setMine([]));
    return () => abort.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const submitLink = () => {
    const id = parsePlaylistId(link);
    if (!id) return setError("That doesn't look like a Spotify playlist link.");
    if (!connected) return void startLogin(id).catch((e: Error) => setError(e.message));
    void run(id);
  };

  return (
    <div className="no-scrollbar h-full overflow-y-auto pb-10">
      <header className="pt-safe flex items-center gap-2 px-2 pb-4">
        <button aria-label="Back" onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[20px] font-bold">Import from Spotify</h1>
      </header>

      {!hasClient ? (
        <Setup onSaved={() => setHasClient(true)} />
      ) : phase.kind === "loading" || phase.kind === "matching" ? (
        <div className="flex flex-col items-center gap-4 px-8 pt-16 text-center">
          <Spinner className="h-10 w-10" />
          <p className="text-lg font-bold">{phase.name || "Reading playlist…"}</p>
          {phase.kind === "matching" && (
            <>
              <p className="text-sm text-muted">Finding songs {phase.done} of {phase.total}</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-mint transition-[width]" style={{ width: `${(phase.done / Math.max(1, phase.total)) * 100}%` }} />
              </div>
            </>
          )}
        </div>
      ) : phase.kind === "done" ? (
        <div className="flex flex-col items-center gap-3 px-6 pt-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-mint" />
          <p className="text-xl font-bold">{phase.name} imported</p>
          <p className="text-sm text-muted">
            Found {phase.matched} of {phase.matched + phase.missing.length} songs in the DriveMusic catalog.
          </p>
          <button onClick={() => navigate(`/playlist/${phase.playlistId}`, { replace: true })} className="mt-2 h-12 rounded-full bg-mint px-8 font-bold text-on-mint">
            Open playlist
          </button>
          <button onClick={() => setPhase({ kind: "idle" })} className="text-sm font-semibold text-muted">Import another</button>
          {phase.missing.length > 0 && (
            <div className="mt-6 w-full text-left">
              <p className="pb-2 text-sm font-bold">Not found ({phase.missing.length})</p>
              {phase.missing.slice(0, 50).map((t, i) => (
                <p key={i} className="truncate py-1 text-[13px] text-muted">{t.title} — {t.artists.join(", ")}</p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 px-4">
          <div className="space-y-3">
            <label className="flex h-12 items-center gap-2 rounded-md bg-surface px-3 ring-mint focus-within:ring-2">
              <Link2 className="h-5 w-5 shrink-0 text-muted" />
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitLink()}
                placeholder="Paste a Spotify playlist link"
                inputMode="url"
                autoCapitalize="off"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
              />
            </label>
            <button
              onClick={submitLink}
              disabled={!link.trim()}
              className="h-12 w-full rounded-full font-bold text-black disabled:opacity-40"
              style={{ background: SPOTIFY_GREEN }}
            >
              {connected ? "Import playlist" : "Connect Spotify & import"}
            </button>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>

          {!connected ? (
            <button
              onClick={() => void startLogin().catch((e: Error) => setError(e.message))}
              className="h-12 w-full rounded-full border border-white/30 font-bold"
            >
              Connect Spotify to see your playlists
            </button>
          ) : (
            <section>
              <div className="flex items-center justify-between pb-2">
                <h2 className="text-[17px] font-bold">Your Spotify playlists</h2>
                <button onClick={() => { disconnect(); setConnected(false); setMine(null); }} className="text-[13px] font-semibold text-muted">
                  Disconnect
                </button>
              </div>
              {mine === null && <Spinner />}
              {mine?.length === 0 && <p className="text-sm text-muted">No playlists found.</p>}
              {mine?.map((p) => (
                <button key={p.id} onClick={() => void run(p.id)} className="flex w-full items-center gap-3 py-2 text-left active:opacity-70">
                  <Cover src={p.image} seed={p.id} className="h-14 w-14" rounded="rounded" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block text-[13px] text-muted">{p.total} songs{p.owner ? ` · ${p.owner}` : ""}</span>
                  </span>
                </button>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
