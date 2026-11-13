import type { DocumentLine, Invoice, InvoiceStatus, PaymentMethod, QuoteStatus, Totals } from "./types";

// Montants en Ariary (MGA) : entiers, pas de centimes.

export const DEFAULT_VAT_RATE = 20;

const toInt = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v) : 0;
};

/** Total HT d'une ligne, remise déduite, arrondi à l'ariary. */
export function lineTotal(line: Pick<DocumentLine, "qty" | "unitPrice" | "discountPct">) {
  const qty = Number(line.qty) || 0;
  const discount = Math.min(100, Math.max(0, Number(line.discountPct) || 0));
  return Math.round(qty * toInt(line.unitPrice) * (1 - discount / 100));
}

/** Totaux HT / TVA / TTC (TVA calculée sur le total HT, arrondie à l'ariary). */
export function computeTotals(lines: DocumentLine[], vatRate: number = DEFAULT_VAT_RATE): Totals {
  const ht = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const vat = Math.round((ht * (Number(vatRate) || 0)) / 100);
  return { ht, vat, ttc: ht + vat };
}

const NUMBER_FORMAT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * « 1 250 000 Ar ». `plain: true` remplace les espaces insécables par des espaces simples
 * (polices standard de jsPDF qui ne connaissent pas U+202F).
 */
export function formatMGA(amount: number | null | undefined, { plain = false } = {}) {
  const s = `${NUMBER_FORMAT.format(toInt(amount))} Ar`;
  return plain ? s.replace(/[  ]/g, " ") : s;
}

/** Saisie utilisateur → entier (accepte espaces, « Ar », virgule décimale). */
export function parseMGA(input: string) {
  const cleaned = input.replace(/[\s  ]|ar/gi, "").replace(",", ".");
  return toInt(cleaned);
}

// === Montant en lettres (orthographe traditionnelle) ===
const UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const TENS = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];

function below100(n: number): string {
  if (n < 17) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7) return u === 1 ? "soixante et onze" : `soixante-${below100(10 + u)}`;
  if (t === 8) return u === 0 ? "quatre-vingts" : `quatre-vingt-${UNITS[u]}`;
  if (t === 9) return `quatre-vingt-${below100(10 + u)}`;
  if (u === 0) return TENS[t];
  return u === 1 ? `${TENS[t]} et un` : `${TENS[t]}-${UNITS[u]}`;
}

/** `final` : le groupe termine le nombre ou précède « million(s) » / « milliard(s) » (accord de cent / vingt). */
function below1000(n: number, final: boolean): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let s: string;
  if (h === 0) s = below100(r);
  else if (h === 1) s = r ? `cent ${below100(r)}` : "cent";
  else s = r ? `${UNITS[h]} cent ${below100(r)}` : `${UNITS[h]} cent${final ? "s" : ""}`;
  // « quatre-vingts » perd son s devant « mille »
  return !final && s.endsWith("quatre-vingts") ? s.slice(0, -1) : s;
}

function numberToWords(n: number): string {
  if (n === 0) return UNITS[0];
  const parts: string[] = [];
  const billions = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const thousands = Math.floor((n % 1e6) / 1e3);
  const rest = n % 1e3;
  if (billions) parts.push(`${billions >= 1000 ? numberToWords(billions) : below1000(billions, true)} milliard${billions > 1 ? "s" : ""}`);
  if (millions) parts.push(`${below1000(millions, true)} million${millions > 1 ? "s" : ""}`);
  if (thousands) parts.push(thousands === 1 ? "mille" : `${below1000(thousands, false)} mille`);
  if (rest) parts.push(below1000(rest, true));
  return parts.join(" ");
}

/** 324000 → « trois cent vingt-quatre mille ariary » ; 2000000 → « deux millions d'ariary ». */
export function amountInWordsMGA(amount: number, { capitalize = false } = {}) {
  const n = toInt(amount);
  const number = numberToWords(Math.abs(n));
  // « deux millions d'ariary » mais « deux millions cinq cent mille ariary »
  const unit = /(million|milliard)s?$/.test(number) ? "d'ariary" : "ariary";
  const words = `${n < 0 ? "moins " : ""}${number} ${unit}`;
  return capitalize ? words.charAt(0).toUpperCase() + words.slice(1) : words;
}

// === Factures ===
/** Reste à payer = TTC − encaissé − avoirs émis. */
export const remainingDue = (inv: Pick<Invoice, "totals" | "amountPaid" | "creditedAmount">) =>
  Math.max(0, toInt(inv.totals?.ttc) - toInt(inv.amountPaid) - toInt(inv.creditedAmount));

/** Facture émise, non soldée, échéance dépassée. */
export function isOverdue(inv: Pick<Invoice, "status" | "dueDate">, today = new Date()) {
  if (inv.status !== "issued" && inv.status !== "partially_paid") return false;
  const due = new Date(inv.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due.getTime() < today.getTime();
}

/** Statut affiché : « en retard » est calculé, jamais stocké. */
export const invoiceDisplayStatus = (inv: Pick<Invoice, "status" | "dueDate">): InvoiceStatus | "overdue" => (isOverdue(inv) ? "overdue" : inv.status);

/** Statut d'après le montant encaissé. */
export function paymentStatus(ttc: number, amountPaid: number, credited = 0): InvoiceStatus {
  if (amountPaid > 0 && amountPaid + credited >= ttc) return "paid";
  return amountPaid > 0 ? "partially_paid" : "issued";
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  refused: "Refusé",
  expired: "Expiré",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus | "overdue", string> = {
  draft: "Brouillon",
  issued: "Émise",
  partially_paid: "Partiellement payée",
  paid: "Payée",
  cancelled: "Annulée",
  overdue: "En retard",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  transfer: "Virement",
  check: "Chèque",
  mvola: "MVola",
  orange_money: "Orange Money",
  airtel_money: "Airtel Money",
};
