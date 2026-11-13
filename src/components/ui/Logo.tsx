/** Monogramme « JE » de Jeff Elec (même dessin que public/favicon.svg) ; size en px. */
export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={`shrink-0 ${className}`}>
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <g className="fill-on-primary">
        <path d="M22 16h6v22a10 10 0 0 1-10 10h-4v-6h4a4 4 0 0 0 4-4z" />
        <path d="M34 16h16v6H40v7h8v6h-8v7h10v6H34z" />
      </g>
    </svg>
  );
}
