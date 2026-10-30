import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button, IconButton } from "../../components/ui/Button";
import { Empty, Loading, PageHeader, StatCard, StatGrid } from "../../components/ui/Display";
import { Icon } from "../../components/ui/Icon";
import { getActivities, getMotors, getUsers } from "../../lib/db";
import { formatDate } from "../../lib/format";
import { useAsync } from "../../lib/hooks";

const awaitingValidation = (m: { steps?: { completed: boolean; validated: boolean }[] }) => !!m.steps?.some((s) => s.completed && !s.validated);

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

export function AdminDashboard() {
  const navigate = useNavigate();
  const { data, loading, reload } = useAsync(async () => {
    const [users, motors, activities] = await Promise.all([getUsers(), getMotors(), getActivities(10)]);
    return { users, motors, activities };
  });

  const motors = data?.motors ?? [];
  const pending = motors.filter(awaitingValidation);

  return (
    <>
      <PageHeader title="SUPERVISION" subtitle="Vue d'ensemble du système">
        <Button icon="sync-alt" onClick={reload}>
          ACTUALISER
        </Button>
      </PageHeader>

      <StatGrid>
        <StatCard icon="users" value={data?.users.filter((u) => u.role === "user").length ?? 0} label="Utilisateurs" onClick={() => navigate("/admin/users")} />
        <StatCard icon="microchip" value={motors.length} label="Moteurs" onClick={() => navigate("/admin/motors")} />
        <StatCard icon="hourglass-half" value={pending.length} label="Validations en attente" tone="warning" onClick={() => navigate("/admin/motors?status=pending")} />
        <StatCard icon="check-circle" value={motors.filter((m) => m.status === "completed").length} label="Terminés" tone="success" onClick={() => navigate("/admin/completed")} />
      </StatGrid>

      {loading && !data ? (
        <Loading />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card icon="clock" title="VALIDATIONS EN ATTENTE">
            {pending.length ? (
              pending.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-white px-4 py-3 transition hover:border-primary-light">
                  <div>
                    <strong>{m.clientName || "Inconnu"}</strong>
                    <br />
                    <small className="font-mono text-ink-2">{m.power || "-"} kW</small>
                  </div>
                  <IconButton icon="eye" label="Voir le moteur" onClick={() => navigate(`/admin/motors/${m.id}`)} />
                </div>
              ))
            ) : (
              <Empty>Aucune validation</Empty>
            )}
          </Card>
          <Card icon="history" title="ACTIVITÉ RÉCENTE">
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
        </div>
      )}
    </>
  );
}
