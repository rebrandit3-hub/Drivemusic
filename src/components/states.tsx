import { RefreshCw } from "lucide-react";

export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <span
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-white/20 border-t-mint ${className}`}
    />
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      )}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="h-12 w-12 animate-pulse rounded bg-elevated" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-elevated" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-elevated" />
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-8 py-14 text-center">
      <div className="mb-2 text-faint [&>svg]:h-12 [&>svg]:w-12">{icon}</div>
      <p className="text-lg font-bold">{title}</p>
      <p className="text-sm text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
