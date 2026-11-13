import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, IconButton } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/Display";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import { ResponsiveTable } from "../../components/ui/ResponsiveTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { Select } from "../../components/ui/Select";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { Tabs } from "../../components/ui/Tabs";
import { useToast } from "../../components/ui/Toast";
import { getQuotes } from "../../lib/db";
import { formatDay, matchesSearch } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { formatMGA } from "../../lib/money";
import { printQuotePDF } from "../../lib/pdf";
import { Catalog } from "./Catalog";
import { QUOTE_FILTERS, quoteDisplayStatus, QuoteStatusBadge } from "./commerce";

export function Quotes() {
  const navigate = useNavigate();
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "catalog" ? "catalog" : "quotes";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const { data, loading, error } = useAsync(() => getQuotes());

  const quotes = useMemo(
    () => (data ?? []).filter((q) => (status === "all" || quoteDisplayStatus(q) === status) && matchesSearch(search, q.number, q.client?.name, q.client?.company, q.client?.phone, q.notes)),
    [data, status, search],
  );
  const pager = usePagination(quotes, 20);
  const pendingTotal = (data ?? []).filter((q) => quoteDisplayStatus(q) === "sent").reduce((s, q) => s + (q.totals?.ttc ?? 0), 0);

  return (
    <>
      <PageHeader title="Devis" icon="file-signature" subtitle={pendingTotal ? `${formatMGA(pendingTotal)} TTC en attente de réponse` : undefined}>
        <Button icon="plus" onClick={() => navigate("/admin/quotes/new")}>
          Nouveau devis
        </Button>
      </PageHeader>

      <Tabs
        label="Devis et catalogue"
        value={tab}
        onChange={(t) => setParams(t === "catalog" ? { tab: "catalog" } : {}, { replace: true })}
        tabs={[
          { id: "quotes", label: "Devis", icon: "file-signature", count: data?.length },
          { id: "catalog", label: "Catalogue de prestations", icon: "tags" },
        ]}
      >
        {tab === "catalog" ? (
          <Catalog />
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput inline value={search} onChange={setSearch} placeholder="N°, client, société…" />
              <Select inline aria-label="Filtrer par statut" value={status} onChange={setStatus} options={QUOTE_FILTERS} />
            </div>
            {loading && !data ? (
              <SkeletonRows />
            ) : error && !data ? (
              <p className="py-10 text-center text-ink-2">Erreur de chargement des devis</p>
            ) : (
              <>
                <ResponsiveTable
                  caption="Liste des devis"
                  rows={pager.pageItems}
                  rowKey={(q) => q.id}
                  empty={search || status !== "all" ? "Aucun devis ne correspond" : "Aucun devis pour le moment"}
                  columns={[
                    { key: "number", header: "N°", className: "font-mono whitespace-nowrap", render: (q) => <strong>{q.number}</strong> },
                    {
                      key: "client",
                      header: "Client",
                      render: (q) => (
                        <>
                          {q.client?.name || "-"}
                          {q.client?.company && (
                            <>
                              <br />
                              <small>{q.client.company}</small>
                            </>
                          )}
                        </>
                      ),
                    },
                    { key: "date", header: "Date", className: "font-mono", mobileHidden: true, render: (q) => formatDay(q.createdAt) },
                    { key: "valid", header: "Validité", className: "font-mono", render: (q) => formatDay(q.validUntil) },
                    { key: "ttc", header: "Total TTC", className: "font-mono whitespace-nowrap tabular-nums text-right", render: (q) => formatMGA(q.totals?.ttc) },
                    { key: "status", header: "Statut", render: (q) => <QuoteStatusBadge quote={q} /> },
                    {
                      key: "actions",
                      header: "Actions",
                      mobileFull: true,
                      render: (q) => (
                        <div className="flex gap-1.5">
                          <IconButton icon="eye" label={`Ouvrir le devis ${q.number}`} onClick={() => navigate(`/admin/quotes/${q.id}`)} />
                          <IconButton
                            icon="file-pdf"
                            label={`PDF du devis ${q.number}`}
                            onClick={async () => {
                              await printQuotePDF(q);
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
        )}
      </Tabs>
    </>
  );
}
