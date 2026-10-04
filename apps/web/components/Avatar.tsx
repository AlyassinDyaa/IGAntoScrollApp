import Image from "next/image";
import type { AccountAccent } from "@ig-focus-hub/shared";
import { initials } from "@/lib/format";
import { ACCENT_CLASS } from "@/lib/accounts";

interface Props {
  name: string;
  src?: string | null;
  size?: number;
  accent?: AccountAccent | null;
  /** Gradient story ring, used for unread. */
  ring?: boolean;
  className?: string;
}

export function Avatar({ name, src, size = 56, accent, ring = false, className = "" }: Props) {
  const inner = src ? (
    <Image src={src} alt="" width={size} height={size} className="size-full rounded-full object-cover" unoptimized />
  ) : (
    <span className={`flex size-full items-center justify-center rounded-full font-semibold text-white ${accent ? ACCENT_CLASS[accent] : "bg-ig-bg-highlight text-ig-text"}`} style={{ fontSize: Math.max(11, Math.round(size * 0.36)) }}>
      {initials(name)}
    </span>
  );
  if (ring) {
    return (
      <span className={`ig-ring inline-block shrink-0 ${className}`} style={{ width: size + 8, height: size + 8 }}>
        <span className="block size-full overflow-hidden">{inner}</span>
      </span>
    );
  }
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-full ${className}`} style={{ width: size, height: size }}>
      {inner}
    </span>
  );
}
