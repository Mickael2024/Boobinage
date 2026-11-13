import { useState, type InputHTMLAttributes } from "react";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";
import { PRIORITY_LABELS } from "../../lib/format";
import type { Client, MotorPriority } from "../../lib/types";
import { ClientFormModal } from "./ClientFormModal";

/** Coordonnées client recopiées sur le moteur (rétro-compatibilité : champs texte). */
export interface MotorClientFields {
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientCompany: string;
  clientAddress: string;
  clientEmail: string;
}

/** Suivi atelier du dossier. Dates au format AAAA-MM-JJ. */
export interface MotorTrackingFields {
  serialNumber: string;
  receivedAt: string;
  promisedAt: string;
  priority: MotorPriority;
  warranty: boolean;
  warrantyNote: string;
}

export const clientToMotorFields = (c: Client): MotorClientFields => ({
  clientId: c.id,
  clientName: c.name,
  clientPhone: c.phone ?? "",
  clientCompany: c.company ?? "",
  clientAddress: c.address ?? "",
  clientEmail: c.email ?? "",
});

export const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABELS) as MotorPriority[]).map((p) => ({ value: p, label: PRIORITY_LABELS[p] }));

/** Choix d'une fiche client (ou création rapide) + champs texte client modifiables. */
export function MotorClientSection({
  idPrefix,
  value,
  onChange,
  clients,
  onClientCreated,
  compact,
}: {
  idPrefix: string;
  value: MotorClientFields;
  onChange: (patch: Partial<MotorClientFields>) => void;
  clients: Client[] | undefined;
  onClientCreated: (c: Client) => void;
  /** Formulaire de création réduit (technicien). */
  compact?: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const input = (key: Exclude<keyof MotorClientFields, "clientId">, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={`${idPrefix}-${key}`} className="field-input" value={value[key]} onChange={(e) => onChange({ [key]: e.target.value })} {...props} />
  );
  const options = [
    { value: "", label: clients === undefined ? "Chargement…" : clients.length ? "Aucune fiche (saisie libre)" : "Aucune fiche client existante" },
    ...(clients ?? []).map((c) => ({ value: c.id, label: [c.name, c.company, c.phone].filter(Boolean).join(" · ") })),
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Fiche client" htmlFor={`${idPrefix}-clientId`} className="mb-0 flex-1">
          <Select
            id={`${idPrefix}-clientId`}
            value={value.clientId}
            onChange={(id) => {
              const c = clients?.find((x) => x.id === id);
              onChange(c ? clientToMotorFields(c) : { clientId: "" });
            }}
            options={options}
          />
        </Field>
        <Button variant="secondary" icon="user-plus" onClick={() => setCreating(true)}>
          Nouveau client
        </Button>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Nom du client *" htmlFor={`${idPrefix}-clientName`}>
          {input("clientName", { placeholder: "Nom complet", required: true, autoComplete: "off" })}
        </Field>
        <Field label="Téléphone" htmlFor={`${idPrefix}-clientPhone`}>
          {input("clientPhone", { type: "tel", placeholder: "+261 34 …" })}
        </Field>
        <Field label="Entreprise" htmlFor={`${idPrefix}-clientCompany`}>
          {input("clientCompany", { placeholder: "Nom de l'entreprise" })}
        </Field>
        <Field label="Email" htmlFor={`${idPrefix}-clientEmail`}>
          {input("clientEmail", { type: "email", placeholder: "client@exemple.mg" })}
        </Field>
      </div>
      <Field label="Adresse" htmlFor={`${idPrefix}-clientAddress`}>
        {input("clientAddress", { placeholder: "Adresse" })}
      </Field>
      <ClientFormModal
        open={creating}
        compact={compact}
        onClose={() => setCreating(false)}
        initial={{ name: value.clientName, phone: value.clientPhone, company: value.clientCompany, address: value.clientAddress, email: value.clientEmail }}
        onSaved={(c) => {
          onClientCreated(c);
          onChange(clientToMotorFields(c));
        }}
      />
    </>
  );
}

/** N° de série, dates de réception / promise, priorité, garantie. */
export function MotorTrackingSection({ idPrefix, value, onChange }: { idPrefix: string; value: MotorTrackingFields; onChange: (patch: Partial<MotorTrackingFields>) => void }) {
  return (
    <>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="N° de série" htmlFor={`${idPrefix}-serial`}>
          <input id={`${idPrefix}-serial`} className="field-input font-mono" maxLength={80} value={value.serialNumber} onChange={(e) => onChange({ serialNumber: e.target.value })} />
        </Field>
        <Field label="Priorité" htmlFor={`${idPrefix}-priority`}>
          <Select id={`${idPrefix}-priority`} value={value.priority} onChange={(v) => onChange({ priority: v as MotorPriority })} options={PRIORITY_OPTIONS} />
        </Field>
        <Field label="Date de réception" htmlFor={`${idPrefix}-received`}>
          <input id={`${idPrefix}-received`} type="date" className="field-input" value={value.receivedAt} onChange={(e) => onChange({ receivedAt: e.target.value })} />
        </Field>
        <Field label="Date de livraison promise" htmlFor={`${idPrefix}-promised`}>
          <input id={`${idPrefix}-promised`} type="date" className="field-input" min={value.receivedAt || undefined} value={value.promisedAt} onChange={(e) => onChange({ promisedAt: e.target.value })} />
        </Field>
      </div>
      <label className="mb-3 inline-flex cursor-pointer items-center gap-2.5 text-[0.92rem]">
        <input type="checkbox" className="size-[18px] accent-primary" checked={value.warranty} onChange={(e) => onChange({ warranty: e.target.checked })} />
        Réparation sous garantie
      </label>
      {value.warranty && (
        <Field label="Précision garantie" htmlFor={`${idPrefix}-warrantyNote`}>
          <input id={`${idPrefix}-warrantyNote`} className="field-input" maxLength={200} placeholder="Ex. : garantie de la réparation OR-2026-0012" value={value.warrantyNote} onChange={(e) => onChange({ warrantyNote: e.target.value })} />
        </Field>
      )}
    </>
  );
}
