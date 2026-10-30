import { useMemo, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { DiagnosticPreview } from "../../components/motor/Diagnostic";
import { NameplateFields } from "../../components/motor/NameplateFields";
import { Button } from "../../components/ui/Button";
import { BackButton } from "../../components/ui/Display";
import { Field } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { getFaultTypes, getMotorTypes, saveMotor } from "../../lib/db";
import { useAsync } from "../../lib/hooks";
import { MOTOR_KIND_OPTIONS, OTHER_TEMPLATE, withEmpty } from "../../lib/options";
import type { MotorKind, NameplateSpecs, SessionUser } from "../../lib/types";

const EMPTY = {
  templateId: "",
  templateCustom: "",
  motorType: "" as MotorKind,
  motorTypeCustom: "",
  clientName: "",
  clientPhone: "",
  clientCompany: "",
  clientAddress: "",
  faultTypeId: "",
  faultDescription: "",
};

function Section({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-5 flex items-center gap-2.5 border-b border-line pb-3 text-base font-semibold">
        <span className="grid size-[30px] place-items-center rounded-lg bg-primary-soft text-sm text-primary">
          <Icon name={icon} />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function MotorForm({ user }: { user: SessionUser }) {
  const navigate = useNavigate();
  const notify = useToast();
  const [form, setForm] = useState(EMPTY);
  const [specs, setSpecs] = useState<NameplateSpecs>({});
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));

  const templates = useAsync(getMotorTypes);
  const faults = useAsync(getFaultTypes);

  const templateOptions = useMemo(() => {
    const list = templates.data ?? [];
    const head = templates.error ? "Erreur de chargement" : templates.loading ? "Chargement…" : list.length ? "Choisir un modèle" : "Aucun modèle disponible";
    return [{ value: "", label: head }, ...list.map((t) => ({ value: t.id, label: t.name })), { value: OTHER_TEMPLATE, label: "Autre (à préciser)" }];
  }, [templates.data, templates.loading, templates.error]);

  // pannes proposées selon le type de moteur choisi
  const faultList = useMemo(
    () => (faults.data ?? []).filter((f) => !form.motorType || form.motorType === "other" || f.motorType === "all" || f.motorType === form.motorType),
    [faults.data, form.motorType],
  );
  const fault = faultList.find((f) => f.id === form.faultTypeId);

  const applyTemplate = (id: string) => {
    set({ templateId: id, templateCustom: "" });
    const t = templates.data?.find((x) => x.id === id);
    if (!t) return;
    set({ templateId: id, templateCustom: "", motorType: t.motorType || "" });
    setSpecs({
      power: t.power || "",
      voltage: t.voltage || "",
      current: t.current || "",
      frequency: t.frequency || "",
      rpm: t.rpm || "",
      powerFactor: t.powerFactor || "",
      insulationClass: t.insulationClass || "",
      couplingType: t.couplingType || "",
      poles: t.poles || "",
    });
    notify("Template appliqué", "success");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const isOtherTemplate = form.templateId === OTHER_TEMPLATE;
    const templateCustom = isOtherTemplate ? form.templateCustom.trim() : "";
    const motorTypeCustom = form.motorType === "other" ? form.motorTypeCustom.trim() : "";
    if (!form.clientName.trim() || !form.motorType) return notify("Client et type requis", "error");
    if (isOtherTemplate && !templateCustom) return notify("Précisez le modèle du moteur", "warning");
    if (form.motorType === "other" && !motorTypeCustom) return notify("Précisez le type de moteur", "warning");

    setBusy(true);
    try {
      await saveMotor({
        userId: user.id,
        templateId: form.templateId && !isOtherTemplate ? form.templateId : null,
        templateCustom,
        motorType: form.motorType,
        motorTypeCustom,
        technicianName: user.name,
        technicianEmail: user.email,
        technicianCompany: user.company || "",
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        clientCompany: form.clientCompany,
        clientAddress: form.clientAddress,
        faultDescription: form.faultDescription,
        // copie figée : la fiche garde le diagnostic tel qu'il était à la création, même si l'admin le modifie ensuite
        ...(fault ? { faultTypeId: fault.id, faultTypeName: fault.name, faultCategory: fault.category || "", diagnostic: (fault.diagnostic || []).map((d) => ({ title: d.title, expected: d.expected || "" })) } : {}),
        ...specs,
      });
      notify("Moteur enregistré", "success");
      navigate("/user");
    } catch (err) {
      console.error(err);
      notify("Erreur lors de l'enregistrement", "error");
      setBusy(false);
    }
  };

  const input = (key: keyof typeof EMPTY, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={`mf-${key}`} className="field-input" value={form[key]} onChange={(e) => set({ [key]: e.target.value })} {...props} />
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4 sm:gap-6">
        <BackButton onClick={() => navigate("/user")} />
        <h2 className="text-[1.45rem] font-bold sm:text-[1.6rem]">NOUVEAU MOTEUR</h2>
      </div>

      <form onSubmit={submit} noValidate className="panel p-5 shadow-card sm:p-8">
        <Section icon="cube" title="TYPE DE MOTEUR">
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="MODÈLE PRÉDÉFINI" htmlFor="mf-template">
              <Select id="mf-template" value={form.templateId} onChange={applyTemplate} options={templateOptions} />
              {form.templateId === OTHER_TEMPLATE &&
                input("templateCustom", { placeholder: "Précisez le modèle", maxLength: 80, className: "field-input mt-2 animate-fade-in", "aria-label": "Précisez le modèle" })}
            </Field>
            <Field label="TYPE *" htmlFor="mf-type">
              <Select
                id="mf-type"
                value={form.motorType}
                onChange={(v) => set({ motorType: v as MotorKind, motorTypeCustom: "" })}
                options={withEmpty("Sélectionner", [...MOTOR_KIND_OPTIONS, { value: "other", label: "Autre (à préciser)" }])}
              />
              {form.motorType === "other" &&
                input("motorTypeCustom", { placeholder: "Précisez le type de moteur", maxLength: 80, className: "field-input mt-2 animate-fade-in", "aria-label": "Précisez le type de moteur" })}
            </Field>
          </div>
        </Section>

        <Section icon="user" title="INFORMATIONS CLIENT">
          <div className="mb-5 flex items-center gap-3 rounded-[10px] border border-primary-line bg-primary-soft px-4 py-3 text-[0.9rem] text-primary-dark">
            <Icon name="user-check" />
            <span>
              Technicien responsable : <strong>{user.name}</strong> | <strong>{user.email}</strong>
            </span>
          </div>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="NOM CLIENT *" htmlFor="mf-clientName">
              {input("clientName", { placeholder: "Nom complet", required: true, autoComplete: "off" })}
            </Field>
            <Field label="TÉLÉPHONE" htmlFor="mf-clientPhone">
              {input("clientPhone", { type: "tel", placeholder: "+33..." })}
            </Field>
            <Field label="ENTREPRISE" htmlFor="mf-clientCompany">
              {input("clientCompany", { placeholder: "Nom entreprise" })}
            </Field>
            <Field label="ADRESSE" htmlFor="mf-clientAddress">
              {input("clientAddress", { placeholder: "Adresse" })}
            </Field>
          </div>
          <Field label="TYPE DE PANNE" htmlFor="mf-fault">
            <Select
              id="mf-fault"
              value={fault ? form.faultTypeId : ""}
              onChange={(v) => set({ faultTypeId: v })}
              options={withEmpty("-- Non précisé --", faultList.map((f) => ({ value: f.id, label: f.name })))}
            />
          </Field>
          {fault && <DiagnosticPreview fault={fault} />}
          <Field label="DESCRIPTION PANNE" htmlFor="mf-faultDescription">
            <textarea id="mf-faultDescription" rows={3} className="field-input" placeholder="Décrivez le problème..." value={form.faultDescription} onChange={(e) => set({ faultDescription: e.target.value })} />
          </Field>
        </Section>

        <Section icon="id-card" title="PLAQUE SIGNALÉTIQUE">
          <NameplateFields idPrefix="mf" value={specs} onChange={(p) => setSpecs((s) => ({ ...s, ...p }))} />
        </Section>

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => navigate("/user")}>
            ANNULER
          </Button>
          <Button type="submit" iconRight="save" loading={busy}>
            ENREGISTRER
          </Button>
        </div>
      </form>
    </>
  );
}
