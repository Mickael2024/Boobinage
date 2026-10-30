import type { ReactNode } from "react";
import type { Motor, MotorStep, Report } from "../../lib/types";
import { formatDate, motorTypeLabel } from "../../lib/format";
import { Badge, StatusPill } from "../ui/Display";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

const Row = ({ children }: { children: ReactNode }) => <p className="[&_strong]:font-semibold [&_strong]:text-ink">{children}</p>;

export function MotorInfoCard({ motor, extended }: { motor: Motor; extended?: boolean }) {
  return (
    <div className="mb-6 space-y-1 rounded-[10px] bg-mist p-[18px] text-[0.92rem] text-ink-2">
      <Row>
        <strong>Client :</strong> {motor.clientName || "-"} | <strong>Tél :</strong> {motor.clientPhone || "-"}
      </Row>
      <Row>
        <strong>Technicien :</strong> {motor.technicianName || "-"} ({motor.technicianEmail || "-"})
      </Row>
      <Row>
        <strong>Type :</strong> {motorTypeLabel(motor)}
        {motor.templateCustom && (
          <>
            {" "}
            | <strong>Modèle :</strong> {motor.templateCustom}
          </>
        )}{" "}
        | <strong>Puissance :</strong> <span className="font-mono">{motor.power || "-"}</span> kW
      </Row>
      <Row>
        <strong>Statut :</strong> <StatusPill status={motor.status} />
      </Row>
      {extended && (
        <>
          <Row>
            <strong>Panne :</strong> {motor.faultDescription || "-"}
          </Row>
          <Row>
            <strong>Créé :</strong> {formatDate(motor.createdAt)} | <strong>MAJ :</strong> {formatDate(motor.updatedAt)}
          </Row>
        </>
      )}
    </div>
  );
}

interface StepCardProps {
  step: MotorStep;
  /** Technicien : coche les sous-étapes. Absent => lecture seule (admin). */
  onToggle?: (index: number, checked: boolean) => unknown;
  /** Admin : valider une étape complétée. */
  onValidate?: () => unknown;
  /** Technicien : envoyer un rapport. */
  onReport?: () => void;
  reports?: Report[];
  onOpenReport?: (id: string) => void;
}

export function StepCard({ step, onToggle, onValidate, onReport, reports = [], onOpenReport }: StepCardProps) {
  const done = step.substepsCompleted ?? new Array(step.substeps.length).fill(step.completed || false);
  const readOnly = !onToggle || step.validated;
  return (
    <div className={`rounded-xl border border-line bg-white p-5 shadow-xs ${step.validated ? "border-l-4 border-l-success" : step.completed ? "border-l-4 border-l-warning" : ""}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="font-semibold text-ink">{step.name}</h4>
        {step.validated ? (
          <Badge tone="success" icon="check-circle">Validé</Badge>
        ) : step.completed ? (
          <Badge tone="warning" icon="clock">En attente</Badge>
        ) : (
          <Badge>{onToggle ? "À faire" : "Non commencé"}</Badge>
        )}
      </div>

      <div className="mb-3 flex flex-col gap-2">
        {step.substeps.map((sub, i) => (
          <label key={i} className={`flex items-center gap-2.5 text-[0.9rem] text-ink-2 ${readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={!!done[i]}
              disabled={readOnly}
              onChange={(e) => onToggle?.(i, e.target.checked)}
              className="size-[18px] shrink-0 accent-primary"
            />
            <span>{sub}</span>
          </label>
        ))}
      </div>

      {(onReport || onValidate) && (
        <div className="mb-2 flex flex-wrap items-center gap-3">
          {onReport && (
            <Button size="sm" icon="camera" onClick={onReport}>
              Envoyer rapport
            </Button>
          )}
          {reports.length > 0 && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.8rem] text-ink-2">
              <Icon name="paperclip" /> {reports.length} rapport(s)
            </span>
          )}
          {onValidate && step.completed && !step.validated && (
            <Button size="sm" icon="check" onClick={onValidate}>
              Valider
            </Button>
          )}
        </div>
      )}

      {reports.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {reports.map((r) => (
            <span key={r.id} className="contents">
              {r.photos?.map((p, i) => (
                <button key={i} type="button" onClick={() => onOpenReport?.(r.id)} className="overflow-hidden rounded-lg border border-line transition hover:border-primary">
                  <img src={p} alt={`Photo du rapport ${r.stepName}`} className="size-[60px] object-cover" />
                </button>
              ))}
              {r.description && (
                <button type="button" onClick={() => onOpenReport?.(r.id)} className="rounded-lg bg-mist px-3 py-2 text-left font-mono text-[0.78rem] text-ink-2 transition hover:bg-primary-soft">
                  <Icon name="sticky-note" /> {r.description.substring(0, 50)}…
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col text-[0.8rem] text-ink-2">
        {step.completedAt && (
          <small>
            <Icon name="far calendar" /> Complété le {formatDate(step.completedAt)}
          </small>
        )}
        {step.validatedAt && (
          <small>
            <Icon name="check-circle" className="text-success" /> Validé le {formatDate(step.validatedAt)}
          </small>
        )}
      </div>
    </div>
  );
}
