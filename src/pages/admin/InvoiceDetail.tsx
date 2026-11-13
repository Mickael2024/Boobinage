import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, IconButton } from "../../components/ui/Button";
import { useConfirm } from "../../components/ui/Confirm";
import { BackButton, Empty, Loading } from "../../components/ui/Display";
import { Field } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { MoneyInput } from "../../components/ui/MoneyInput";
import { ResponsiveTable } from "../../components/ui/ResponsiveTable";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import {
  addPayment,
  cancelInvoice,
  clientSnapshot,
  createCreditNote,
  createInvoice,
  deleteInvoice,
  deletePayment,
  getCatalog,
  getClients,
  getCompanySettings,
  getInvoiceById,
  getInvoices,
  getMotorById,
  getPayments,
  issueInvoice,
  updateInvoice,
} from "../../lib/db";
import { formatDay, fromInputDate, toInputDate } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { formatMGA, PAYMENT_METHOD_LABELS, remainingDue } from "../../lib/money";
import { printInvoicePDF, printReceiptPDF } from "../../lib/pdf";
import type { Client, Invoice, PaymentMethod } from "../../lib/types";
import { docTypeLabel, invoiceLabel, InvoiceStatusBadge, PAYMENT_METHOD_OPTIONS } from "./commerce";
import { cleanLines, DocumentForm, DocumentView, emptyLine, validateDraft, type DocDraft } from "./DocumentForm";

