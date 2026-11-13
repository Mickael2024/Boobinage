import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, IconButton } from "../../components/ui/Button";
import { useConfirm } from "../../components/ui/Confirm";
import { BackButton, DetailList, Empty, Loading, StatCard, StatGrid, StatusPill } from "../../components/ui/Display";
import { ResponsiveTable } from "../../components/ui/ResponsiveTable";
import { Tabs } from "../../components/ui/Tabs";
import { useToast } from "../../components/ui/Toast";
import { deleteClient, getClientById, getInvoices, getMotorsByClient, getPayments, getQuotes } from "../../lib/db";
import { formatDay, motorTypeLabel } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { formatMGA, PAYMENT_METHOD_LABELS, remainingDue } from "../../lib/money";
import { ClientFormModal } from "../shared/ClientFormModal";
import { invoiceLabel, InvoiceStatusBadge, isUnpaid, QuoteStatusBadge } from "./commerce";

/** Fiche client : coordonnées, solde, historique moteurs / devis / factures / règlements. */
export function ClientDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState("motors");
  const [editing, setEditing] = useState(false);
  const { data, loading, error, reload } = useAsync(async () => {
    const [client, motors, quotes, invoices, payments] = await Promise.all([getClientById(id), getMotorsByClient(id), getQuotes({ clientId: id }), getInvoices({ clientId: id }), getPayments({ clientId: id })]);
    return { client, motors, quotes, invoices, payments };
  }, [id]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <Empty>Erreur de chargement</Empty>;
  if (!data?.client) return <Empty>Client introuvable</Empty>;
  const { client, motors, quotes, invoices, payments } = data;

  const billed = invoices.filter((i) => i.status !== "draft" && i.status !== "cancelled").reduce((s, i) => s + (i.type === "credit_note" ? -1 : 1) * (i.totals?.ttc ?? 0), 0);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const due = invoices.filter(isUnpaid).reduce((s, i) => s + remainingDue(i), 0);
  const invoiceNumber = (invoiceId: string) => invoices.find((i) => i.id === invoiceId)?.number ?? "-";

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <BackButton onClick={() => navigate("/admin/clients")}>Clients</BackButton>
          <h2 className="text-[1.45rem] font-bold sm:text-[1.6rem]">{client.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon="file-signature" onClick={() => navigate(`/admin/quotes/new?client=${client.id}`)}>
            Nouveau devis
          </Button>
          <Button variant="secondary" icon="file-invoice" onClick={() => navigate(`/admin/invoices/new?client=${client.id}`)}>
            Nouvelle facture
          </Button>
          <Button variant="secondary" icon="pen" onClick={() => setEditing(true)}>
            Modifier
          </Button>
          <IconButton
            icon="trash"
            tone="danger"
            label="Supprimer le client"
            onClick={() =>
              invoices.length || quotes.length
                ? notify("Ce client a des devis ou factures : suppression impossible", "warning")
                : confirm({
                    title: "Supprimer le client",
                    message: `Supprimer la fiche de ${client.name} ? Les moteurs liés conservent les coordonnées recopiées.`,
                    icon: "trash",
                    confirmText: "Supprimer",
                    danger: true,
                    onConfirm: async () => {
                      await deleteClient(client.id);
                      notify("Client supprimé", "success");
                      navigate("/admin/clients");
                    },
                  })
            }
          />
        </div>
      </div>

      <StatGrid cols={3}>
        <StatCard icon="file-invoice-dollar" value={formatMGA(billed)} label="Facturé TTC" />
        <StatCard icon="money-bill-wave" value={formatMGA(paid)} label="Encaissé" tone="success" />
        <StatCard icon="hand-holding-usd" value={formatMGA(due)} label="Solde dû" tone="warning" />
      </StatGrid>

      <div className="mb-6 max-w-[720px]">
        <DetailList
          rows={[
            ["Société", client.company || "-"],
            ["Téléphone", client.phone || "-"],
            ["Email", client.email || "-"],
            ["Adresse", client.address || "-"],
            ["NIF / STAT", [client.nif, client.stat].filter(Boolean).join(" / ") || "-"],
            ...(client.notes ? ([["Notes", client.notes]] as [string, string][]) : []),
          ]}
        />
      </div>

      <Tabs
        label="Historique du client"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "motors", label: "Moteurs", icon: "microchip", count: motors.length },
          { id: "quotes", label: "Devis", icon: "file-signature", count: quotes.length },
          { id: "invoices", label: "Factures", icon: "file-invoice", count: invoices.length },
          { id: "payments", label: "Règlements", icon: "money-bill-wave", count: payments.length },
        ]}
      >
        {tab === "motors" && (
          <ResponsiveTable
            caption="Moteurs du client"
            rows={motors}
            rowKey={(m) => m.id}
            empty="Aucun moteur lié à cette fiche"
            columns={[
              { key: "or", header: "N° OR", className: "font-mono whitespace-nowrap", render: (m) => <strong>{m.orNumber || "-"}</strong> },
              { key: "type", header: "Moteur", render: (m) => `${motorTypeLabel(m, true)} ${m.power ? `${m.power} kW` : ""}` },
              { key: "received", header: "Réception", className: "font-mono", render: (m) => formatDay(m.receivedAt || m.createdAt) },
              { key: "status", header: "Statut", render: (m) => <StatusPill status={m.status} /> },
              { key: "actions", header: "Actions", mobileFull: true, render: (m) => <IconButton icon="eye" label="Voir le moteur" onClick={() => navigate(`/admin/motors/${m.id}`)} /> },
            ]}
          />
        )}
        {tab === "quotes" && (
          <ResponsiveTable
            caption="Devis du client"
            rows={quotes}
            rowKey={(q) => q.id}
            empty="Aucun devis"
            columns={[
              { key: "n", header: "N°", className: "font-mono whitespace-nowrap", render: (q) => <strong>{q.number}</strong> },
              { key: "date", header: "Date", className: "font-mono", render: (q) => formatDay(q.createdAt) },
              { key: "ttc", header: "Total TTC", className: "font-mono whitespace-nowrap tabular-nums text-right", render: (q) => formatMGA(q.totals?.ttc) },
              { key: "status", header: "Statut", render: (q) => <QuoteStatusBadge quote={q} /> },
              { key: "actions", header: "Actions", mobileFull: true, render: (q) => <IconButton icon="eye" label={`Ouvrir ${q.number}`} onClick={() => navigate(`/admin/quotes/${q.id}`)} /> },
            ]}
          />
        )}
        {tab === "invoices" && (
          <ResponsiveTable
            caption="Factures du client"
            rows={invoices}
            rowKey={(i) => i.id}
            empty="Aucune facture"
            columns={[
              { key: "n", header: "N°", className: "font-mono whitespace-nowrap", render: (i) => <strong>{invoiceLabel(i)}</strong> },
              { key: "date", header: "Émise le", className: "font-mono", render: (i) => formatDay(i.issuedAt) },
              { key: "ttc", header: "Total TTC", className: "font-mono whitespace-nowrap tabular-nums text-right", render: (i) => `${i.type === "credit_note" ? "-" : ""}${formatMGA(i.totals?.ttc)}` },
              { key: "due", header: "Reste dû", className: "font-mono whitespace-nowrap tabular-nums text-right", render: (i) => (isUnpaid(i) ? formatMGA(remainingDue(i)) : "-") },
              { key: "status", header: "Statut", render: (i) => <InvoiceStatusBadge invoice={i} /> },
              { key: "actions", header: "Actions", mobileFull: true, render: (i) => <IconButton icon="eye" label={`Ouvrir ${invoiceLabel(i)}`} onClick={() => navigate(`/admin/invoices/${i.id}`)} /> },
            ]}
          />
        )}
        {tab === "payments" && (
          <ResponsiveTable
            caption="Règlements du client"
            rows={payments}
            rowKey={(p) => p.id}
            empty="Aucun règlement"
            columns={[
              { key: "date", header: "Date", className: "font-mono", render: (p) => formatDay(p.date) },
              { key: "amount", header: "Montant", className: "font-mono whitespace-nowrap tabular-nums", render: (p) => <strong>{formatMGA(p.amount)}</strong> },
              { key: "method", header: "Moyen", render: (p) => PAYMENT_METHOD_LABELS[p.method] ?? p.method },
              { key: "invoice", header: "Facture", className: "font-mono", render: (p) => invoiceNumber(p.invoiceId) },
              { key: "actions", header: "Actions", mobileFull: true, render: (p) => <IconButton icon="eye" label="Voir la facture" onClick={() => navigate(`/admin/invoices/${p.invoiceId}`)} /> },
            ]}
          />
        )}
      </Tabs>

      <ClientFormModal open={editing} client={client} onClose={() => setEditing(false)} onSaved={() => void reload()} />
    </>
  );
}
