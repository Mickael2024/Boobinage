import { useNavigate, useParams } from "react-router-dom";
import { MotorDiagnostic } from "../../components/motor/Diagnostic";
import { MotorInfoCard, StepCard } from "../../components/motor/MotorView";
import { useConfirm } from "../../components/ui/Confirm";
import { BackButton, Empty, Loading } from "../../components/ui/Display";
import { useToast } from "../../components/ui/Toast";
import { getMotorById, validateMotorStep } from "../../lib/db";
import { useAsync } from "../../lib/hooks";
import type { SessionUser } from "../../lib/types";

export function AdminMotorDetail({ admin }: { admin: SessionUser }) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const confirm = useConfirm();
  const { data: motor, loading, setData } = useAsync(() => getMotorById(id), [id]);

  if (loading && !motor) return <Loading />;
  if (!motor) return <Empty>Moteur non trouvé</Empty>;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4 sm:gap-6">
        <BackButton onClick={() => navigate("/admin/motors")} />
        <h2 className="text-[1.45rem] font-bold sm:text-[1.6rem]">DÉTAIL - {motor.clientName || "Sans nom"}</h2>
      </div>
      <div className="panel p-4 sm:p-6">
        <MotorInfoCard motor={motor} extended />
        <MotorDiagnostic motor={motor} />
        <div className="flex flex-col gap-4">
          {motor.steps.map((step) => (
            <StepCard
              key={step.id}
              step={step}
              onValidate={() =>
                confirm({
                  title: "Valider étape",
                  message: "Confirmer la validation ?",
                  icon: "check-circle",
                  onConfirm: async () => {
                    const updated = await validateMotorStep(motor.id, step.id, admin.id);
                    if (updated) setData(updated);
                    notify("Étape validée", "success");
                  },
                })
              }
            />
          ))}
        </div>
      </div>
    </>
  );
}
