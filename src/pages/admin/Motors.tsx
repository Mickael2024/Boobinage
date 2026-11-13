import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IconButton } from "../../components/ui/Button";
import { Badge, PageHeader, StatusPill } from "../../components/ui/Display";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import { ResponsiveTable } from "../../components/ui/ResponsiveTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { Select } from "../../components/ui/Select";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { getMotors } from "../../lib/db";
import { awaitingValidation, formatDay, isMotorLate, matchesSearch, motorTypeLabel, PRIORITY_LABELS } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import type { Motor } from "../../lib/types";

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "awaiting", label: "À valider" },
  { value: "late", label: "En retard" },
  { value: "pending", label: "En attente" },
  { value: "in_progress", label: "En cours" },
  { value: "completed", label: "Terminés" },
];

const PRIORITY_FILTERS = [{ value: "all", label: "Toutes priorités" }, ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))];
const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

function matchesFilter(m: Motor, filter: string) {
  if (filter === "all") return true;
  if (filter === "awaiting") return awaitingValidation(m);
  if (filter === "late") return isMotorLate(m);
  return m.status === filter;
}

export function Motors() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = params.get("status") || "all";
  const priority = params.get("priority") || "all";
  const search = params.get("q") || "";
  const setParam = (key: string, value: string, empty: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value === empty) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );

  const { data, loading, error } = useAsync(getMotors);
  const motors = useMemo(() => {
    const list = (data ?? []).filter(
      (m) =>
        matchesFilter(m, filter) &&
        (priority === "all" || (m.priority ?? "normal") === priority) &&
        matchesSearch(search, m.orNumber, m.clientName, m.clientCompany, m.clientPhone, m.serialNumber, m.technicianName, m.power && `${m.power} kW`, m.faultTypeName, motorTypeLabel(m)),
    );
    // « À valider » et « En retard » : les plus urgents d'abord
    if (filter === "awaiting" || filter === "late") list.sort((a, b) => PRIORITY_RANK[a.priority ?? "normal"] - PRIORITY_RANK[b.priority ?? "normal"]);
    return list;
  }, [data, filter, priority, search]);
  const pager = usePagination(motors, 20);

  return (
    <>
      <PageHeader title="Gestion des moteurs" icon="microchip" subtitle={data ? `${data.length} dossier${data.length > 1 ? "s" : ""}` : undefined} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput inline value={search} onChange={(v) => setParam("q", v, "")} placeholder="N° OR, client, n° de série…" />
        <Select inline aria-label="Filtrer par statut" value={filter} onChange={(v) => setParam("status", v, "all")} options={FILTERS} />
        <Select inline aria-label="Filtrer par priorité" value={priority} onChange={(v) => setParam("priority", v, "all")} options={PRIORITY_FILTERS} />
      </div>
      {loading && !data ? (
        <SkeletonRows />
      ) : error && !data ? (
        <p className="py-10 text-center text-ink-2">Erreur de chargement des moteurs</p>
      ) : (
        <>
          <ResponsiveTable
            caption="Liste des moteurs"
            rows={pager.pageItems}
            rowKey={(m) => m.id}
            empty={search || filter !== "all" || priority !== "all" ? "Aucun moteur ne correspond" : "Aucun moteur"}
            columns={[
              {
                key: "client",
                header: "Dossier",
                render: (m) => (
                  <>
                    <span className="font-mono text-[0.85rem]">{m.orNumber || "Sans n°"}</span>
                    <br />
                    <strong>{m.clientName || "-"}</strong>
                    {m.clientCompany && <small> · {m.clientCompany}</small>}
                  </>
                ),
              },
              { key: "type", header: "Moteur", className: "whitespace-nowrap", render: (m) => `${motorTypeLabel(m, true)} · ${m.power || "-"} kW` },
              {
                key: "status",
                header: "Statut",
                render: (m) => (
                  <div className="flex flex-wrap gap-1.5">
                    <StatusPill status={m.status} />
                    {awaitingValidation(m) && <Badge tone="warning">À valider</Badge>}
                    {isMotorLate(m) && <Badge tone="danger">En retard</Badge>}
                    {(m.priority === "urgent" || m.priority === "high") && <Badge tone={m.priority === "urgent" ? "danger" : "warning"}>{PRIORITY_LABELS[m.priority]}</Badge>}
                    {m.warranty && <Badge tone="info">Garantie</Badge>}
                  </div>
                ),
              },
              { key: "promised", header: "Promis le", className: "font-mono", mobileHidden: true, render: (m) => formatDay(m.promisedAt) },
              { key: "progress", header: "Progression", className: "font-mono tabular-nums", render: (m) => `${m.steps?.filter((s) => s.validated).length || 0}/${m.steps?.length || 0}` },
              { key: "actions", header: "Actions", mobileFull: true, render: (m) => <IconButton icon="eye" label={`Voir le moteur ${m.orNumber || m.clientName || ""}`.trim()} onClick={() => navigate(`/admin/motors/${m.id}`)} /> },
            ]}
          />
          <Pagination page={pager.page} pageCount={pager.pageCount} onChange={pager.setPage} summary={pager.summary} />
        </>
      )}
    </>
  );
}
