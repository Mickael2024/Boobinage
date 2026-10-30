import { useNavigate, useSearchParams } from "react-router-dom";
import { IconButton } from "../../components/ui/Button";
import { Empty, Loading, PageHeader, StatusPill, Table } from "../../components/ui/Display";
import { Select } from "../../components/ui/Select";
import { getMotors } from "../../lib/db";
import { motorTypeLabel } from "../../lib/format";
import { useAsync } from "../../lib/hooks";

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "pending", label: "En attente" },
  { value: "in_progress", label: "En cours" },
  { value: "completed", label: "Terminés" },
];

export function Motors() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = params.get("status") || "all";
  const { data, loading } = useAsync(getMotors);
  const motors = (data ?? []).filter((m) => filter === "all" || m.status === filter);

  return (
    <>
      <PageHeader title="GESTION MOTEURS" icon="microchip">
        <Select inline aria-label="Filtrer par statut" value={filter} onChange={(v) => setParams(v === "all" ? {} : { status: v }, { replace: true })} options={FILTERS} />
      </PageHeader>
      {loading && !data ? (
        <Loading />
      ) : !motors.length ? (
        <Empty>Aucun moteur</Empty>
      ) : (
        <Table head={["Client", "Type", "Puissance", "Statut", "Progression", "Actions"]}>
          {motors.map((m) => (
            <tr key={m.id}>
              <td>{m.clientName || "-"}</td>
              <td>{motorTypeLabel(m, true)}</td>
              <td className="font-mono whitespace-nowrap">{m.power || "-"} kW</td>
              <td>
                <StatusPill status={m.status} />
              </td>
              <td className="font-mono">
                {m.steps?.filter((s) => s.validated).length || 0}/{m.steps?.length || 0}
              </td>
              <td>
                <IconButton icon="eye" label="Voir" onClick={() => navigate(`/admin/motors/${m.id}`)} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
