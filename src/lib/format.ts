import type { DateValue, FaultCategory, FaultMotorScope, MessageStatus, Motor, MotorStatus, ReportStatus } from "./types";

export function toDate(d: DateValue): Date | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d.toDate();
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(d: DateValue) {
  const date = toDate(d);
  return date
    ? date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";
}

export function formatDay(d: DateValue) {
  return toDate(d)?.toLocaleDateString("fr-FR") ?? "-";
}

const DAY_MS = 1000 * 60 * 60 * 24;

/** Date de fin d'un moteur terminé (dernière mise à jour, comme dans l'ancienne version). */
export const motorEndDate = (m: Motor) => toDate(m.updatedAt || m.completedAt);

/** Durée de réparation en jours, ou null si les dates manquent. */
export function motorDurationDays(m: Motor) {
  const start = toDate(m.createdAt);
  const end = motorEndDate(m);
  return start && end ? Math.ceil((end.getTime() - start.getTime()) / DAY_MS) : null;
}

export const STATUS_LABELS: Record<MotorStatus, string> = { pending: "En attente", in_progress: "En cours", completed: "Terminé" };

export const FAULT_CATEGORIES: Record<FaultCategory, string> = {
  electrical: "Électrique",
  mechanical: "Mécanique",
  thermal: "Thermique",
  insulation: "Isolation / bobinage",
  other: "Autre",
};

export const FAULT_MOTOR_LABELS: Record<FaultMotorScope, string> = { all: "Tous les moteurs", three_phase: "Triphasé", single_phase: "Monophasé" };

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = { unread: "Non lu", read: "Lu", approved: "Approuvé" };

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = { new: "Nouveau", read: "Lu", replied: "Répondu", archived: "Archivé" };

/** Libellé du type de moteur ("Autre" => texte saisi par le technicien). */
export function motorTypeLabel(m: Pick<Motor, "motorType" | "motorTypeCustom"> | undefined, short = false) {
  if (m?.motorType === "three_phase") return short ? "Tri" : "Triphasé";
  if (m?.motorType === "single_phase") return short ? "Mono" : "Monophasé";
  return m?.motorTypeCustom || "Autre";
}

export function couplingLabel(c?: string) {
  return c === "star" ? "Étoile" : c === "delta" ? "Triangle" : "-";
}

export const dash = (v?: string | number | null) => (v === undefined || v === null || v === "" ? "-" : String(v));

export function plural(n: number, singular: string, pluralForm = singular + "s") {
  return n > 1 ? pluralForm : singular;
}
