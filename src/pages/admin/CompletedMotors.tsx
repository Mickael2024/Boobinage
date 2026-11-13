import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, IconButton } from "../../components/ui/Button";
import { Badge, Loading, PageHeader, StatCard, StatGrid } from "../../components/ui/Display";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import { ResponsiveTable } from "../../components/ui/ResponsiveTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { getMotors } from "../../lib/db";
import { formatDay, matchesSearch, motorDurationDays, motorEndDate, motorTypeLabel } from "../../lib/format";
import type { Motor } from "../../lib/types";

const PERIODS = [
  { value: "all", label: "Toutes périodes" },
  { value: "month", label: "Ce mois" },
  { value: "3m", label: "3 derniers mois" },
  { value: "year", label: "Cette année" },
];

function inPeriod(m: Motor, period: string) {
  if (period === "all") return true;
  const d = motorEndDate(m);
  if (!d) return false;
  const now = new Date();
  if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (period === "year") return d.getFullYear() === now.getFullYear();
  const from = new Date(now);
  from.setMonth(from.getMonth() - 3);
  return d >= from;
}
import { useAsync } from "../../lib/hooks";
import { exportCompletedPDF, printMotorPDF } from "../../lib/pdf";

export function CompletedMotors() {
  const navigate = useNavigate();
  const notify = useToast();
  const { data, loading } = useAsync(async () => (await getMotors()).filter((m) => m.status === "completed"));
  const all = data ?? [];
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const motors = useMemo(
    () => all.filter((m) => inPeriod(m, period) && matchesSearch(search, m.orNumber, m.clientName, m.clientCompany, m.technicianName, m.serialNumber, m.power && `${m.power} kW`)),
    [all, period, search],
  );
  const pager = usePagination(motors, 20);

  const now = new Date();
  const thisMonth = all.filter((m) => {
    const d = motorEndDate(m);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const durations = all.map(motorDurationDays).filter((d): d is number => d !== null);
  const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  return (
    <>
      <PageHeader title="Moteurs terminés" icon="check-circle">
        <Button
          icon="download"
          onClick={async () => {
            if (!motors.length) return notify("Aucun moteur terminé dans la sélection", "warning");
            await exportCompletedPDF(motors);
            notify("PDF exporté", "success");
          }}
        >
          Exporter la sélection
        </Button>
      </PageHeader>

      <StatGrid cols={3}>
        <StatCard icon="check-circle" value={all.length} label="Moteurs terminés" tone="success" />
        <StatCard icon="calendar-check" value={thisMonth} label="Ce mois" />
        <StatCard icon="clock" value={avg} label="Jours moyen" />
      </StatGrid>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput inline value={search} onChange={setSearch} placeholder="N° OR, client, technicien…" />
        <Select inline aria-label="Filtrer par période de fin" value={period} onChange={setPeriod} options={PERIODS} />
      </div>

      {loading && !data ? (
        <Loading />
      ) : (
        <>
        <ResponsiveTable
          caption="Moteurs terminés"
          rows={pager.pageItems}
          rowKey={(m) => m.id}
          empty={search || period !== "all" ? "Aucun moteur ne correspond" : "Aucun moteur terminé"}
          columns={[
            {
              key: "client",
              header: "Client",
              render: (m) => (
                <>
                  <span className="font-mono text-[0.85rem]">{m.orNumber || "Sans n°"}</span>
                  <br />
                  <strong>{m.clientName || "-"}</strong>
                  {m.clientCompany && (
                    <>
                      <br />
                      <small>{m.clientCompany}</small>
                    </>
                  )}
                </>
              ),
            },
            { key: "tech", header: "Technicien", mobileHidden: true, render: (m) => m.technicianName || "-" },
            { key: "type", header: "Type", render: (m) => motorTypeLabel(m) },
            { key: "power", header: "Puissance", className: "font-mono whitespace-nowrap", render: (m) => `${m.power || "-"} kW` },
            { key: "created", header: "Date création", className: "font-mono", mobileHidden: true, render: (m) => formatDay(m.createdAt) },
            { key: "end", header: "Date fin", className: "font-mono", render: (m) => motorEndDate(m)?.toLocaleDateString("fr-FR") ?? "-" },
            {
              key: "duration",
              header: "Durée",
              render: (m) => {
                const days = motorDurationDays(m);
                return <Badge tone="success">{days === null ? "-" : `${days} jours`}</Badge>;
              },
            },
            {
              key: "actions",
              header: "Actions",
              mobileFull: true,
              render: (m) => (
                <div className="flex gap-1.5">
                  <IconButton icon="eye" label="Voir" onClick={() => navigate(`/admin/motors/${m.id}`)} />
                  <IconButton
                    icon="print"
                    label="Imprimer la fiche"
                    onClick={async () => {
                      await printMotorPDF(m);
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
