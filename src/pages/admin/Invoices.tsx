import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, IconButton } from "../../components/ui/Button";
import { PageHeader, StatCard, StatGrid } from "../../components/ui/Display";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import { ResponsiveTable } from "../../components/ui/ResponsiveTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { Select } from "../../components/ui/Select";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { getInvoices, getPayments } from "../../lib/db";
import { formatDay, matchesSearch } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { formatMGA, isOverdue, remainingDue } from "../../lib/money";
import { printInvoicePDF } from "../../lib/pdf";
import { docTypeLabel, exportInvoicesCSV, exportPaymentsCSV, INVOICE_FILTERS, invoiceLabel, invoiceMatchesFilter, InvoiceStatusBadge, isUnpaid } from "./commerce";

const TYPES = [
  { value: "all", label: "Factures et avoirs" },
  { value: "invoice", label: "Factures" },
  { value: "credit_note", label: "Avoirs" },
];

export function Invoices() {
  const navigate = useNavigate();
  const notify = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const { data, loading, error } = useAsync(() => getInvoices());
  const all = data ?? [];

  const invoices = useMemo(
    () => all.filter((i) => (type === "all" || i.type === type) && invoiceMatchesFilter(i, status) && matchesSearch(search, i.number, i.client?.name, i.client?.company, i.client?.nif, i.notes)),
    [all, type, status, search],
  );
  const pager = usePagination(invoices, 20);
  const unpaid = all.filter(isUnpaid);
  const overdue = unpaid.filter((i) => isOverdue(i));

  return (
    <>
      <PageHeader title="Factures" icon="file-invoice-dollar">
        <Button
          variant="secondary"
          icon="file-csv"
          onClick={() => {
            if (!all.some((i) => i.status !== "draft")) return notify("Aucune facture émise à exporter", "warning");
            exportInvoicesCSV(all);
          }}
        >
          Export factures
        </Button>
        <Button
          variant="secondary"
          icon="file-csv"
          onClick={async () => {
            const payments = await getPayments();
            if (!payments.length) return notify("Aucun paiement à exporter", "warning");
            exportPaymentsCSV(payments, all);
          }}
        >
          Export paiements
        </Button>
        <Button icon="plus" onClick={() => navigate("/admin/invoices/new")}>
          Nouvelle facture
        </Button>
      </PageHeader>

      <StatGrid cols={3}>
        <StatCard icon="hand-holding-usd" value={formatMGA(unpaid.reduce((s, i) => s + remainingDue(i), 0))} label="Reste à encaisser" tone="warning" onClick={() => setStatus("unpaid")} />
        <StatCard icon="exclamation-triangle" value={overdue.length} label="Factures en retard" tone="warning" onClick={() => setStatus("overdue")} />
        <StatCard icon="file-alt" value={all.filter((i) => i.status === "draft").length} label="Brouillons" onClick={() => setStatus("draft")} />
      </StatGrid>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput inline value={search} onChange={setSearch} placeholder="N°, client, NIF…" />
        <Select inline aria-label="Filtrer par statut" value={status} onChange={setStatus} options={INVOICE_FILTERS} />
        <Select inline aria-label="Filtrer par type" value={type} onChange={setType} options={TYPES} />
      </div>

      {loading && !data ? (
        <SkeletonRows />
      ) : error && !data ? (
        <p className="py-10 text-center text-ink-2">Erreur de chargement des factures</p>
      ) : (
        <>
          <ResponsiveTable
            caption="Liste des factures"
            rows={pager.pageItems}
            rowKey={(i) => i.id}
            empty={search || status !== "all" || type !== "all" ? "Aucune facture ne correspond" : "Aucune facture pour le moment"}
            columns={[
              {
                key: "number",
                header: "N°",
                className: "font-mono whitespace-nowrap",
                render: (i) => (
                  <>
                    <strong>{invoiceLabel(i)}</strong>
                    {i.type === "credit_note" && (
                      <>
                        <br />
                        <small>{docTypeLabel(i)}</small>
                      </>
                    )}
                  </>
                ),
              },
              {
                key: "client",
                header: "Client",
                render: (i) => (
                  <>
                    {i.client?.name || "-"}
                    {i.client?.company && (
                      <>
                        <br />
                        <small>{i.client.company}</small>
                      </>
                    )}
                  </>
                ),
              },
              { key: "issued", header: "Émise le", className: "font-mono", mobileHidden: true, render: (i) => formatDay(i.issuedAt) },
              { key: "due", header: "Échéance", className: "font-mono", render: (i) => (i.type === "credit_note" ? "-" : formatDay(i.dueDate)) },
              { key: "ttc", header: "Total TTC", className: "font-mono whitespace-nowrap tabular-nums text-right", render: (i) => `${i.type === "credit_note" ? "-" : ""}${formatMGA(i.totals?.ttc)}` },
              { key: "rest", header: "Reste dû", className: "font-mono whitespace-nowrap tabular-nums text-right", render: (i) => (isUnpaid(i) ? formatMGA(remainingDue(i)) : "-") },
              { key: "status", header: "Statut", render: (i) => <InvoiceStatusBadge invoice={i} /> },
              {
                key: "actions",
                header: "Actions",
                mobileFull: true,
                render: (i) => (
                  <div className="flex gap-1.5">
                    <IconButton icon="eye" label={`Ouvrir ${invoiceLabel(i)}`} onClick={() => navigate(`/admin/invoices/${i.id}`)} />
                    <IconButton
                      icon="file-pdf"
                      label={`PDF ${invoiceLabel(i)}`}
                      onClick={async () => {
                        await printInvoicePDF(i, { originNumber: i.creditOf ? (all.find((x) => x.id === i.creditOf)?.number ?? undefined) : undefined });
                        notify("PDF généré", "success");
                      }}
                    />
                  </div>
                ),
              },
            ]}
          />
          <Pagination page={pager.page} pageCount={pager.pageCount} onChange={pager.setPage} summary={pager.summary} />
        </>
      )}
    </>
  );
}
