import { create } from "zustand";

interface ToastState {
  message: string | null;
  id: number;
}
const useToast = create<ToastState>(() => ({ message: null, id: 0 }));
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string) {
  clearTimeout(timer);
  useToast.setState((s) => ({ message, id: s.id + 1 }));
  timer = setTimeout(() => useToast.setState({ message: null }), 2400);
}

export function ToastHost() {
  const { message, id } = useToast();
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(140px+env(safe-area-inset-bottom))] z-[80] flex justify-center px-4">
      <div
        key={id}
        role="status"
        className="animate-fade-in rounded-lg bg-text px-4 py-2.5 text-sm font-semibold text-bg shadow-xl"
      >
        {message}
      </div>
    </div>
  );
}
