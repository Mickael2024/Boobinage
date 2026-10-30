import type { ReactNode } from "react";
import type { MotorStatus } from "../../lib/types";
import { STATUS_LABELS } from "../../lib/format";
import { Icon } from "./Icon";

type BadgeTone = "neutral" | "success" | "warning" | "info";
const BADGE: Record<BadgeTone, string> = {
  neutral: "border-line bg-mist text-ink-2",
  success: "border-transparent bg-success-soft text-success-dark",
  warning: "border-transparent bg-warning-soft text-warning-dark",
  info: "border-transparent bg-primary-soft text-[#c96f17]",
};

export function Badge({ tone = "neutral", icon, children }: { tone?: BadgeTone; icon?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.72rem] font-semibold tracking-[0.02em] whitespace-nowrap ${BADGE[tone]}`}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<MotorStatus, string> = {
  pending: "border border-line bg-mist text-[#4c5157]",
  in_progress: "bg-primary-soft text-[#c96f17]",
  completed: "bg-success-soft text-success-dark",
};

/** Pastille de statut d'un moteur (ou d'un compte : "completed" = approuvé). */
export function StatusPill({ status, label }: { status: MotorStatus; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.72rem] font-semibold tracking-[0.02em] whitespace-nowrap before:size-1.5 before:rounded-full before:bg-current ${STATUS_TONE[status] ?? STATUS_TONE.pending}`}>
      {label ?? STATUS_LABELS[status] ?? status}
    </span>
  );
}

type StatTone = "primary" | "warning" | "success";
const STAT: Record<StatTone, { bar: string; icon: string }> = {
  primary: { bar: "after:bg-primary", icon: "bg-primary-soft text-primary" },
  warning: { bar: "after:bg-warning", icon: "bg-warning-soft text-[#b56d1c]" },
  success: { bar: "after:bg-success", icon: "bg-success-soft text-success-dark" },
};

export function StatCard({ icon, value, label, tone = "primary", onClick }: { icon: string; value: ReactNode; label: string; tone?: StatTone; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`relative grid grid-cols-[auto_1fr] grid-rows-[auto_auto] items-center gap-x-4 overflow-hidden rounded-xl border border-line bg-white p-5 text-left shadow-xs transition after:absolute after:top-4 after:bottom-4 after:left-0 after:w-[3px] after:rounded-r after:content-[''] ${STAT[tone].bar} ${onClick ? "hover:-translate-y-[3px] hover:shadow-card" : ""}`}
    >
      <span className={`row-span-2 grid size-[52px] place-items-center rounded-[14px] text-[22px] ${STAT[tone].icon}`}>
        <Icon name={icon} />
      </span>
      <span className="self-end font-mono text-[1.9rem] leading-[1.1] font-semibold tracking-[-0.01em] tabular-nums">{value}</span>
      <span className="self-start text-[0.72rem] font-semibold tracking-[0.05em] text-ink-2 uppercase">{label}</span>
    </Tag>
  );
}

export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 }) {
  return <div className={`mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 ${cols === 4 ? "xl:grid-cols-4" : "lg:grid-cols-3"}`}>{children}</div>;
}

/** En-tête de page : titre, sous-titre, actions. */
export function PageHeader({ title, subtitle, icon, children }: { title: ReactNode; subtitle?: ReactNode; icon?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg text-primary">
            <Icon name={icon} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[1.45rem] font-bold sm:text-[1.6rem]">{title}</h2>
          {subtitle && <p className="text-[0.95rem] text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap gap-3 [&>*]:flex-1 md:[&>*]:flex-none">{children}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-ink-2">{children}</p>;
}

export function Loading() {
  return (
    <div className="grid place-items-center py-16" role="status" aria-label="Chargement">
      <span className="size-9 animate-spin rounded-full border-3 border-line border-t-primary" />
    </div>
  );
}

/** Tableau de données ; th/td stylés via sélecteurs descendants. */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-xs">
      <table className="w-full border-collapse text-left text-[0.92rem] [&_td]:border-b [&_td]:border-[#eceae2] [&_td]:px-3.5 [&_td]:py-3 [&_td]:align-middle md:[&_td]:px-[18px] md:[&_td]:py-4 [&_td_small]:text-ink-2 [&_tbody_tr:hover_td]:bg-[#fbfaf5] [&_tbody_tr:last-child_td]:border-b-0">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="sticky top-0 border-b-2 border-line-strong bg-[#f7f5ef] px-3.5 py-3.5 text-[0.72rem] font-bold tracking-[0.06em] whitespace-nowrap text-ink-2 uppercase md:px-[18px]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Liste clé / valeur encadrée. */
export function DetailList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-line px-4 py-3 text-[0.9rem] not-first:border-t">
          <span className="text-ink-2">{k}</span>
          <strong className="text-right font-semibold [overflow-wrap:anywhere]">{v}</strong>
        </div>
      ))}
    </div>
  );
}

export function BackButton({ onClick, children = "RETOUR" }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-[10px] border border-line-strong bg-white px-4 py-2 text-sm font-semibold text-ink shadow-xs transition hover:bg-mist">
      <Icon name="arrow-left" />
      <span>{children}</span>
    </button>
  );
}
