import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MotorDiagnostic } from "../../components/motor/Diagnostic";
import { MotorInfoCard, StepCard } from "../../components/motor/MotorView";
import { ReportDetailModal } from "../../components/motor/ReportDetail";
import { useConfirm } from "../../components/ui/Confirm";
import { BackButton, Empty, Loading } from "../../components/ui/Display";
import { useToast } from "../../components/ui/Toast";
import { getMotorById, getReportsByMotor, updateMotorSubstep } from "../../lib/db";
import { useAsync } from "../../lib/hooks";
import type { MotorStep, SessionUser } from "../../lib/types";
import { ReportFormModal } from "./ReportFormModal";

export function MotorDetail({ user }: { user: SessionUser }) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const confirm = useConfirm();
  const [reportStep, setReportStep] = useState<MotorStep | null>(null);
  const [openReport, setOpenReport] = useState<string | null>(null);
  const closeReport = useCallback(() => setOpenReport(null), []);
  const [saving, setSaving] = useState(false);

  const { data, loading, setData, reload } = useAsync(async () => {
    const [motor, reports] = await Promise.all([getMotorById(id), getReportsByMotor(id)]);
    return { motor, reports };
  }, [id]);
  const motor = data?.motor;

  const toggle = async (step: MotorStep, index: number, checked: boolean) => {
    // une seule écriture à la fois : chaque mise à jour relit le moteur complet
    if (saving) return;
    setSaving(true);
    const updated = await updateMotorSubstep(id, step.id, index, checked).finally(() => setSaving(false));
    if (!updated) return notify("Moteur non trouvé", "error");
    setData((d) => d && { ...d, motor: updated });
    notify(checked ? "Sous-étape complétée" : "Sous-étape décochée", "info");
    const s = updated.steps.find((x) => x.id === step.id);
    if (s?.completed && !s.validated)
      confirm({
        title: "Demande validation",
        message: `L'étape "${s.name}" est complète. Demander validation admin ?`,
        icon: "check-circle",
        confirmText: "Demander",
        cancelText: "Plus tard",
        onConfirm: () => notify("Demande envoyée", "success"),
      });
  };

  if (loading && !data) return <Loading />;
  if (!motor) return <Empty>Moteur non trouvé</Empty>;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4 sm:gap-6">
        <BackButton onClick={() => navigate("/user")} />
        <h2 className="text-[1.45rem] font-bold sm:text-[1.6rem]">SUIVI - {motor.clientName || "Sans nom"}</h2>
      </div>
      <div className="panel p-4 sm:p-6">
        <MotorInfoCard motor={motor} />
        <MotorDiagnostic motor={motor} />
        <div className="flex flex-col gap-4">
          {motor.steps.map((step) => (
            <StepCard
              key={step.id}
              step={step}
              onToggle={(i, checked) => toggle(step, i, checked)}
              onReport={() => setReportStep(step)}
              reports={data.reports.filter((r) => r.stepId === step.id)}
              onOpenReport={setOpenReport}
            />
          ))}
        </div>
      </div>

      <ReportFormModal
        motor={motor}
        step={reportStep}
        user={user}
        onClose={() => setReportStep(null)}
        onSent={() => {
          notify("Rapport envoyé !", "success");
          void reload();
        }}
      />
      <ReportDetailModal reportId={openReport} onClose={closeReport} />
    </>
  );
}
