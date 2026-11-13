import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useConfirm } from "../../components/ui/Confirm";
import { BackButton, Empty, Loading } from "../../components/ui/Display";
import { Icon } from "../../components/ui/Icon";
import { useToast } from "../../components/ui/Toast";
import {
  clientSnapshot,
  createInvoiceFromQuote,
  createQuote,
  deleteQuote,
  getCatalog,
  getClients,
  getCompanySettings,
  getInvoices,
  getMotorById,
  getQuoteById,
  getWebRequestById,
  setQuoteStatus,
  updateQuote,
} from "../../lib/db";
import { fromInputDate, motorTypeLabel, toInputDate } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { printQuotePDF } from "../../lib/pdf";
import type { Client, Invoice, Motor, Quote, QuoteStatus } from "../../lib/types";
import { ClientFormModal } from "../shared/ClientFormModal";
import { invoiceLabel, quoteDisplayStatus, QuoteStatusBadge } from "./commerce";
import { cleanLines, DocumentForm, DocumentView, emptyLine, validateDraft, type DocDraft } from "./DocumentForm";

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

/** Cherche une fiche client correspondant aux coordonnées texte d'un moteur ou d'une demande. */
function findClient(clients: Client[], c: { name?: string; email?: string; phone?: string }) {
  const norm = (s?: string) => (s ?? "").trim().toLowerCase();
  const digits = (s?: string) => (s ?? "").replace(/\D/g, "");
  return clients.find((x) => (c.email && norm(x.email) === norm(c.email)) || (digits(c.phone).length >= 6 && digits(x.phone) === digits(c.phone)) || (c.name && norm(x.name) === norm(c.name)));
}

