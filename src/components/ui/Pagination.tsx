import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { FOCUS_RING } from "./styles";

/** Numéros de page à afficher : 1 … 4 5 6 … 12 (null = ellipse). */
function pageList(page: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const set = new Set([1, count, page - 1, page, page + 1]);
  const pages = [...set].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  pages.forEach((p, i) => {
    if (i && p - pages[i - 1] > 1) out.push(p - pages[i - 1] === 2 ? p - 1 : null);
    out.push(p);
  });
  return out;
}

export interface PaginationProps {
  /** Page courante, à partir de 1. */
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  /** Texte d'état optionnel (ex. « 21–40 sur 134 »). */
  summary?: string;
  className?: string;
}

const btn = `inline-grid h-9 min-w-9 place-items-center rounded-lg border px-2.5 font-mono text-[0.85rem] font-semibold tabular-nums transition disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

/** Navigation entre pages (précédent / numéros / suivant) ; rien n'est rendu s'il n'y a qu'une page. */
export function Pagination({ page, pageCount, onChange, summary, className = "" }: PaginationProps) {
  if (pageCount <= 1) return summary ? <p className={`mt-4 text-[0.85rem] text-ink-2 ${className}`}>{summary}</p> : null;
  const go = (p: number) => p !== page && p >= 1 && p <= pageCount && onChange(p);
  return (
    <nav aria-label="Pagination" className={`mt-4 flex flex-wrap items-center justify-between gap-3 ${className}`}>
      {summary ? <p className="text-[0.85rem] text-ink-2">{summary}</p> : <span />}
      <ul className="flex flex-wrap items-center gap-1.5">
        <li>
          <button type="button" className={`${btn} border-line bg-white text-ink-2 hover:bg-mist`} onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Page précédente">
            <Icon name="chevron-left" className="text-xs" />
          </button>
        </li>
        {pageList(page, pageCount).map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-ink-3">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => go(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Page ${p}`}
                className={`${btn} ${p === page ? "border-primary-border bg-primary text-on-primary" : "border-line bg-white text-ink hover:bg-mist"}`}
              >
                {p}
              </button>
            </li>
          ),
        )}
        <li>
          <button type="button" className={`${btn} border-line bg-white text-ink-2 hover:bg-mist`} onClick={() => go(page + 1)} disabled={page >= pageCount} aria-label="Page suivante">
            <Icon name="chevron-right" className="text-xs" />
          </button>
        </li>
      </ul>
    </nav>
  );
}

/** Découpe une liste en pages ; la page revient à 1 quand la liste change de taille (filtre, recherche). */
export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => setPage(1), [items.length]);
  const current = Math.min(page, pageCount);
  const pageItems = useMemo(() => items.slice((current - 1) * pageSize, current * pageSize), [items, current, pageSize]);
  const from = items.length ? (current - 1) * pageSize + 1 : 0;
  const to = Math.min(current * pageSize, items.length);
  return { page: current, setPage, pageCount, pageItems, summary: `${from}–${to} sur ${items.length}` };
}
