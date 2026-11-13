import type { ReactNode } from "react";
import { TABLE, TABLE_WRAP, TH } from "./styles";

export interface Column<T> {
  key: string;
  /** Titre de colonne (en-tête du tableau, libellé dans les cartes mobiles). */
  header: string;
  render: (row: T, index: number) => ReactNode;
  /** Classes de la cellule <td> (ex. "font-mono whitespace-nowrap"). */
  className?: string;
  /** Masquée dans les cartes mobiles (< 640 px). */
  mobileHidden?: boolean;
  /** Dans les cartes mobiles : cellule pleine largeur, sans libellé (ex. actions). */
  mobileFull?: boolean;
}

export interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Contenu affiché si rows est vide. */
  empty?: ReactNode;
  /** Légende lue par les lecteurs d'écran. */
  caption?: string;
}

/** Tableau ≥ 640 px, cartes empilées en dessous (1re colonne visible = titre de la carte). */
export function ResponsiveTable<T>({ columns, rows, rowKey, empty = "Aucun élément", caption }: ResponsiveTableProps<T>) {
  const mobileCols = columns.filter((c) => !c.mobileHidden);
  const [titleCol, ...detailCols] = mobileCols;

  if (!rows.length) {
    return <div className={`${TABLE_WRAP} px-5 py-10 text-center text-ink-2`}>{empty}</div>;
  }

  return (
    <>
      <div className={`${TABLE_WRAP} hidden sm:block`}>
        <table className={TABLE}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={TH}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key} className={c.className}>
                    {c.render(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 sm:hidden" aria-label={caption}>
        {rows.map((row, i) => (
          <li key={rowKey(row)} className="rounded-xl border border-line bg-white p-4 shadow-xs">
            {titleCol && <div className="mb-3 min-w-0 border-b border-line-soft pb-3 font-semibold [overflow-wrap:anywhere] [&_small]:font-normal [&_small]:text-ink-2">{titleCol.render(row, i)}</div>}
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5 text-[0.9rem]">
              {detailCols.map((c) =>
                c.mobileFull ? (
                  <div key={c.key} className="col-span-2 mt-1">
                    <dt className="sr-only">{c.header}</dt>
                    <dd className="flex flex-wrap gap-2">{c.render(row, i)}</dd>
                  </div>
                ) : (
                  <div key={c.key} className="contents">
                    <dt className="text-[0.72rem] font-semibold tracking-[0.05em] text-ink-2 uppercase">{c.header}</dt>
                    <dd className={`min-w-0 text-right [overflow-wrap:anywhere] ${c.className ?? ""}`}>{c.render(row, i)}</dd>
                  </div>
                ),
              )}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
