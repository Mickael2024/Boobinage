import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MotorDiagnostic } from "../../components/motor/Diagnostic";
import { MotorInfoCard, StepCard } from "../../components/motor/MotorView";
import { NameplateFields } from "../../components/motor/NameplateFields";
import { Button } from "../../components/ui/Button";
import { useConfirm } from "../../components/ui/Confirm";
import { Badge, BackButton, Empty, Loading } from "../../components/ui/Display";
import { Field } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { Modal, ModalSubtitle } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { clearValidationRequest, deleteMotor, getClients, getInvoices, getMotorById, getQuotes, updateMotor, validateMotorStep } from "../../lib/db";
import { formatDate, fromInputDate, toInputDate } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { formatMGA } from "../../lib/money";
import { printMotorPDF } from "../../lib/pdf";
import type { Client, Motor, NameplateSpecs, SessionUser } from "../../lib/types";
import { MotorClientSection, MotorTrackingSection, type MotorClientFields, type MotorTrackingFields } from "../shared/MotorFields";
import { invoiceLabel, InvoiceStatusBadge, QuoteStatusBadge } from "./commerce";

const SPEC_KEYS: (keyof NameplateSpecs)[] = ["power", "voltage", "current", "frequency", "rpm", "powerFactor", "insulationClass", "couplingType", "poles"];

/** Modification d'un moteur par l'admin (client, suivi atelier, panne, plaque signalétique). */
function MotorEditModal({ motor, open, onClose, onSaved }: { motor: Motor; open: boolean; onClose: () => void; onSaved: (m: Motor) => void }) {
  const notify = useToast();
  const [client, setClient] = useState<MotorClientFields | null>(null);
  const [tracking, setTracking] = useState<MotorTrackingFields | null>(null);
  const [specs, setSpecs] = useState<NameplateSpecs>({});
  const [fault, setFault] = useState("");
  const [extra, setExtra] = useState<Client[]>([]);
  const clients = useAsync(() => (open ? getClients() : Promise.resolve(undefined)), [open]);

  useEffect(() => {
    if (!open) return;
    setClient({
      clientId: motor.clientId ?? "",
      clientName: motor.clientName ?? "",
      clientPhone: motor.clientPhone ?? "",
      clientCompany: motor.clientCompany ?? "",
      clientAddress: motor.clientAddress ?? "",
      clientEmail: motor.clientEmail ?? "",
    });
    setTracking({
      serialNumber: motor.serialNumber ?? "",
      receivedAt: toInputDate(motor.receivedAt || motor.createdAt),
      promisedAt: toInputDate(motor.promisedAt),
      priority: motor.priority ?? "normal",
      warranty: !!motor.warranty,
      warrantyNote: motor.warrantyNote ?? "",
    });
    setSpecs(Object.fromEntries(SPEC_KEYS.map((k) => [k, motor[k] ?? ""])));
    setFault(motor.faultDescription ?? "");
  }, [open, motor]);

  const save = async () => {
    if (!client || !tracking) return false;
    if (!client.clientName.trim()) {
      notify("Nom du client requis", "error");
      return false;
    }
    if (tracking.promisedAt && tracking.receivedAt && tracking.promisedAt < tracking.receivedAt) {
      notify("La date promise précède la date de réception", "warning");
      return false;
    }
    const updates: Partial<Motor> = {
      clientId: client.clientId || "",
      clientName: client.clientName.trim(),
      clientPhone: client.clientPhone.trim(),
      clientCompany: client.clientCompany.trim(),
      clientAddress: client.clientAddress.trim(),
      clientEmail: client.clientEmail.trim(),
      serialNumber: tracking.serialNumber.trim(),
      receivedAt: fromInputDate(tracking.receivedAt),
      promisedAt: fromInputDate(tracking.promisedAt),
      priority: tracking.priority,
      warranty: tracking.warranty,
      warrantyNote: tracking.warranty ? tracking.warrantyNote.trim() : "",
      faultDescription: fault.trim(),
      ...specs,
    };
    try {
      await updateMotor(motor.id, updates);
      onSaved({ ...motor, ...updates });
      notify("Moteur mis à jour", "success");
    } catch (e) {
      console.error(e);
      notify("Enregistrement impossible", "error");
      return false;
    }
  };

  const clientList = clients.data ? [...clients.data, ...extra.filter((c) => !clients.data!.some((x) => x.id === c.id))] : undefined;

  return (
    <Modal open={open} onClose={onClose} title={`Modifier ${motor.orNumber || "le moteur"}`} icon="pen" wide confirmText="Enregistrer" onConfirm={save}>
      {client && tracking && (
        <>
          <ModalSubtitle>Client</ModalSubtitle>
          <MotorClientSection idPrefix="me" value={client} onChange={(p) => setClient((c) => c && { ...c, ...p })} clients={clientList} onClientCreated={(c) => setExtra((l) => [...l, c])} />
          <ModalSubtitle>Dossier atelier</ModalSubtitle>
          <MotorTrackingSection idPrefix="me" value={tracking} onChange={(p) => setTracking((t) => t && { ...t, ...p })} />
          <ModalSubtitle>Panne</ModalSubtitle>
          <Field label="Description de la panne" htmlFor="me-fault">
            <textarea id="me-fault" rows={3} className="field-input" value={fault} onChange={(e) => setFault(e.target.value)} />
          </Field>
          <ModalSubtitle>Plaque signalétique</ModalSubtitle>
          <NameplateFields idPrefix="me" value={specs} onChange={(p) => setSpecs((s) => ({ ...s, ...p }))} />
        </>
      )}
    </Modal>
  );
}

