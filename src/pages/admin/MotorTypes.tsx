import { useState } from "react";
import { NameplateFields } from "../../components/motor/NameplateFields";
import { Button, IconButton } from "../../components/ui/Button";
import { useConfirm } from "../../components/ui/Confirm";
import { Empty, Loading, PageHeader, Table } from "../../components/ui/Display";
import { Field } from "../../components/ui/Field";
import { Modal, ModalSubtitle } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { addStepToMotorType, deleteMotorType, deleteStepFromMotorType, getMotorTypes, saveMotorType, updateMotorType, updateStepInMotorType } from "../../lib/db";
import { couplingLabel } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { MOTOR_KIND_OPTIONS } from "../../lib/options";
import type { MotorKind, MotorType, NameplateSpecs } from "../../lib/types";

const kindLabel = (k: MotorKind) => (k === "three_phase" ? "Triphasé" : "Monophasé");
const SPEC_KEYS: (keyof NameplateSpecs)[] = ["power", "voltage", "current", "frequency", "rpm", "powerFactor", "insulationClass", "couplingType", "poles"];

/** Création (type absent) et modification d'un modèle de moteur. */
function MotorTypeFormModal({ type, open, onClose, onSaved }: { type?: MotorType; open: boolean; onClose: () => void; onSaved: () => void }) {
  const notify = useToast();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<MotorKind>("three_phase");
  const [specs, setSpecs] = useState<NameplateSpecs>({});

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(type?.name ?? "");
      setKind(type?.motorType || "three_phase");
      setSpecs(Object.fromEntries(SPEC_KEYS.map((k) => [k, type?.[k] ?? ""])));
    }
  }

  const save = async () => {
    if (!name.trim()) return notify("Nom requis", "error"), false;
    const data = { name: name.trim(), motorType: kind, ...specs };
    if (type) await updateMotorType(type.id, data);
    else await saveMotorType(data);
    notify(type ? "Modifié" : "Créé", "success");
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title={type ? "Modifier" : "Nouveau type"} icon={type ? "edit" : "plus-circle"} wide confirmText={type ? "Enregistrer" : "Créer"} onConfirm={save}>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Nom *" htmlFor="mt-name">
          <input id="mt-name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Type *" htmlFor="mt-kind">
          <Select id="mt-kind" value={kind} onChange={(v) => setKind(v as MotorKind)} options={MOTOR_KIND_OPTIONS} />
        </Field>
      </div>
      <NameplateFields compact idPrefix="mt" value={specs} onChange={(p) => setSpecs((s) => ({ ...s, ...p }))} />
    </Modal>
  );
}

