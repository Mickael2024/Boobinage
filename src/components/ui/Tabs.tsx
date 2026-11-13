import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./Icon";
import { FOCUS_RING } from "./styles";

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  /** Compteur affiché après le libellé. */
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Nom accessible de la liste d'onglets. */
  label: string;
  /** Contenu de l'onglet actif (rendu dans le tabpanel). */
  children?: ReactNode;
  className?: string;
}

/** Onglets accessibles (tablist WAI-ARIA, flèches / Début / Fin) ; défilent horizontalement sur mobile. */
export function Tabs({ tabs, value, onChange, label, children, className = "" }: TabsProps) {
  const base = useId();
  const list = useRef<HTMLDivElement>(null);
  const tabId = (id: string) => `${base}-tab-${id}`;
  const index = Math.max(0, tabs.findIndex((t) => t.id === value));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const t = tabs[(next + tabs.length) % tabs.length];
    onChange(t.id);
    list.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(tabId(t.id))}`)?.focus();
  };

  return (
    <div className={className}>
      <div ref={list} role="tablist" aria-label={label} onKeyDown={onKeyDown} className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-line px-1">
        {tabs.map((t) => {
          const selected = t.id === value;
          return (
            <button
              key={t.id}
              id={tabId(t.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={children !== undefined ? `${base}-panel` : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(t.id)}
              className={`-mb-px inline-flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-[0.9rem] font-semibold whitespace-nowrap transition ${FOCUS_RING} ${selected ? "border-primary text-primary-dark" : "border-transparent text-ink-2 hover:border-line-strong hover:text-ink"}`}
            >
              {t.icon && <Icon name={t.icon} />}
              {t.label}
              {t.count !== undefined && <span className={`rounded-full px-2 py-0.5 font-mono text-[0.72rem] tabular-nums ${selected ? "bg-primary-soft text-primary-dark" : "bg-mist text-ink-2"}`}>{t.count}</span>}
            </button>
          );
        })}
      </div>
      {children !== undefined && (
        <div id={`${base}-panel`} role="tabpanel" aria-labelledby={tabId(tabs[index]?.id ?? "")} tabIndex={0} className="rounded-lg">
          {children}
        </div>
      )}
    </div>
  );
}
