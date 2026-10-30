import type { ReactNode } from "react";
import type { DiagnosticTest, FaultType, Motor } from "../../lib/types";
import { FAULT_CATEGORIES } from "../../lib/format";
import { Icon } from "../ui/Icon";
import { ModalSubtitle } from "../ui/Modal";

export function DiagnosticList({ list }: { list?: DiagnosticTest[] }) {
  if (!list?.length) return <p className="mt-2 text-[0.88rem] text-ink-2">Aucun test de diagnostic défini.</p>;
  return (
    <ol className="mt-2.5 flex flex-col gap-2">
      {list.map((d, i) => (
        <li key={d.id ?? i} className="grid grid-cols-[28px_1fr] gap-x-3 rounded-[10px] border border-line bg-white px-3 py-2.5 text-[0.9rem]">
          <span className="row-span-2 grid size-6 place-items-center rounded-full bg-primary-soft text-[0.75rem] font-bold text-primary">{i + 1}</span>
          <span className="font-semibold text-ink">{d.title}</span>
          {d.expected && (
            <span className="col-start-2 mt-0.5 text-[0.82rem] text-ink-2">
              <Icon name="bullseye" className="mr-1 text-success" /> {d.expected}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function Box({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="mt-1 mb-5 rounded-xl border border-primary-line bg-primary-soft px-[18px] py-4">
      <div className="mb-2 flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary text-white">
          <Icon name="stethoscope" />
        </span>
        <div>
          <strong className="block text-ink">{title}</strong>
          {subtitle && <small className="text-ink-2">{subtitle}</small>}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Aperçu du diagnostic recommandé dans le formulaire « Nouveau moteur ». */
export function DiagnosticPreview({ fault }: { fault: FaultType }) {
  const sub = [FAULT_CATEGORIES[fault.category] || "", fault.description].filter(Boolean).join(" — ");
  return (
    <Box title="Diagnostic recommandé" subtitle={sub}>
      <DiagnosticList list={fault.diagnostic} />
    </Box>
  );
}

/** Bloc affiché dans la fiche d'un moteur (technicien et admin) : copie figée à la création. */
export function MotorDiagnostic({ motor }: { motor: Motor }) {
  if (!motor.faultTypeName && !motor.diagnostic?.length) return null;
  const cat = motor.faultCategory ? FAULT_CATEGORIES[motor.faultCategory as keyof typeof FAULT_CATEGORIES] || motor.faultCategory : undefined;
  return (
    <Box title={`Panne : ${motor.faultTypeName || "Non précisée"}`} subtitle={cat}>
      {!!motor.diagnostic?.length && (
        <>
          <ModalSubtitle>Diagnostic à effectuer</ModalSubtitle>
          <DiagnosticList list={motor.diagnostic} />
        </>
      )}
    </Box>
  );
}