const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** Saisie d'un règlement (montant plafonné au reste dû). */
function PaymentModal({ invoice, open, onClose, onSaved }: { invoice: Invoice; open: boolean; onClose: () => void; onSaved: () => void }) {
  const notify = useToast();
  const due = remainingDue(invoice);
  const [amount, setAmount] = useState<number | null>(due);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(toInputDate(new Date().toISOString()));
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount(remainingDue(invoice));
    setMethod("cash");
    setReference("");
    setDate(toInputDate(new Date().toISOString()));
    setNote("");
  }, [open, invoice]);

  const save = async () => {
    if (!amount || amount <= 0) {
      notify("Montant invalide", "error");
      return false;
    }
    if (amount > due) {
      notify(`Le montant dépasse le reste à payer (${formatMGA(due)})`, "error");
      return false;
    }
    if (!date) {
      notify("Date du règlement requise", "error");
      return false;
    }
    try {
      await addPayment({ invoiceId: invoice.id, amount, method, reference: reference.trim(), date: fromInputDate(date), note: note.trim() });
      notify("Règlement enregistré", "success");
      onSaved();
    } catch (e) {
      notify(errMsg(e, "Enregistrement impossible"), "error");
      return false;
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Enregistrer un règlement" icon="hand-holding-usd" confirmText="Enregistrer" onConfirm={save}>
      <p className="mb-4 text-center text-ink-2">
        Reste à payer : <strong className="font-mono text-ink">{formatMGA(due)}</strong>
      </p>
      <Field label="Montant *" htmlFor="pay-amount">
        <MoneyInput id="pay-amount" value={amount} onChange={setAmount} invalid={!!amount && amount > due} />
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Moyen de paiement" htmlFor="pay-method">
          <Select id="pay-method" value={method} onChange={(v) => setMethod(v as PaymentMethod)} options={PAYMENT_METHOD_OPTIONS} />
        </Field>
        <Field label="Date *" htmlFor="pay-date">
          <input id="pay-date" type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Référence (n° de chèque, transaction…)" htmlFor="pay-ref">
        <input id="pay-ref" className="field-input" maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
      </Field>
      <Field label="Note" htmlFor="pay-note">
        <input id="pay-note" className="field-input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  );
}

/** Facture / avoir : brouillon modifiable, émission, règlements, avoir, annulation. */
export function InvoiceDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const notify = useToast();
  const confirm = useConfirm();
  const isNew = !id || id === "new";
  const [draft, setDraft] = useState<DocDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [extraClients, setExtraClients] = useState<Client[]>([]);
  const [paying, setPaying] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const [clients, catalog, settings] = await Promise.all([getClients(), getCatalog(), getCompanySettings()]);
    const invoice = isNew ? null : await getInvoiceById(id!);
    const [payments, related, motor] = invoice
      ? await Promise.all([getPayments({ invoiceId: invoice.id }), getInvoices({ clientId: invoice.clientId }), invoice.motorId ? getMotorById(invoice.motorId).catch(() => null) : null])
      : [[], [], params.get("motor") ? await getMotorById(params.get("motor")!).catch(() => null) : null];
    return { clients, catalog, settings, invoice, payments, related, motor };
  }, [id]);

  useEffect(() => {
    if (!data) return;
    const { invoice, settings, motor } = data;
    if (invoice) setDraft({ clientId: invoice.clientId, lines: invoice.lines, vatRate: invoice.vatRate, date: toInputDate(invoice.dueDate), notes: invoice.notes ?? "" });
    else {
      const due = new Date();
      due.setDate(due.getDate() + settings.invoiceDueDays);
      setDraft({ clientId: params.get("client") || motor?.clientId || "", lines: [emptyLine()], vatRate: settings.vatRate, date: toInputDate(due.toISOString()), notes: "" });
    }
    setDirty(false);
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <Empty>Erreur de chargement</Empty>;
  if (!data || !draft) return <Loading />;
  const { invoice, payments, related, motor } = data;
  if (!isNew && !invoice) return <Empty>Facture introuvable</Empty>;

  const clients = [...data.clients, ...extraClients.filter((c) => !data.clients.some((x) => x.id === c.id))];
  const editable = !invoice || invoice.status === "draft";
  const credit = invoice?.type === "credit_note";
  const origin = invoice?.creditOf ? related.find((i) => i.id === invoice.creditOf) : undefined;
  const creditNotes = invoice ? related.filter((i) => i.creditOf === invoice.id) : [];
  const due = invoice ? remainingDue(invoice) : 0;
  const pdfOpts = { originNumber: origin?.number ?? undefined, motorRef: motor?.orNumber };

  const change = (patch: Partial<DocDraft>) => {
    setDraft((d) => d && { ...d, ...patch });
    setDirty(true);
  };

  const save = async (): Promise<Invoice | null> => {
    const err = validateDraft(draft);
    if (err) {
      notify(err, "error");
      return null;
    }
    const client = clients.find((c) => c.id === draft.clientId);
    if (!client && !invoice) {
      notify("Client introuvable", "error");
      return null;
    }
    const payload = {
      clientId: draft.clientId,
      client: client && !credit ? clientSnapshot(client) : invoice!.client,
      lines: cleanLines(draft.lines),
      vatRate: draft.vatRate,
      dueDate: fromInputDate(draft.date) || new Date().toISOString(),
      notes: draft.notes.trim(),
    };
    try {
      if (!invoice) {
        const created = await createInvoice({ ...payload, motorId: motor?.id });
        notify("Facture brouillon créée", "success");
        setDirty(false);
        navigate(`/admin/invoices/${created.id}`, { replace: true });
        return created;
      }
      await updateInvoice(invoice.id, payload);
      await reload();
      notify("Brouillon enregistré", "success");
      return (await getInvoiceById(invoice.id))!;
    } catch (e) {
      notify(errMsg(e, "Enregistrement impossible"), "error");
      return null;
    }
  };

  const issue = () =>
    confirm({
      title: credit ? "Émettre l'avoir" : "Émettre la facture",
      message: (
        <>
          Un numéro définitif ({credit ? "AV" : "FA"}-{new Date().getFullYear()}-…) va être attribué. <strong>Le document ne pourra plus être modifié</strong>
          {credit ? "." : " : toute correction passera par un avoir."}
        </>
      ),
      icon: "stamp",
      confirmText: "Émettre",
      onConfirm: async () => {
        if (dirty && !(await save())) return false;
        try {
          const issued = await issueInvoice(invoice!.id);
          notify(`${docTypeLabel(issued)} ${issued.number} émise`, "success");
          await reload();
        } catch (e) {
          notify(errMsg(e, "Émission impossible"), "error");
          return false;
        }
      },
    });

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <BackButton onClick={() => navigate("/admin/invoices")}>Factures</BackButton>
          <h2 className="text-[1.45rem] font-bold sm:text-[1.6rem]">{invoice ? `${docTypeLabel(invoice)} ${invoiceLabel(invoice)}` : "Nouvelle facture"}</h2>
          {invoice && <InvoiceStatusBadge invoice={invoice} />}
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Button icon="save" variant={invoice ? "secondary" : "primary"} onClick={save} disabled={!!invoice && !dirty}>
              {invoice ? "Enregistrer le brouillon" : "Créer le brouillon"}
            </Button>
          )}
          {invoice && editable && (
            <Button icon="stamp" onClick={issue}>
              Émettre
            </Button>
          )}
          {invoice && (
            <Button
              variant="secondary"
              icon="file-pdf"
              onClick={async () => {
                const inv = editable && dirty ? await save() : invoice;
                if (inv) await printInvoicePDF(inv, pdfOpts);
              }}
            >
              PDF
            </Button>
          )}
        </div>
      </div>

      {(origin || motor || invoice?.quoteId || creditNotes.length > 0) && (
        <div className="mb-4 flex flex-col gap-1 text-[0.9rem] text-ink-2 [&_a]:font-semibold [&_a]:text-primary-dark [&_a]:underline-offset-2 hover:[&_a]:underline">
          {origin && (
            <p>
              <Icon name="link" className="text-primary" /> Avoir sur la facture <Link to={`/admin/invoices/${origin.id}`}>{invoiceLabel(origin)}</Link>
            </p>
          )}
          {motor && (
            <p>
              <Icon name="microchip" className="text-primary" /> Dossier <Link to={`/admin/motors/${motor.id}`}>{motor.orNumber || motor.clientName || "moteur"}</Link>
            </p>
          )}
          {invoice?.quoteId && (
            <p>
              <Icon name="file-signature" className="text-primary" /> Issue du <Link to={`/admin/quotes/${invoice.quoteId}`}>devis</Link>
            </p>
          )}
          {creditNotes.map((c) => (
            <p key={c.id}>
              <Icon name="undo" className="text-primary" /> Avoir <Link to={`/admin/invoices/${c.id}`}>{invoiceLabel(c)}</Link> ({formatMGA(c.totals.ttc)})
            </p>
          ))}
        </div>
      )}

      {editable ? (
        <>
          {credit && <p className="mb-4 rounded-xl border border-primary-line bg-primary-soft p-4 text-[0.9rem] text-primary-dark">Avoir en brouillon : ajustez les lignes pour un avoir partiel. Un avoir d'un montant égal ou supérieur à la facture d'origine l'annule.</p>}
          <DocumentForm
            value={draft}
            onChange={change}
            clients={clients}
            catalog={data.catalog}
            dateLabel={credit ? "Date" : "Échéance"}
            lockClient={credit}
            onClientCreated={(c) => setExtraClients((l) => [...l, c])}
          />
          {invoice && (
            <div className="flex justify-end">
              <Button
                variant="danger"
                icon="trash"
                onClick={() =>
                  confirm({
                    title: "Supprimer le brouillon",
                    message: "Supprimer définitivement ce brouillon ? Aucun numéro n'a encore été attribué.",
                    icon: "trash",
                    confirmText: "Supprimer",
                    danger: true,
                    onConfirm: async () => {
                      try {
                        await deleteInvoice(invoice.id);
                        notify("Brouillon supprimé", "success");
                        navigate("/admin/invoices");
                      } catch (e) {
                        notify(errMsg(e, "Suppression impossible"), "error");
                        return false;
                      }
                    },
                  })
                }
              >
                Supprimer le brouillon
              </Button>
            </div>
          )}
        </>
      ) : (
        invoice && (
          <>
            <DocumentView client={invoice.client} lines={invoice.lines} totals={invoice.totals} vatRate={invoice.vatRate} notes={invoice.notes} paid={credit ? undefined : invoice.amountPaid} due={credit ? undefined : due} />
            <p className="mb-5 text-[0.88rem] text-ink-2">
              Émise le {formatDay(invoice.issuedAt)}
              {!credit && <> · échéance le {formatDay(invoice.dueDate)}</>}
              {invoice.cancelledAt && <> · annulée le {formatDay(invoice.cancelledAt)}</>}
            </p>

            {!credit && (
              <section className="panel mb-5 p-4 sm:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <Icon name="money-bill-wave" className="text-primary" /> Règlements
                  </h3>
                  {due > 0 && invoice.status !== "cancelled" && (
                    <Button icon="plus" onClick={() => setPaying(true)}>
                      Enregistrer un règlement
                    </Button>
                  )}
                </div>
                <ResponsiveTable
                  caption="Règlements de la facture"
                  rows={payments}
                  rowKey={(p) => p.id}
                  empty="Aucun règlement enregistré"
                  columns={[
                    { key: "date", header: "Date", className: "font-mono", render: (p) => formatDay(p.date) },
                    { key: "amount", header: "Montant", className: "font-mono whitespace-nowrap tabular-nums", render: (p) => <strong>{formatMGA(p.amount)}</strong> },
                    { key: "method", header: "Moyen", render: (p) => PAYMENT_METHOD_LABELS[p.method] ?? p.method },
                    { key: "ref", header: "Référence", render: (p) => p.reference || "-" },
                    {
                      key: "actions",
                      header: "Actions",
                      mobileFull: true,
                      render: (p) => (
                        <div className="flex gap-1.5">
                          <IconButton icon="receipt" label="Reçu PDF" onClick={() => printReceiptPDF(p, invoice)} />
                          <IconButton
                            icon="trash"
                            tone="danger"
                            label="Supprimer le règlement"
                            onClick={() =>
                              confirm({
                                title: "Supprimer le règlement",
                                message: `Supprimer le règlement de ${formatMGA(p.amount)} du ${formatDay(p.date)} ? Le reste dû sera recalculé.`,
                                icon: "trash",
                                confirmText: "Supprimer",
                                danger: true,
                                onConfirm: async () => {
                                  await deletePayment(p.id);
                                  notify("Règlement supprimé", "success");
                                  await reload();
                                },
                              })
                            }
                          />
                        </div>
                      ),
                    },
                  ]}
                />
              </section>
            )}

            {invoice.status !== "cancelled" && (
              <section className="panel p-4 sm:p-6">
                <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
                  <Icon name="tools" className="text-primary" /> Corrections
                </h3>
                <p className="mb-4 text-[0.88rem] text-ink-2">
                  {credit ? "Un avoir émis ne se modifie plus." : "Une facture émise ne se modifie plus : établissez un avoir pour la corriger, ou annulez-la si aucun règlement n'a été enregistré."}
                </p>
                {!credit && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      icon="undo"
                      onClick={() =>
                        confirm({
                          title: "Établir un avoir",
                          message: `Créer un avoir brouillon reprenant les lignes de la facture ${invoice.number} ? Vous pourrez l'ajuster avant de l'émettre.`,
                          icon: "undo",
                          confirmText: "Créer l'avoir",
                          onConfirm: async () => {
                            try {
                              const cn = await createCreditNote(invoice.id);
                              navigate(`/admin/invoices/${cn.id}`);
                            } catch (e) {
                              notify(errMsg(e, "Création de l'avoir impossible"), "error");
                              return false;
                            }
                          },
                        })
                      }
                    >
                      Établir un avoir
                    </Button>
                    {invoice.amountPaid === 0 && (
                      <Button
                        variant="danger"
                        icon="ban"
                        onClick={() =>
                          confirm({
                            title: "Annuler la facture",
                            message: `Annuler la facture ${invoice.number} ? Son numéro reste consommé (pas de trou dans la numérotation).`,
                            icon: "ban",
                            confirmText: "Annuler la facture",
                            cancelText: "Retour",
                            danger: true,
                            onConfirm: async () => {
                              try {
                                await cancelInvoice(invoice.id);
                                notify("Facture annulée", "success");
                                await reload();
                              } catch (e) {
                                notify(errMsg(e, "Annulation impossible"), "error");
                                return false;
                              }
                            },
                          })
                        }
                      >
                        Annuler la facture
                      </Button>
                    )}
                  </div>
                )}
              </section>
            )}

            <PaymentModal invoice={invoice} open={paying} onClose={() => setPaying(false)} onSaved={() => void reload()} />
          </>
        )
      )}
    </>
  );
}
