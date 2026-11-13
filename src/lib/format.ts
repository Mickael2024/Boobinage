import type { DateValue, FaultCategory, FaultMotorScope, MessageStatus, Motor, MotorPriority, MotorStatus, ReportStatus } from "./types";

export { formatMGA, amountInWordsMGA } from "./money";

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

/** Date de fin d'un moteur terminé : completedAt, sinon dernière mise à jour (anciens moteurs). */
export const motorEndDate = (m: Motor) => toDate(m.completedAt) ?? (m.status === "completed" ? toDate(m.updatedAt) : null);

/** Durée de réparation en jours, ou null si les dates manquent. */
export function motorDurationDays(m: Motor) {
  const start = toDate(m.createdAt);
  const end = motorEndDate(m);
  return start && end ? Math.ceil((end.getTime() - start.getTime()) / DAY_MS) : null;
}

export const STATUS_LABELS: Record<MotorStatus, string> = { pending: "En attente", in_progress: "En cours", completed: "Terminé" };

export const PRIORITY_LABELS: Record<MotorPriority, string> = { low: "Basse", normal: "Normale", high: "Haute", urgent: "Urgente" };

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

// === Recherche ===
/** Minuscules sans accents (recherche tolérante). */
export const normalizeText = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Vrai si tous les mots de la recherche apparaissent dans l'un des champs. */
export function matchesSearch(search: string, ...fields: unknown[]) {
  const words = normalizeText(search).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = normalizeText(fields.filter((f) => f !== undefined && f !== null).join(" "));
  return words.every((w) => hay.includes(w));
}

// === Dates des champs <input type="date"> (AAAA-MM-JJ, heure locale) ===
export function toInputDate(d: DateValue) {
  const date = toDate(d);
  if (!date) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
/** « 2026-11-13 » → ISO à midi (évite les décalages de fuseau) ; vide → "". */
export const fromInputDate = (v: string) => (v ? new Date(`${v}T12:00:00`).toISOString() : "");

/** Même mois civil que `ref`. */
export function sameMonth(d: DateValue, ref = new Date()) {
  const date = toDate(d);
  return !!date && date.getMonth() === ref.getMonth() && date.getFullYear() === ref.getFullYear();
}

// === Moteurs ===
/** Au moins une étape complétée non validée, ou demande explicite du technicien. */
export const awaitingValidation = (m: Pick<Motor, "steps" | "validationRequestedAt">) => !!m.validationRequestedAt || !!m.steps?.some((s) => s.completed && !s.validated);

/** Date promise dépassée et moteur non terminé. */
export function isMotorLate(m: Pick<Motor, "promisedAt" | "status">, today = new Date()) {
  if (m.status === "completed" || !m.promisedAt) return false;
  const d = toDate(m.promisedAt);
  if (!d) return false;
  d.setHours(23, 59, 59, 999);
  return d.getTime() < today.getTime();
}

/** Libellé court d'un moteur : « OR-2026-0004 · Rakoto ». */
export const motorRef = (m: Pick<Motor, "orNumber" | "clientName" | "id">) => [m.orNumber, m.clientName].filter(Boolean).join(" · ") || m.id;
