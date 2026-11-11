import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatBytes } from "@/library/downloads";
import { useLibrary } from "@/library/store";

function Row({ label, value, to, onClick }: { label: string; value?: string; to?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="flex-1 text-[15px]">{label}</span>
      {value && <span className="text-[14px] text-muted">{value}</span>}
      {(to || onClick) && <ChevronRight className="h-5 w-5 text-faint" />}
    </>
  );
  const cls = "flex min-h-[52px] items-center gap-3 px-4 active:bg-white/5";
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (onClick) return <button onClick={onClick} className={`${cls} w-full text-left`}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

export default function Settings() {
  const navigate = useNavigate();
  const downloads = useLibrary((s) => s.downloads);
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const bytes = Object.values(downloads).reduce((s, m) => s + m.bytes, 0);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setQuota({ usage: e.usage ?? 0, quota: e.quota ?? 0 }), () => {});
    navigator.storage?.persisted?.().then(setPersisted, () => {});
  }, []);

  return (
    <div className="no-scrollbar h-full overflow-y-auto pb-10">
      <header className="pt-safe flex items-center gap-2 px-2 pb-2">
        <button aria-label="Back" onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[20px] font-bold">Settings</h1>
      </header>

      <h2 className="px-4 pb-1 pt-4 text-[13px] font-bold uppercase tracking-wider text-faint">Storage</h2>
      <Row label="Downloaded music" value={`${Object.keys(downloads).length} songs · ${formatBytes(bytes)}`} to="/downloads" />
      {quota && quota.quota > 0 && <Row label="Space available to the app" value={formatBytes(quota.quota - quota.usage)} />}
      {persisted !== null && (
        <Row label="Downloads protected from cleanup" value={persisted ? "Yes" : "Not yet — granted after your first download"} />
      )}

      <h2 className="px-4 pb-1 pt-6 text-[13px] font-bold uppercase tracking-wider text-faint">Spotify</h2>
      <Row label="Import a playlist" to="/import" />

      <h2 className="px-4 pb-1 pt-6 text-[13px] font-bold uppercase tracking-wider text-faint">About</h2>
      <Row label="Version" value={__APP_VERSION__} />
      <Row label="Music catalog" value="Audius (open, artist-uploaded)" />
      <p className="px-4 pt-6 text-[12px] leading-relaxed text-faint">
        DriveMusic streams from the Audius open music network. Songs you download are saved on this phone and play
        without a connection. Your library stays on this device.
      </p>
    </div>
  );
}
