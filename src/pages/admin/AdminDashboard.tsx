import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button, IconButton } from "../../components/ui/Button";
import { Badge, Empty, Loading, PageHeader, StatCard, StatGrid } from "../../components/ui/Display";
import { Icon } from "../../components/ui/Icon";
import { useToast } from "../../components/ui/Toast";
import { getActivities, getInvoices, getMotors, getPayments, getQuotes } from "../../lib/db";
import { awaitingValidation, formatDate, formatDay, isMotorLate, sameMonth } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { formatMGA, remainingDue } from "../../lib/money";
import type { Invoice } from "../../lib/types";
import { exportInvoicesCSV, exportPaymentsCSV, isUnpaid, quoteDisplayStatus } from "./commerce";

function Card({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="panel overflow-hidden">
      <h3 className="flex items-center gap-2 border-b border-line px-5 py-4 text-[1.05rem] font-semibold">
        <Icon name={icon} className="text-primary" /> {title}
      </h3>
      <div className="flex flex-col gap-2 p-4">{children}</div>
    </div>
  );
}

/**
 * Chiffre d'affaires HT facturé dans le mois : factures émises dans le mois − avoirs émis dans le mois.
 * Une facture annulée sans avoir (cancelInvoice) ne compte pas ; annulée par un avoir, elle compte et l'avoir la compense.
 */
