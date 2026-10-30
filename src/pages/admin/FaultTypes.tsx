import { useRef, useState } from "react";
import { DiagnosticList } from "../../components/motor/Diagnostic";
import { Badge, DetailList, Empty, Loading, PageHeader, Table } from "../../components/ui/Display";
import { Button, IconButton } from "../../components/ui/Button";
import { useConfirm } from "../../components/ui/Confirm";
import { Field } from "../../components/ui/Field";
import { Modal, ModalSubtitle } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { deleteFaultType, getFaultTypes, saveFaultType, updateFaultType } from "../../lib/db";
import { FAULT_CATEGORIES, FAULT_MOTOR_LABELS } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { FAULT_CATEGORY_OPTIONS, FAULT_MOTOR_OPTIONS } from "../../lib/options";
import type { FaultCategory, FaultMotorScope, FaultType } from "../../lib/types";

type Row = { key: number; title: string; expected: string };
let rowKey = 0;
const newRow = (title = "", expected = ""): Row => ({ key: ++rowKey, title, expected });
const randomId = () => "d_" + Math.random().toString(36).slice(2, 9);

/** Création (fault absent) et modification d'un type de panne avec son diagnostic. */
function FaultFormModal({ fault, open, onClose, onSaved }: { fault?: FaultType; open: boolean; onClose: () => void; onSaved: () => void }) {
  const notify = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FaultCategory>("electrical");
  const [motorType, setMotorType] = useState<FaultMotorScope>("all");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const rowsBox = useRef<HTMLDivElement>(null);

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(fault?.name ?? "");
      setCategory(fault?.category || "electrical");
      setMotorType(fault?.motorType || "all");
      setDescription(fault?.description ?? "");
      setRows(fault?.diagnostic?.length ? fault.diagnostic.map((d) => newRow(d.title, d.expected)) : [newRow(), newRow()]);
    }
  }

  const updateRow = (key: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const addRow = () => {
    setRows((r) => [...r, newRow()]);
    requestAnimationFrame(() => {
      const last = rowsBox.current?.lastElementChild;
      last?.querySelector("input")?.focus();
      last?.scrollIntoView({ block: "nearest" });
    });
  };
  // on garde toujours au moins une ligne : la dernière est simplement vidée
  const removeRow = (key: number) => setRows((r) => (r.length <= 1 ? [newRow()] : r.filter((x) => x.key !== key)));

  const save = async () => {
    const diagnostic = rows.map((r) => ({ id: randomId(), title: r.title.trim(), expected: r.expected.trim() })).filter((d) => d.title);
    if (!name.trim()) return notify("Le nom de la panne est obligatoire", "warning"), false;
    if (!diagnostic.length) return notify("Ajoutez au moins un test de diagnostic", "warning"), false;
    const data = { name: name.trim(), category, motorType, description: description.trim(), diagnostic };
    if (fault) await updateFaultType(fault.id, data);
    else await saveFaultType(data);
    notify(fault ? "Panne modifiée" : "Panne créée", "success");
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title={fault ? "Modifier la panne" : "Nouvelle panne"} icon={fault ? "pen" : "stethoscope"} wide confirmText={fault ? "Enregistrer" : "Créer la panne"} onConfirm={save}>
      <Field label="Nom de la panne *" htmlFor="ft-name">
        <input id="ft-name" className="field-input" placeholder="Ex. Moteur qui ne démarre pas" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Catégorie" htmlFor="ft-category">
          <Select id="ft-category" value={category} onChange={(v) => setCategory(v as FaultCategory)} options={FAULT_CATEGORY_OPTIONS} />
        </Field>
        <Field label="Moteur concerné" htmlFor="ft-motor">
          <Select id="ft-motor" value={motorType} onChange={(v) => setMotorType(v as FaultMotorScope)} options={FAULT_MOTOR_OPTIONS} />
        </Field>
      </div>
      <Field label="Description (symptômes)" htmlFor="ft-desc">
        <textarea id="ft-desc" rows={2} className="field-input" placeholder="Symptômes observés, causes fréquentes…" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <ModalSubtitle>Diagnostic à effectuer</ModalSubtitle>
      <div ref={rowsBox} className="mb-3 flex flex-col gap-2.5">
        {rows.map((r, i) => (
          <div key={r.key} className="grid grid-cols-[28px_1fr_36px] items-start gap-2.5">
            <span className="mt-[9px] grid size-[26px] place-items-center rounded-full bg-primary-soft text-[0.78rem] font-bold text-primary">{i + 1}</span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <input className="field-input min-h-10 py-2 text-[0.9rem]" aria-label={`Test ${i + 1}`} placeholder="Test à effectuer (ex. Mesurer l'isolement)" value={r.title} onChange={(e) => updateRow(r.key, { title: e.target.value })} />
              <input className="field-input min-h-10 bg-canvas py-2 text-[0.9rem]" aria-label={`Résultat attendu ${i + 1}`} placeholder="Résultat attendu (ex. supérieur à 1 MΩ)" value={r.expected} onChange={(e) => updateRow(r.key, { expected: e.target.value })} />
            </div>
            <IconButton icon="times" label="Retirer ce test" tone="danger" className="mt-1" onClick={() => removeRow(r.key)} />
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" icon="plus" onClick={addRow}>
        Ajouter un test
      </Button>
    </Modal>
  );
}

export function FaultTypes() {
  const notify = useToast();
  const confirm = useConfirm();
  const { data, loading, reload, setData } = useAsync(getFaultTypes);
  const [form, setForm] = useState<{ open: boolean; fault?: FaultType }>({ open: false });
  const [details, setDetails] = useState<FaultType | null>(null);

  return (
    <>
      <PageHeader title="PANNES & DIAGNOSTICS" icon="stethoscope">
        <Button icon="plus" onClick={() => setForm({ open: true })}>
          NOUVELLE PANNE
        </Button>
      </PageHeader>
      <p className="-mt-2 mb-5 max-w-[760px] text-[0.9rem] text-ink-2">
        Créez les types de panne et le diagnostic à effectuer. Les techniciens les choisissent dans le formulaire « Nouveau moteur » et retrouvent le diagnostic sur la fiche du moteur.
      </p>

      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Empty>Aucun type de panne. Cliquez sur « Nouvelle panne » pour créer le premier avec son diagnostic.</Empty>
      ) : (
        <Table head={["Panne", "Catégorie", "Moteur", "Tests", "Actions"]}>
          {data.map((f) => (
            <tr key={f.id}>
              <td>
                <strong>{f.name}</strong>
                {f.description && (
                  <>
                    <br />
                    <small>{f.description}</small>
                  </>
                )}
              </td>
              <td>{FAULT_CATEGORIES[f.category] || "-"}</td>
              <td>{FAULT_MOTOR_LABELS[f.motorType] || "-"}</td>
              <td>
                <Badge>{f.diagnostic?.length || 0} test(s)</Badge>
              </td>
              <td>
                <div className="flex gap-1.5">
                  <IconButton icon="eye" label="Voir" onClick={() => setDetails(f)} />
                  <IconButton icon="pen" label="Modifier" onClick={() => setForm({ open: true, fault: f })} />
                  <IconButton
                    icon="trash"
                    label="Supprimer"
                    tone="danger"
                    onClick={() =>
                      confirm({
                        title: "Supprimer la panne",
                        message: `Supprimer « ${f.name} » et son diagnostic ? Les moteurs déjà enregistrés gardent leur copie du diagnostic.`,
                        icon: "trash",
                        confirmText: "Supprimer",
                        danger: true,
                        onConfirm: async () => {
                          await deleteFaultType(f.id);
                          notify("Panne supprimée", "success");
                          setData((list) => list?.filter((x) => x.id !== f.id));
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

      <Modal
        open={!!details}
        onClose={() => setDetails(null)}
        title={details?.name}
        icon="stethoscope"
        wide
        confirmText="Modifier"
        cancelText="Fermer"
        onConfirm={() => {
          const f = details!;
          setTimeout(() => setForm({ open: true, fault: f }), 0);
        }}
      >
        {details && (
          <>
            <DetailList
              rows={[
                ["Catégorie", FAULT_CATEGORIES[details.category] || "-"],
                ["Moteur concerné", FAULT_MOTOR_LABELS[details.motorType] || "-"],
                ...(details.description ? ([["Description", details.description]] as [string, string][]) : []),
              ]}
            />
            <ModalSubtitle>
              Diagnostic ({details.diagnostic?.length || 0} test{(details.diagnostic?.length || 0) > 1 ? "s" : ""})
            </ModalSubtitle>
            <DiagnosticList list={details.diagnostic} />
          </>
        )}
      </Modal>

      <FaultFormModal open={form.open} fault={form.fault} onClose={() => setForm({ open: false })} onSaved={() => void reload()} />
    </>
  );
}