/** Création / modification d'un devis ; actions de cycle de vie et conversion en facture. */
export function QuoteEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const notify = useToast();
  const confirm = useConfirm();
  const isNew = !id || id === "new";

  const [draft, setDraft] = useState<DocDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [extraClients, setExtraClients] = useState<Client[]>([]);
  const [clientPrefill, setClientPrefill] = useState<Partial<Client> | null>(null);

  const { data, loading, error, setData } = useAsync(async () => {
    const [clients, catalog, settings] = await Promise.all([getClients(), getCatalog(), getCompanySettings()]);
    let quote: Quote | null = null;
    let motor: Motor | null = null;
    let invoices: Invoice[] = [];
    let prefill: Partial<DocDraft> & { motorId?: string; webRequestId?: string; clientGuess?: Partial<Client> } = {};
    if (!isNew) {
      quote = await getQuoteById(id!);
      if (quote) {
        invoices = (await getInvoices({ clientId: quote.clientId })).filter((i) => i.quoteId === quote!.id);
        if (quote.motorId) motor = await getMotorById(quote.motorId).catch(() => null);
      }
    } else {
      const motorId = params.get("motor");
      const requestId = params.get("request");
      const clientId = params.get("client") ?? "";
      prefill = { clientId };
      if (motorId) {
        motor = await getMotorById(motorId);
        if (motor) {
          const guess = { name: motor.clientName, company: motor.clientCompany, phone: motor.clientPhone, email: motor.clientEmail, address: motor.clientAddress };
          prefill = {
            clientId: motor.clientId || clientId || findClient(clients, guess)?.id || "",
            motorId: motor.id,
            clientGuess: guess,
            lines: [{ ...emptyLine(), designation: `Rebobinage moteur ${motorTypeLabel(motor).toLowerCase()}${motor.power ? ` ${motor.power} kW` : ""}${motor.orNumber ? ` (dossier ${motor.orNumber})` : ""}`, unit: "forfait" }],
            notes: motor.faultDescription ? `Panne constatée : ${motor.faultDescription}` : "",
          };
        }
      }
      if (requestId) {
        const req = await getWebRequestById(requestId);
        if (req) {
          const guess = { name: req.clientName, company: req.clientCompany, phone: req.clientPhone, email: req.clientEmail, address: req.clientAddress };
          const kind = req.motorType === "three_phase" ? "triphasé" : req.motorType === "single_phase" ? "monophasé" : "";
          prefill = {
            ...prefill,
            clientId: clientId || findClient(clients, guess)?.id || "",
            webRequestId: req.id,
            clientGuess: guess,
            lines: [{ ...emptyLine(), designation: `Réparation / rebobinage moteur ${kind}${req.power ? ` ${req.power} kW` : ""}`.replace(/\s+/g, " ").trim(), unit: "forfait" }],
            notes: req.description ? `Votre demande : ${req.description}` : "",
          };
        }
      }
    }
    return { clients, catalog, settings, quote, motor, invoices, prefill };
  }, [id, params.toString()]);

  // initialise le brouillon une fois les données chargées
  useEffect(() => {
    if (!data) return;
    const { quote, settings, prefill } = data;
    if (quote) {
      setDraft({ clientId: quote.clientId, lines: quote.lines, vatRate: quote.vatRate, date: toInputDate(quote.validUntil), notes: quote.notes ?? "" });
    } else {
      setDraft({
        clientId: prefill.clientId ?? "",
        lines: prefill.lines ?? [emptyLine()],
        vatRate: settings.vatRate,
        date: toInputDate(addDays(settings.quoteValidityDays).toISOString()),
        notes: prefill.notes ?? "",
      });
      if (!prefill.clientId && prefill.clientGuess?.name) setClientPrefill(prefill.clientGuess);
    }
    setDirty(false);
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <Empty>Erreur de chargement</Empty>;
  if (!data || !draft) return <Loading />;
  const { quote, motor, invoices } = data;
  if (!isNew && !quote) return <Empty>Devis introuvable</Empty>;

  const clients = [...data.clients, ...extraClients.filter((c) => !data.clients.some((x) => x.id === c.id))];
  const status: QuoteStatus | null = quote ? quoteDisplayStatus(quote) : null;
  const editable = !quote || quote.status === "draft" || quote.status === "sent";

  const change = (patch: Partial<DocDraft>) => {
    setDraft((d) => d && { ...d, ...patch });
    setDirty(true);
  };

  /** Enregistre ; renvoie le devis à jour (ou null si invalide). */
  const save = async (): Promise<Quote | null> => {
    const err = validateDraft(draft);
    if (err) {
      notify(err, "error");
      return null;
    }
    const client = clients.find((c) => c.id === draft.clientId);
    if (!client) {
      notify("Client introuvable", "error");
      return null;
    }
    const payload = {
      clientId: client.id,
      client: clientSnapshot(client),
      lines: cleanLines(draft.lines),
      vatRate: draft.vatRate,
      validUntil: fromInputDate(draft.date) || addDays(data.settings.quoteValidityDays).toISOString(),
      notes: draft.notes.trim(),
    };
    try {
      if (!quote) {
        const created = await createQuote({ ...payload, motorId: data.prefill.motorId, webRequestId: data.prefill.webRequestId });
        notify(`Devis ${created.number} créé`, "success");
        setDirty(false);
        navigate(`/admin/quotes/${created.id}`, { replace: true });
        return created;
      }
      await updateQuote(quote.id, payload);
      const updated = (await getQuoteById(quote.id))!;
      setData((d) => d && { ...d, quote: updated });
      notify("Devis enregistré", "success");
      return updated;
    } catch (e) {
      console.error(e);
      notify("Enregistrement impossible", "error");
      return null;
    }
  };

  const saved = async () => (editable && (dirty || !quote) ? save() : quote);

  const setStatus = async (s: QuoteStatus, message: string) => {
    const q = await saved();
    if (!q) return;
    await setQuoteStatus(q.id, s);
    setData((d) => d && { ...d, quote: { ...q, status: s } });
    notify(message, "success");
  };

  const motorRef = motor?.orNumber;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <BackButton onClick={() => navigate("/admin/quotes")}>Devis</BackButton>
          <h2 className="text-[1.45rem] font-bold sm:text-[1.6rem]">{quote ? `Devis ${quote.number}` : "Nouveau devis"}</h2>
          {quote && <QuoteStatusBadge quote={quote} />}
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Button icon="save" onClick={save} disabled={!!quote && !dirty}>
              Enregistrer
            </Button>
          )}
          {quote && (
            <Button
              variant="secondary"
              icon="file-pdf"
              onClick={async () => {
                const q = await saved();
                if (q) await printQuotePDF(q, { motorRef });
              }}
            >
              PDF
            </Button>
          )}
        </div>
      </div>

      {(motor || data.prefill.webRequestId || quote?.webRequestId) && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-[0.9rem] text-ink-2">
          <Icon name="link" className="text-primary" />
          {motor && (
            <>
              Dossier lié :{" "}
              <Link className="font-semibold text-primary-dark underline-offset-2 hover:underline" to={`/admin/motors/${motor.id}`}>
                {motor.orNumber || motor.clientName || "moteur"}
              </Link>
            </>
          )}
          {(data.prefill.webRequestId || quote?.webRequestId) && <span>Créé depuis une demande de devis du site.</span>}
        </p>
      )}

      {clientPrefill && !draft.clientId && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary-line bg-primary-soft p-4 text-[0.9rem] text-primary-dark sm:flex-row sm:items-center sm:justify-between">
          <span>
            <Icon name="info-circle" /> Aucune fiche client pour « {clientPrefill.name} ».
          </span>
          <Button size="sm" icon="user-plus" onClick={() => setClientPrefill({ ...clientPrefill, id: "__open" })}>
            Créer la fiche client
          </Button>
        </div>
      )}

      {editable ? (
        <DocumentForm
          value={draft}
          onChange={change}
          clients={clients}
          catalog={data.catalog}
          dateLabel="Valable jusqu'au"
          onClientCreated={(c) => setExtraClients((l) => [...l, c])}
        />
      ) : (
        <DocumentView client={quote!.client} lines={quote!.lines} totals={quote!.totals} vatRate={quote!.vatRate} notes={quote!.notes} />
      )}

      {quote && (
        <section className="panel p-4 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Icon name="tasks" className="text-primary" /> Suivi du devis
          </h3>
          {dirty && <p className="mb-3 text-[0.88rem] text-warning-dark">Modifications non enregistrées : elles seront enregistrées avant l'action.</p>}
          <div className="flex flex-wrap gap-2">
            {quote.status === "draft" && (
              <Button icon="paper-plane" onClick={() => setStatus("sent", "Devis marqué comme envoyé")}>
                Marquer comme envoyé
              </Button>
            )}
            {quote.client?.email && editable && (
              <a
                className="inline-flex items-center gap-2 rounded-[10px] border border-line-strong bg-white px-5 py-2.5 text-[0.95rem] font-semibold text-ink shadow-xs transition hover:bg-mist"
                href={`mailto:${quote.client.email}?subject=${encodeURIComponent(`Devis ${quote.number} — ${data.settings.name}`)}&body=${encodeURIComponent(`Bonjour ${quote.client.name},\n\nVeuillez trouver ci-joint notre devis ${quote.number}.\n\nCordialement,\n${data.settings.name}`)}`}
                onClick={() => quote.status === "draft" && void setStatus("sent", "Devis marqué comme envoyé")}
              >
                <Icon name="envelope" /> Envoyer par email
              </a>
            )}
            {(quote.status === "draft" || quote.status === "sent") && (
              <>
                <Button variant="success" icon="check" onClick={() => setStatus("accepted", "Devis accepté")}>
                  Accepté
                </Button>
                <Button variant="secondary" icon="times" onClick={() => setStatus("refused", "Devis refusé")}>
                  Refusé
                </Button>
              </>
            )}
            {quote.status === "refused" && (
              <Button variant="secondary" icon="undo" onClick={() => setStatus("sent", "Devis rouvert")}>
                Rouvrir
              </Button>
            )}
            {quote.status !== "refused" && !invoices.length && (
              <Button
                icon="file-invoice"
                onClick={() =>
                  confirm({
                    title: "Convertir en facture",
                    message: `Créer une facture brouillon à partir du devis ${quote.number} ? Le devis passera à « accepté ».`,
                    icon: "file-invoice",
                    confirmText: "Créer la facture",
                    onConfirm: async () => {
                      const q = await saved();
                      if (!q) return false;
                      const inv = await createInvoiceFromQuote(q.id);
                      notify("Facture brouillon créée", "success");
                      navigate(`/admin/invoices/${inv.id}`);
                    },
                  })
                }
              >
                Convertir en facture
              </Button>
            )}
            {!invoices.length && (
              <Button
                variant="danger"
                icon="trash"
                className="sm:ml-auto"
                onClick={() =>
                  confirm({
                    title: "Supprimer le devis",
                    message: `Supprimer définitivement le devis ${quote.number} ?`,
                    icon: "trash",
                    confirmText: "Supprimer",
                    danger: true,
                    onConfirm: async () => {
                      await deleteQuote(quote.id);
                      notify("Devis supprimé", "success");
                      navigate("/admin/quotes");
                    },
                  })
                }
              >
                Supprimer
              </Button>
            )}
          </div>
          {!!invoices.length && (
            <p className="mt-4 text-[0.9rem] text-ink-2">
              Facturé :{" "}
              {invoices.map((i, k) => (
                <span key={i.id}>
                  {k > 0 && ", "}
                  <Link className="font-semibold text-primary-dark underline-offset-2 hover:underline" to={`/admin/invoices/${i.id}`}>
                    {invoiceLabel(i)}
                  </Link>
                </span>
              ))}
            </p>
          )}
          {status === "expired" && <p className="mt-3 text-[0.88rem] text-warning-dark">La date de validité est dépassée : prolongez-la avant de renvoyer le devis.</p>}
        </section>
      )}

      <ClientFormModal
        open={clientPrefill?.id === "__open"}
        onClose={() => setClientPrefill((p) => (p ? { ...p, id: undefined } : p))}
        initial={Object.fromEntries(Object.entries(clientPrefill ?? {}).filter(([k, v]) => k !== "id" && v)) as Partial<Record<string, string>>}
        onSaved={(c) => {
          setExtraClients((l) => [...l, c]);
          change({ clientId: c.id });
          setClientPrefill(null);
        }}
      />
    </>
  );
}