export function AdminMotorDetail({ admin }: { admin: SessionUser }) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const { data: motor, loading, setData } = useAsync(() => getMotorById(id), [id]);
  const docs = useAsync(async () => {
    const [quotes, invoices] = await Promise.all([getQuotes({ motorId: id }), getInvoices({ motorId: id })]);
    return { quotes, invoices };
  }, [id]);

  if (loading && !motor) return <Loading />;
  if (!motor) return <Empty>Moteur non trouvé</Empty>;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <BackButton onClick={() => navigate("/admin/motors")} />
          <h2 className="text-[1.45rem] font-bold sm:text-[1.6rem]">
            {motor.orNumber && <span className="font-mono">{motor.orNumber}</span>}
            {motor.orNumber ? " — " : "Détail — "}
            {motor.clientName || "Sans nom"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon="file-signature" onClick={() => navigate(`/admin/quotes/new?motor=${motor.id}`)}>
            Créer un devis
          </Button>
          <Button variant="secondary" icon="pen" onClick={() => setEditing(true)}>
            Modifier
          </Button>
          <Button
            variant="secondary"
            icon="print"
            onClick={async () => {
              await printMotorPDF(motor);
              notify("Fiche PDF générée", "success");
            }}
          >
            Fiche PDF
          </Button>
          <Button
            variant="danger"
            icon="trash"
            onClick={() =>
              confirm({
                title: "Supprimer le moteur",
                message: `Supprimer définitivement le dossier ${motor.orNumber || motor.clientName || ""} et tous ses rapports (photos comprises) ? Les devis et factures liés sont conservés.`,
                icon: "trash",
                confirmText: "Supprimer",
                danger: true,
                onConfirm: async () => {
                  await deleteMotor(motor.id);
                  notify("Moteur supprimé", "success");
                  navigate("/admin/motors");
                },
              })
            }
          >
            Supprimer
          </Button>
        </div>
      </div>

      {motor.validationRequestedAt && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-warning bg-warning-soft p-4 text-[0.9rem] text-warning-dark sm:flex-row sm:items-center sm:justify-between">
          <span>
            <Icon name="bell" /> Validation demandée par le technicien le {formatDate(motor.validationRequestedAt)}.
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              await clearValidationRequest(motor.id);
              setData({ ...motor, validationRequestedAt: null });
              notify("Demande traitée", "success");
            }}
          >
            Marquer comme traitée
          </Button>
        </div>
      )}

      <div className="panel mb-6 p-4 sm:p-6">
        <MotorInfoCard motor={motor} extended />
        <MotorDiagnostic motor={motor} />
        <div className="flex flex-col gap-4">
          {motor.steps.map((step) => (
            <StepCard
              key={step.id}
              step={step}
              onValidate={() =>
                confirm({
                  title: "Valider l'étape",
                  message: `Confirmer la validation de l'étape « ${step.name} » ?`,
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

      <section className="panel p-4 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Icon name="file-invoice-dollar" className="text-primary" /> Devis et factures du dossier
        </h3>
        {docs.loading && !docs.data ? (
          <Loading />
        ) : !docs.data?.quotes.length && !docs.data?.invoices.length ? (
          <p className="text-ink-2">Aucun document commercial. Utilisez « Créer un devis ».</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {docs.data?.quotes.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line px-4 py-3">
                <Link to={`/admin/quotes/${q.id}`} className="font-mono font-semibold text-primary-dark underline-offset-2 hover:underline">
                  Devis {q.number}
                </Link>
                <span className="flex items-center gap-3 font-mono text-[0.9rem]">
                  {formatMGA(q.totals?.ttc)} <QuoteStatusBadge quote={q} />
                </span>
              </li>
            ))}
            {docs.data?.invoices.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line px-4 py-3">
                <Link to={`/admin/invoices/${i.id}`} className="font-mono font-semibold text-primary-dark underline-offset-2 hover:underline">
                  {i.type === "credit_note" ? "Avoir" : "Facture"} {invoiceLabel(i)}
                </Link>
                <span className="flex items-center gap-3 font-mono text-[0.9rem]">
                  {formatMGA(i.totals?.ttc)} <InvoiceStatusBadge invoice={i} />
                </span>
              </li>
            ))}
          </ul>
        )}
        {motor.clientId && (
          <p className="mt-4 text-[0.9rem]">
            <Badge tone="info" icon="address-card">
              Fiche client liée
            </Badge>{" "}
            <Link to={`/admin/clients/${motor.clientId}`} className="font-semibold text-primary-dark underline-offset-2 hover:underline">
              Ouvrir la fiche de {motor.clientName}
            </Link>
          </p>
        )}
      </section>

      <MotorEditModal motor={motor} open={editing} onClose={() => setEditing(false)} onSaved={(m) => setData(m)} />
    </>
  );
}
