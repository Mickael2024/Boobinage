import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Empty, Loading, PageHeader, StatCard, StatGrid, StatusPill } from "../../components/ui/Display";
import { Icon } from "../../components/ui/Icon";
import { getMotors } from "../../lib/db";
import { motorTypeLabel } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import type { Motor, SessionUser } from "../../lib/types";

const STATUS_BORDER: Record<Motor["status"], string> = {
  pending: "border-l-warning",
  in_progress: "border-l-primary",
  completed: "border-l-success",
};

export function UserDashboard({ user }: { user: SessionUser }) {
  const navigate = useNavigate();
  const { data: motors, loading } = useAsync(async () => (await getMotors()).filter((m) => m.userId === user.id), [user.id]);
  const count = (s: Motor["status"]) => motors?.filter((m) => m.status === s).length ?? 0;

  return (
    <>
      <PageHeader title="TABLEAU DE BORD" subtitle={`Bienvenue, ${user.name.split(" ")[0] || "Technicien"}`}>
        <Button icon="plus" onClick={() => navigate("/user/new")}>
          NOUVEAU MOTEUR
        </Button>
      </PageHeader>

      <StatGrid>
        <StatCard icon="microchip" value={motors?.length ?? 0} label="Moteurs" />
        <StatCard icon="play-circle" value={count("in_progress")} label="En cours" />
        <StatCard icon="check-circle" value={count("completed")} label="Terminés" tone="success" />
        <StatCard icon="clock" value={count("pending")} label="En attente" tone="warning" />
      </StatGrid>

      <section className="panel p-4 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-[1.05rem] font-semibold">
          <Icon name="list" className="text-primary" /> MOTEURS ENREGISTRÉS
        </h3>
        {loading && !motors ? (
          <Loading />
        ) : !motors?.length ? (
          <Empty>Aucun moteur</Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {motors.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => navigate(`/user/motors/${m.id}`)}
                className={`rounded-xl border border-l-4 border-line bg-white p-5 text-left shadow-xs transition hover:-translate-y-0.5 hover:shadow-card ${STATUS_BORDER[m.status] ?? ""}`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h4 className="font-semibold">{m.clientName || "Sans nom"}</h4>
                  <StatusPill status={m.status} />
                </div>
                <div className="space-y-0.5 text-[0.88rem] text-ink-2 [&_strong]:text-ink">
                  <p>
                    <strong>Puissance :</strong> <span className="font-mono">{m.power || "-"}</span> kW
                  </p>
                  <p>
                    <strong>Type :</strong> {motorTypeLabel(m)}
                  </p>
                  <p>
                    <strong>Progression :</strong>{" "}
                    <span className="font-mono">
                      {m.steps?.filter((s) => s.validated).length || 0}/{m.steps?.length || 0}
                    </span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
