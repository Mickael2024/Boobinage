import { useNavigate } from "react-router-dom";
import { Button, IconButton } from "../../components/ui/Button";
import { Badge, Loading, PageHeader, StatCard, StatGrid, Table } from "../../components/ui/Display";
import { useToast } from "../../components/ui/Toast";
import { getMotors } from "../../lib/db";
import { formatDay, motorDurationDays, motorEndDate, motorTypeLabel } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { exportCompletedPDF, printMotorPDF } from "../../lib/pdf";

export function CompletedMotors() {
  const navigate = useNavigate();
  const notify = useToast();
  const { data, loading } = useAsync(async () => (await getMotors()).filter((m) => m.status === "completed"));
  const motors = data ?? [];

  const now = new Date();
  const thisMonth = motors.filter((m) => {
    const d = motorEndDate(m);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const durations = motors.map(motorDurationDays).filter((d): d is number => d !== null);
  const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  return (
    <>
      <PageHeader title="MOTEURS TERMINÉS" icon="check-circle">
        <Button
          icon="download"
          onClick={async () => {
            if (!motors.length) return notify("Aucun moteur terminé", "warning");
            await exportCompletedPDF(motors);
            notify("PDF exporté", "success");
          }}
        >
          EXPORTER LISTE
        </Button>
      </PageHeader>

      <StatGrid cols={3}>
        <StatCard icon="check-circle" value={motors.length} label="Moteurs terminés" tone="success" />
        <StatCard icon="calendar-check" value={thisMonth} label="Ce mois" />
        <StatCard icon="clock" value={avg} label="Jours moyen" />
      </StatGrid>

      {loading && !data ? (
        <Loading />
      ) : (
        <Table head={["Client", "Technicien", "Type", "Puissance", "Date création", "Date fin", "Durée", "Actions"]}>
          {!motors.length ? (
            <tr>
              <td colSpan={8} className="text-center text-ink-2">
                Aucun moteur terminé
              </td>
            </tr>
          ) : (
            motors.map((m) => {
              const days = motorDurationDays(m);
              return (
                <tr key={m.id}>
                  <td>
                    <strong>{m.clientName || "-"}</strong>
                    {m.clientCompany && (
                      <>
                        <br />
                        <small>{m.clientCompany}</small>
                      </>
                    )}
                  </td>
                  <td>{m.technicianName || "-"}</td>
                  <td>{motorTypeLabel(m)}</td>
                  <td className="font-mono whitespace-nowrap">{m.power || "-"} kW</td>
                  <td className="font-mono">{formatDay(m.createdAt)}</td>
                  <td className="font-mono">{motorEndDate(m)?.toLocaleDateString("fr-FR") ?? "-"}</td>
                  <td>
                    <Badge tone="success">{days === null ? "-" : `${days} jours`}</Badge>
                  </td>
                  <td>
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
                  </td>
                </tr>
              );
            })
          )}
        </Table>
      )}
    </>
  );
}
