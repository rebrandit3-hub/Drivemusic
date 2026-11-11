import { Link } from "react-router-dom";
import { Cover } from "./Cover";

export function Shelf({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-end justify-between px-4">
        <h2 className="text-[21px] font-bold tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="no-scrollbar flex snap-x gap-3.5 overflow-x-auto scroll-px-4 px-4 pb-1">{children}</div>
    </section>
  );
}

interface CardProps {
  title: string;
  subtitle?: string;
  artwork?: string;
  seed: string;
  to?: string;
  onClick?: () => void;
  round?: boolean;
}

export function Card({ title, subtitle, artwork, seed, to, onClick, round }: CardProps) {
  const body = (
    <>
      <Cover
        src={artwork}
        seed={seed}
        className="aspect-square w-full shadow-lg shadow-black/40"
        rounded={round ? "rounded-full" : "rounded-md"}
      />
      <p className={`mt-2 line-clamp-2 text-[13px] font-semibold leading-tight ${round ? "text-center" : ""}`}>{title}</p>
      {subtitle && <p className={`mt-0.5 truncate text-[12px] text-muted ${round ? "text-center" : ""}`}>{subtitle}</p>}
    </>
  );
  const cls = "block w-[140px] shrink-0 snap-start text-left active:opacity-80";
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {body}
    </button>
  );
}
