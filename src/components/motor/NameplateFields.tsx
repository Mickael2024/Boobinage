import type { NameplateSpecs } from "../../lib/types";
import { COUPLING_OPTIONS, INSULATION_OPTIONS, withEmpty } from "../../lib/options";
import { Field } from "../ui/Field";
import { Select } from "../ui/Select";

type Key = keyof NameplateSpecs;

const NUMERIC: { key: Key; label: string; step?: string }[] = [
  { key: "power", label: "PUISSANCE (kW)", step: "0.01" },
  { key: "voltage", label: "TENSION (V)" },
  { key: "current", label: "COURANT (A)", step: "0.1" },
  { key: "frequency", label: "FRÉQUENCE (Hz)" },
  { key: "rpm", label: "VITESSE (RPM)" },
  { key: "powerFactor", label: "COS φ", step: "0.01" },
];

/** Champs de la plaque signalétique (moteur, modèle de moteur). */
export function NameplateFields({ value, onChange, idPrefix, compact }: { value: NameplateSpecs; onChange: (patch: NameplateSpecs) => void; idPrefix: string; compact?: boolean }) {
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <div className={`grid gap-x-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
      {NUMERIC.map(({ key, label, step }) => (
        <Field key={key} label={label} htmlFor={id(key)}>
          <input id={id(key)} type="number" inputMode="decimal" step={step} className="field-input font-mono" value={value[key] ?? ""} onChange={(e) => onChange({ [key]: e.target.value })} />
        </Field>
      ))}
      <Field label="CLASSE ISOLATION" htmlFor={id("insulation")}>
        <Select id={id("insulation")} value={value.insulationClass ?? ""} onChange={(v) => onChange({ insulationClass: v })} options={withEmpty("Sélectionner", INSULATION_OPTIONS)} />
      </Field>
      <Field label="COUPLAGE" htmlFor={id("coupling")}>
        <Select id={id("coupling")} value={value.couplingType ?? ""} onChange={(v) => onChange({ couplingType: v })} options={withEmpty("Sélectionner", COUPLING_OPTIONS)} />
      </Field>
      <Field label="NOMBRE PÔLES" htmlFor={id("poles")}>
        <input id={id("poles")} type="number" inputMode="numeric" className="field-input font-mono" value={value.poles ?? ""} onChange={(e) => onChange({ poles: e.target.value })} />
      </Field>
    </div>
  );
}