/** Gestion des étapes d'un modèle : liste, ajout, modification, suppression. */
function StepsModal({ type, onClose, onChanged }: { type: MotorType | null; onClose: () => void; onChanged: () => Promise<unknown> }) {
  const notify = useToast();
  const [editing, setEditing] = useState<{ id?: string; name: string; substeps: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const steps = type?.customSteps ?? [];

  const close = () => {
    setEditing(null);
    setConfirmDelete(null);
    onClose();
  };

  const saveStep = async () => {
    if (!type || !editing) return;
    if (!editing.name.trim()) return notify("Nom requis", "error"), false;
    const substeps = editing.substeps.split("\n").map((s) => s.trim()).filter(Boolean);
    if (editing.id) await updateStepInMotorType(type.id, editing.id, { name: editing.name.trim(), substeps });
    else await addStepToMotorType(type.id, { name: editing.name.trim(), substeps });
    notify(editing.id ? "Modifiée" : "Ajoutée", "success");
    await onChanged();
    setEditing(null);
    return false; // on revient à la liste des étapes
  };

  const removeStep = async () => {
    if (!type || !confirmDelete) return;
    await deleteStepFromMotorType(type.id, confirmDelete);
    notify("Supprimée", "success");
    await onChanged();
    setConfirmDelete(null);
    return false;
  };

  if (confirmDelete)
    return (
      <Modal key="delete" open onClose={() => setConfirmDelete(null)} title="Supprimer" icon="trash" confirmText="Supprimer" confirmVariant="danger" onConfirm={removeStep}>
        <p className="text-center">Supprimer cette étape ?</p>
      </Modal>
    );

  if (editing)
    return (
      <Modal key="edit" open onClose={() => setEditing(null)} title={editing.id ? "Modifier" : "Nouvelle étape"} icon={editing.id ? "edit" : "plus"} confirmText={editing.id ? "Enregistrer" : "Ajouter"} onConfirm={saveStep}>
        <Field label="Nom" htmlFor="st-name">
          <input id="st-name" className="field-input" placeholder="Ex: DIAGNOSTIC" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
        </Field>
        <Field label="Sous-étapes (une par ligne)" htmlFor="st-subs">
          <textarea id="st-subs" rows={5} className="field-input" placeholder={"Identifier type\nVérifier panne"} value={editing.substeps} onChange={(e) => setEditing({ ...editing, substeps: e.target.value })} />
        </Field>
      </Modal>
    );

  return (
    <Modal key="list" open={!!type} onClose={close} title="Gérer étapes" icon="list" wide confirmText="Fermer" cancelText={null}>
      <h4 className="mb-3 font-semibold">{type?.name}</h4>
      {steps.length ? (
        steps.map((s) => (
          <div key={s.id} className="mb-2 flex items-center justify-between gap-3 rounded-[10px] border border-line bg-mist px-3.5 py-3 text-[0.92rem]">
            <div>
              <strong>{s.name}</strong>
              <br />
              <small className="text-ink-2">{s.substeps?.length || 0} sous-étapes</small>
            </div>
            <div className="flex gap-1.5">
              <IconButton icon="edit" label="Modifier l'étape" onClick={() => setEditing({ id: s.id, name: s.name, substeps: (s.substeps || []).join("\n") })} />
              <IconButton icon="trash" label="Supprimer l'étape" tone="danger" onClick={() => setConfirmDelete(s.id)} />
            </div>
          </div>
        ))
      ) : (
        <p>Aucune étape</p>
      )}
      <Button size="sm" icon="plus" className="mt-4" onClick={() => setEditing({ name: "", substeps: "" })}>
        Nouvelle étape
      </Button>
    </Modal>
  );
}

export function MotorTypes() {
  const notify = useToast();
  const confirm = useConfirm();
  const { data, loading, reload, setData } = useAsync(getMotorTypes);
  const [form, setForm] = useState<{ open: boolean; type?: MotorType }>({ open: false });
  const [details, setDetails] = useState<MotorType | null>(null);
  const [stepsFor, setStepsFor] = useState<string | null>(null);
  const stepsType = data?.find((t) => t.id === stepsFor) ?? null;

  return (
    <>
      <PageHeader title="TYPES DE MOTEURS" icon="cubes">
        <Button icon="plus" onClick={() => setForm({ open: true })}>
          NOUVEAU TYPE
        </Button>
      </PageHeader>

      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Empty>Aucun type</Empty>
      ) : (
        <Table head={["Nom", "Type", "Puissance", "Tension", "Étapes", "Actions"]}>
          {data.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>{kindLabel(t.motorType)}</td>
              <td className="font-mono whitespace-nowrap">{t.power || "-"} kW</td>
              <td className="font-mono whitespace-nowrap">{t.voltage || "-"} V</td>
              <td className="whitespace-nowrap">{t.customSteps?.length || 0} étapes</td>
              <td>
                <div className="flex gap-1.5">
                  <IconButton icon="eye" label="Voir" onClick={() => setDetails(t)} />
                  <IconButton icon="edit" label="Modifier" onClick={() => setForm({ open: true, type: t })} />
                  <IconButton icon="list-check" label="Gérer les étapes" onClick={() => setStepsFor(t.id)} />
                  <IconButton
                    icon="trash"
                    label="Supprimer"
                    tone="danger"
                    onClick={() =>
                      confirm({
                        title: "Supprimer",
                        message: "Supprimer ce type ?",
                        icon: "trash",
                        confirmText: "Supprimer",
                        danger: true,
                        onConfirm: async () => {
                          await deleteMotorType(t.id);
                          notify("Supprimé", "success");
                          setData((list) => list?.filter((x) => x.id !== t.id));
                        },
                      })
                    }
                  />
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!details} onClose={() => setDetails(null)} title="Détails" icon="info-circle" wide confirmText="Fermer" cancelText={null}>
        {details && (
          <div className="space-y-1">
            <h4 className="mb-2.5 text-[1.05rem] font-semibold text-primary">{details.name}</h4>
            <p>
              Type : {kindLabel(details.motorType)} | Puissance : {details.power || "-"} kW | Tension : {details.voltage || "-"} V
            </p>
            <p>
              Courant : {details.current || "-"} A | Fréquence : {details.frequency || "-"} Hz | Vitesse : {details.rpm || "-"} RPM
            </p>
            <p>
              Cos φ : {details.powerFactor || "-"} | Classe : {details.insulationClass || "-"} | Couplage : {couplingLabel(details.couplingType)} | Pôles : {details.poles || "-"}
            </p>
            <ModalSubtitle>Étapes ({details.customSteps?.length || 0})</ModalSubtitle>
            {details.customSteps?.length ? (
              details.customSteps.map((s, i) => (
                <div key={s.id} className="mb-2 rounded-[10px] border border-line bg-mist px-3.5 py-3 text-[0.92rem]">
                  <strong>
                    {i + 1}. {s.name}
                  </strong>
                  <br />
                  <small className="leading-normal text-ink-2">{s.substeps?.join(" • ")}</small>
                </div>
              ))
            ) : (
              <p>Aucune étape</p>
            )}
          </div>
        )}
      </Modal>

      <MotorTypeFormModal open={form.open} type={form.type} onClose={() => setForm({ open: false })} onSaved={() => void reload()} />
      <StepsModal type={stepsType} onClose={() => setStepsFor(null)} onChanged={reload} />
    </>
  );
}
