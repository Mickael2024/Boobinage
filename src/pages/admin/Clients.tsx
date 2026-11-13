import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, IconButton } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/Display";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import { ResponsiveTable } from "../../components/ui/ResponsiveTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { getClients, getInvoices } from "../../lib/db";
import { matchesSearch } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { formatMGA, remainingDue } from "../../lib/money";
import type { Client } from "../../lib/types";
import { ClientFormModal } from "../shared/ClientFormModal";
import { isUnpaid } from "./commerce";

export function Clients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [onlyDue, setOnlyDue] = useState(false);
  const [edit, setEdit] = useState<{ open: boolean; client?: Client }>({ open: false });
  const { data, loading, error, reload } = useAsync(async () => {
    const [clients, invoices] = await Promise.all([getClients(), getInvoices()]);
    const balance = new Map<string, number>();
    for (const inv of invoices.filter(isUnpaid)) balance.set(inv.clientId, (balance.get(inv.clientId) ?? 0) + remainingDue(inv));
    return { clients, balance };
  });

  const rows = useMemo(
    () => (data?.clients ?? []).filter((c) => (!onlyDue || (data?.balance.get(c.id) ?? 0) > 0) && matchesSearch(search, c.name, c.company, c.phone, c.email, c.nif, c.stat, c.address)),
    [data, search, onlyDue],
  );
  const pager = usePagination(rows, 20);

  return (
    <>
      <PageHeader title="Clients" icon="address-book" subtitle={data ? `${data.clients.length} fiche${data.clients.length > 1 ? "s" : ""} client` : undefined}>
        <Button icon="user-plus" onClick={() => setEdit({ open: true })}>
          Nouveau client
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput inline value={search} onChange={setSearch} placeholder="Nom, société, téléphone, NIF…" />
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-[0.9rem] text-ink-2">
          <input type="checkbox" className="size-[18px] accent-primary" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} />
          Avec solde dû uniquement
        </label>
      </div>

      {loading && !data ? (
        <SkeletonRows />
      ) : error && !data ? (
        <p className="py-10 text-center text-ink-2">Erreur de chargement des clients</p>
      ) : (
        <>
          <ResponsiveTable
            caption="Liste des clients"
            rows={pager.pageItems}
            rowKey={(c) => c.id}
            empty={search || onlyDue ? "Aucun client ne correspond" : "Aucun client. Créez une fiche ou convertissez une demande du site."}
            columns={[
              {
                key: "name",
                header: "Client",
                render: (c) => (
                  <>
                    <strong>{c.name}</strong>
                    {c.company && (
                      <>
                        <br />
                        <small>{c.company}</small>
                      </>
                    )}
                  </>
                ),
              },
              { key: "phone", header: "Téléphone", className: "whitespace-nowrap", render: (c) => c.phone || "-" },
              { key: "email", header: "Email", mobileHidden: true, render: (c) => c.email || "-" },
              { key: "nif", header: "NIF", className: "font-mono", mobileHidden: true, render: (c) => c.nif || "-" },
              {
                key: "due",
                header: "Solde dû",
                className: "font-mono whitespace-nowrap tabular-nums text-right",
                render: (c) => {
                  const due = data?.balance.get(c.id) ?? 0;
                  return due > 0 ? <span className="font-semibold text-danger-dark">{formatMGA(due)}</span> : "-";
                },
              },
              {
                key: "actions",
                header: "Actions",
                mobileFull: true,
                render: (c) => (
                  <div className="flex gap-1.5">
                    <IconButton icon="eye" label={`Fiche de ${c.name}`} onClick={() => navigate(`/admin/clients/${c.id}`)} />
                    <IconButton icon="pen" label={`Modifier ${c.name}`} onClick={() => setEdit({ open: true, client: c })} />
                    <IconButton icon="file-signature" label={`Nouveau devis pour ${c.name}`} onClick={() => navigate(`/admin/quotes/new?client=${c.id}`)} />
                  </div>
                ),
              },
            ]}
          />
          <Pagination page={pager.page} pageCount={pager.pageCount} onChange={pager.setPage} summary={pager.summary} />
        </>
      )}

      <ClientFormModal open={edit.open} client={edit.client} onClose={() => setEdit({ open: false })} onSaved={() => void reload()} />
    </>
  );
}
