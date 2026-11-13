import { Badge, type BadgeTone } from "../../components/ui/Display";
import { csvDate, downloadCSV } from "../../lib/csv";
import { INVOICE_STATUS_LABELS, invoiceDisplayStatus, PAYMENT_METHOD_LABELS, QUOTE_STATUS_LABELS, remainingDue } from "../../lib/money";
import type { Invoice, InvoiceStatus, Payment, PaymentMethod, Quote, QuoteStatus } from "../../lib/types";

// Éléments partagés des écrans commerciaux (devis, factures, paiements).

/** Un devis brouillon / envoyé dont la validité est dépassée est affiché « expiré ». */
export function quoteDisplayStatus(q: Pick<Quote, "status" | "validUntil">): QuoteStatus {
  if ((q.status === "draft" || q.status === "sent") && q.validUntil) {
    const d = new Date(q.validUntil);
    d.setHours(23, 59, 59, 999);
    if (d.getTime() < Date.now()) return "expired";
  }
  return q.status;
}

const QUOTE_TONE: Record<QuoteStatus, BadgeTone> = { draft: "neutral", sent: "info", accepted: "success", refused: "danger", expired: "warning" };
const INVOICE_TONE: Record<InvoiceStatus | "overdue", BadgeTone> = { draft: "neutral", issued: "info", partially_paid: "warning", paid: "success", cancelled: "neutral", overdue: "danger" };

export function QuoteStatusBadge({ quote }: { quote: Pick<Quote, "status" | "validUntil"> }) {
  const s = quoteDisplayStatus(quote);
  return <Badge tone={QUOTE_TONE[s]}>{QUOTE_STATUS_LABELS[s]}</Badge>;
}

export function InvoiceStatusBadge({ invoice }: { invoice: Pick<Invoice, "status" | "dueDate" | "type"> }) {
  const s = invoice.type === "credit_note" && invoice.status !== "draft" && invoice.status !== "cancelled" ? "issued" : invoiceDisplayStatus(invoice);
  return <Badge tone={INVOICE_TONE[s]}>{invoice.type === "credit_note" && s === "issued" ? "Émis" : INVOICE_STATUS_LABELS[s]}</Badge>;
}

export const invoiceLabel = (inv: Pick<Invoice, "number" | "type">) => inv.number ?? (inv.type === "credit_note" ? "Avoir (brouillon)" : "Brouillon");
export const docTypeLabel = (inv: Pick<Invoice, "type">) => (inv.type === "credit_note" ? "Avoir" : "Facture");

export const QUOTE_FILTERS = [{ value: "all", label: "Tous les statuts" }, ...(Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]).map((s) => ({ value: s, label: QUOTE_STATUS_LABELS[s] }))];
export const INVOICE_FILTERS = [
  { value: "all", label: "Tous les statuts" },
  { value: "unpaid", label: "Impayées (reste dû)" },
  ...(["draft", "issued", "partially_paid", "paid", "overdue", "cancelled"] as const).map((s) => ({ value: s, label: INVOICE_STATUS_LABELS[s] })),
];
export const PAYMENT_METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }));

/** Facture émise attendant encore un règlement. */
export const isUnpaid = (inv: Invoice) => inv.type !== "credit_note" && (inv.status === "issued" || inv.status === "partially_paid") && remainingDue(inv) > 0;

/** Filtre de statut des listes de factures. */
export function invoiceMatchesFilter(inv: Invoice, filter: string) {
  if (filter === "all") return true;
  if (filter === "unpaid") return isUnpaid(inv);
  return invoiceDisplayStatus(inv) === filter;
}

// === Exports CSV ===
export function exportInvoicesCSV(invoices: Invoice[]) {
  const issued = invoices.filter((i) => i.status !== "draft");
  downloadCSV(
    `factures_${new Date().toISOString().slice(0, 10)}.csv`,
    ["Type", "Numéro", "Date d'émission", "Échéance", "Client", "Société", "NIF client", "Total HT", "TVA", "Total TTC", "Encaissé", "Reste dû", "Statut", "Facture d'origine"],
    issued.map((i) => {
      const sign = i.type === "credit_note" ? -1 : 1;
      const origin = i.creditOf ? invoices.find((x) => x.id === i.creditOf)?.number : "";
      return [
        docTypeLabel(i),
        i.number,
        csvDate(i.issuedAt),
        csvDate(i.dueDate),
        i.client?.name,
        i.client?.company,
        i.client?.nif,
        sign * (i.totals?.ht ?? 0),
        sign * (i.totals?.vat ?? 0),
        sign * (i.totals?.ttc ?? 0),
        i.amountPaid || 0,
        i.type === "credit_note" ? 0 : remainingDue(i),
        i.type === "credit_note" ? "Avoir" : INVOICE_STATUS_LABELS[invoiceDisplayStatus(i)],
        origin,
      ];
    }),
  );
}

export function exportPaymentsCSV(payments: Payment[], invoices: Invoice[]) {
  const byId = new Map(invoices.map((i) => [i.id, i]));
  downloadCSV(
    `paiements_${new Date().toISOString().slice(0, 10)}.csv`,
    ["Date", "Facture", "Client", "Montant", "Moyen", "Référence", "Note"],
    payments.map((p) => {
      const inv = byId.get(p.invoiceId);
      return [csvDate(p.date), inv?.number, inv?.client?.name, p.amount, PAYMENT_METHOD_LABELS[p.method] ?? p.method, p.reference, p.note];
    }),
  );
}