function monthRevenue(invoices: Invoice[], ref = new Date()) {
  const creditedIds = new Set(invoices.filter((i) => i.type === "credit_note" && i.status !== "draft" && i.creditOf).map((i) => i.creditOf));
  return invoices
    .filter((i) => i.status !== "draft" && sameMonth(i.issuedAt, ref))
    .filter((i) => i.type === "credit_note" || i.status !== "cancelled" || creditedIds.has(i.id))
    .reduce((s, i) => s + (i.type === "credit_note" ? -1 : 1) * (i.totals?.ht ?? 0), 0);
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const notify = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [motors, activities, invoices, payments, quotes] = await Promise.all([getMotors(), getActivities(10), getInvoices(), getPayments(), getQuotes()]);
    return { motors, activities, invoices, payments, quotes };
  });

  const motors = data?.motors ?? [];
  const invoices = data?.invoices ?? [];
  const pending = motors.filter(awaitingValidation).sort((a, b) => String(b.validationRequestedAt ?? "").localeCompare(String(a.validationRequestedAt ?? "")));
  const late = motors.filter((m) => isMotorLate(m)).sort((a, b) => String(a.promisedAt).localeCompare(String(b.promisedAt)));
  const unpaid = invoices.filter(isUnpaid);
  const quotesPending = (data?.quotes ?? []).filter((q) => quoteDisplayStatus(q) === "sent");
  const collected = (data?.payments ?? []).filter((p) => sameMonth(p.date)).reduce((s, p) => s + p.amount, 0);
  const month = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle={`Atelier et activité commerciale — ${month}`}>
        <Button
          variant="secondary"
          icon="file-csv"
          onClick={() => {
            if (!invoices.some((i) => i.status !== "draft")) return notify("Aucune facture émise à exporter", "warning");
            exportInvoicesCSV(invoices);
          }}
        >
          Export factures
        </Button>
        <Button
          variant="secondary"
          icon="file-csv"
          onClick={() => {
            if (!data?.payments.length) return notify("Aucun paiement à exporter", "warning");
            exportPaymentsCSV(data.payments, invoices);
          }}
        >
          Export paiements
        </Button>
        <Button icon="sync-alt" onClick={reload}>
          Actualiser
        </Button>
      </PageHeader>

      {error && !data && <Empty>Erreur de chargement du tableau de bord</Empty>}

      <h3 className="mb-3 text-[0.78rem] font-semibold tracking-[0.06em] text-ink-2 uppercase">Commercial</h3>
      <StatGrid>
        <StatCard icon="chart-line" value={formatMGA(monthRevenue(invoices))} label="CA facturé HT du mois" onClick={() => navigate("/admin/invoices")} />
        <StatCard icon="money-bill-wave" value={formatMGA(collected)} label="Encaissé ce mois" tone="success" onClick={() => navigate("/admin/invoices")} />
        <StatCard icon="hand-holding-usd" value={formatMGA(unpaid.reduce((s, i) => s + remainingDue(i), 0))} label={`Impayés (${unpaid.length} facture${unpaid.length > 1 ? "s" : ""})`} tone="warning" onClick={() => navigate("/admin/invoices")} />
        <StatCard icon="file-signature" value={quotesPending.length} label="Devis en attente de réponse" onClick={() => navigate("/admin/quotes")} />
      </StatGrid>

      <h3 className="mb-3 text-[0.78rem] font-semibold tracking-[0.06em] text-ink-2 uppercase">Atelier</h3>
      <StatGrid>
        <StatCard icon="microchip" value={motors.filter((m) => m.status !== "completed").length} label="Moteurs en cours" onClick={() => navigate("/admin/motors")} />
        <StatCard icon="hourglass-half" value={pending.length} label="Validations en attente" tone="warning" onClick={() => navigate("/admin/motors?status=awaiting")} />
        <StatCard icon="exclamation-triangle" value={late.length} label="Moteurs en retard" tone="warning" onClick={() => navigate("/admin/motors?status=late")} />
        <StatCard icon="check-circle" value={motors.filter((m) => m.status === "completed" && sameMonth(m.completedAt)).length} label="Terminés ce mois" tone="success" onClick={() => navigate("/admin/completed")} />
      </StatGrid>

      {loading && !data ? (
        <Loading />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card icon="clock" title="Validations en attente">
            {pending.length ? (
              pending.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-white px-4 py-3 transition hover:border-primary-light">
                  <div className="min-w-0">
                    <strong>{m.clientName || "Inconnu"}</strong>{" "}
                    {m.validationRequestedAt && (
                      <Badge tone="warning" icon="bell">
                        Demandée
                      </Badge>
                    )}
                    <br />
                    <small className="font-mono text-ink-2">
                      {m.orNumber || "-"} · {m.steps.filter((s) => s.completed && !s.validated).length} étape(s) à valider
                    </small>
                  </div>
                  <IconButton icon="eye" label="Voir le moteur" onClick={() => navigate(`/admin/motors/${m.id}`)} />
                </div>
              ))
            ) : (
              <Empty>Aucune validation en attente</Empty>
            )}
          </Card>
          <Card icon="exclamation-triangle" title="Moteurs en retard">
            {late.length ? (
              late.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-white px-4 py-3 transition hover:border-primary-light">
                  <div className="min-w-0">
                    <strong>{m.clientName || "Inconnu"}</strong>
                    <br />
                    <small className="font-mono text-ink-2">
                      {m.orNumber || "-"} · promis le {formatDay(m.promisedAt)}
                    </small>
                  </div>
                  <IconButton icon="eye" label="Voir le moteur" onClick={() => navigate(`/admin/motors/${m.id}`)} />
                </div>
              ))
            ) : (
              <Empty>Aucun moteur en retard</Empty>
            )}
          </Card>
          <Card icon="history" title="Activité récente">
            {data?.activities.length ? (
              data.activities.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[10px] border border-line bg-white px-4 py-3">
                  <span>{a.description}</span>
                  <small className="font-mono text-ink-2">{formatDate(a.timestamp)}</small>
                </div>
              ))
            ) : (
              <Empty>Aucune activité</Empty>
            )}
          </Card>
          <Card icon="file-invoice-dollar" title="Factures impayées">
            {unpaid.length ? (
              [...unpaid]
                .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
                .slice(0, 6)
                .map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-white px-4 py-3">
                    <div className="min-w-0">
                      <strong className="font-mono">{i.number}</strong> · {i.client?.name}
                      <br />
                      <small className="font-mono text-ink-2">
                        {formatMGA(remainingDue(i))} · échéance {formatDay(i.dueDate)}
                      </small>
                    </div>
                    <IconButton icon="eye" label={`Voir la facture ${i.number}`} onClick={() => navigate(`/admin/invoices/${i.id}`)} />
                  </div>
                ))
            ) : (
              <Empty>Aucune facture impayée</Empty>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
