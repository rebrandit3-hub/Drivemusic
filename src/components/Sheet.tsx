import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label: string;
}

/** Bottom sheet for menus: tap outside or swipe-free close button. */
export function Sheet({ open, onClose, children, label }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-label={label}>
      <button aria-label="Close" className="animate-fade-in absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="animate-sheet-up pb-safe relative max-h-[85dvh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl bg-elevated">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/25" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function SheetItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 px-5 py-3.5 text-left text-[15px] font-medium active:bg-white/5 ${danger ? "text-danger" : "text-text"}`}
    >
      <span className="text-muted [&>svg]:h-6 [&>svg]:w-6">{icon}</span>
      {label}
    </button>
  );
}
