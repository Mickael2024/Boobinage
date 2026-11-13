import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MotorDiagnostic } from "../../components/motor/Diagnostic";
import { MotorInfoCard, StepCard } from "../../components/motor/MotorView";
import { ReportDetailModal } from "../../components/motor/ReportDetail";
import { useConfirm } from "../../components/ui/Confirm";
import { BackButton, Empty, Loading } from "../../components/ui/Display";
import { useToast } from "../../components/ui/Toast";
import { getMotorById, getReportsByMotor, requestMotorValidation, updateMotorSubstep } from "../../lib/db";
import { formatDate } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
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
    if (s?.completed && !s.validated && !updated.validationRequestedAt)
      confirm({
        title: "Demander la validation",
        message: `L'étape « ${s.name} » est complète. Demander sa validation à l'administrateur ?`,
        icon: "check-circle",
        confirmText: "Demander",
        cancelText: "Plus tard",
        onConfirm: requestValidation,
      });
  };

  /** Enregistre la demande (validationRequestedAt) : l'admin la voit en pastille sur « Moteurs ». */
  const requestValidation = async () => {
    try {
      const at = await requestMotorValidation(id);
      setData((d) => (d?.motor ? { ...d, motor: { ...d.motor, validationRequestedAt: at } } : d));
      notify("Demande de validation envoyée", "success");
    } catch (e) {
      console.error(e);
      notify("Envoi de la demande impossible", "error");
    }
  };

  if (loading && !data) return <Loading />;
  if (!motor) return <Empty>Moteur non trouvé</Empty>;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4 sm:gap-6">
        <BackButton onClick={() => navigate("/user")} />
        <h2 className="text-[1.45rem] font-bold sm:text-[1.6rem]">Suivi — {motor.orNumber ? `${motor.orNumber} · ` : ""}{motor.clientName || "Sans nom"}</h2>
      </div>
      <div className="panel p-4 sm:p-6">
        <MotorInfoCard motor={motor} />
        {motor.validationRequestedAt ? (
          <p className="mb-5 flex items-center gap-2 rounded-[10px] border border-primary-line bg-primary-soft px-4 py-3 text-[0.9rem] text-primary-dark">
            <Icon name="paper-plane" /> Validation demandée le {formatDate(motor.validationRequestedAt)}.
          </p>
        ) : (
          motor.steps.some((s) => s.completed && !s.validated) && (
            <div className="mb-5 flex flex-col gap-3 rounded-[10px] border border-warning bg-warning-soft px-4 py-3 text-[0.9rem] text-warning-dark sm:flex-row sm:items-center sm:justify-between">
              <span>
                <Icon name="clock" /> Des étapes complétées attendent la validation de l'administrateur.
              </span>
              <Button size="sm" icon="paper-plane" onClick={requestValidation}>
                Demander la validation
              </Button>
            </div>
          )
        )}
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
