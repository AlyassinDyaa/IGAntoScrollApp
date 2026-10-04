import Link from "next/link";

export function StatTile({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const body = (
    <div className="rounded-xl bg-ig-bg-secondary px-4 py-4 ring-1 ring-ig-separator-elevated">
      <p className="text-xs text-ig-text-secondary">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
