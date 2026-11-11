import { useState } from "react";
import { Music2 } from "lucide-react";
import { cn, hueFor } from "@/lib/ui";

interface Props {
  src?: string;
  seed: string;
  className?: string;
  rounded?: string;
  icon?: React.ReactNode;
}

export function Cover({ src, seed, className, rounded = "rounded-md", icon }: Props) {
  const [failed, setFailed] = useState(false);
  const h = hueFor(seed);
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden bg-elevated", rounded, className)}
      style={
        !src || failed
          ? { background: `linear-gradient(135deg, hsl(${h} 55% 42%), hsl(${(h + 40) % 360} 50% 18%))` }
          : undefined
      }
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/80">
          {icon ?? <Music2 className="h-1/3 w-1/3" />}
        </div>
      )}
    </div>
  );
}
