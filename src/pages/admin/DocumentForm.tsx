import { useMemo, useState } from "react";
import { Button, IconButton } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { MoneyInput } from "../../components/ui/MoneyInput";
import { Select } from "../../components/ui/Select";
import { ResponsiveTable } from "../../components/ui/ResponsiveTable";
import { amountInWordsMGA, computeTotals, formatMGA, lineTotal } from "../../lib/money";
import type { CatalogItem, Client, ClientSnapshot, DocumentLine } from "../../lib/types";
import { ClientFormModal } from "../shared/ClientFormModal";

/** Contenu modifiable d'un devis ou d'une facture brouillon. */
export interface DocDraft {
  clientId: string;
  lines: DocumentLine[];
  vatRate: number;
  /** AAAA-MM-JJ : validité (devis) ou échéance (facture). */
  date: string;
  notes: string;
}

export const emptyLine = (): DocumentLine => ({ designation: "", qty: 1, unit: "u", unitPrice: 0, discountPct: 0 });

/** Message d'erreur si le document n'est pas enregistrable, sinon null. */
export function validateDraft(d: DocDraft) {
  if (!d.clientId) return "Choisissez un client";
  if (!d.lines.length) return "Ajoutez au moins une ligne";
  if (d.lines.some((l) => !l.designation.trim())) return "Chaque ligne doit avoir une désignation";
  if (d.lines.some((l) => !(Number(l.qty) > 0))) return "Les quantités doivent être positives";
  if (d.lines.some((l) => (l.discountPct ?? 0) < 0 || (l.discountPct ?? 0) > 100)) return "Remise entre 0 et 100 %";
  if (!(d.vatRate >= 0 && d.vatRate <= 100)) return "Taux de TVA invalide";
  return null;
}

/** Lignes nettoyées pour l'enregistrement. */
export const cleanLines = (lines: DocumentLine[]): DocumentLine[] =>
  lines.map((l) => ({
    designation: l.designation.trim(),
    qty: Number(l.qty) || 0,
    unit: l.unit.trim() || "u",
    unitPrice: Math.round(Number(l.unitPrice) || 0),
    discountPct: Math.min(100, Math.max(0, Number(l.discountPct) || 0)),
  }));

interface Props {
  value: DocDraft;
  onChange: (patch: Partial<DocDraft>) => void;
  clients: Client[];
  catalog: CatalogItem[];
  dateLabel: string;
  onClientCreated: (c: Client) => void;
  /** Le client ne peut plus changer (ex. avoir). */
  lockClient?: boolean;
}

/** Formulaire commun devis / facture : client, lignes (catalogue), TVA, totaux en direct, date, notes. */
export function DocumentForm({ value, onChange, clients, catalog, dateLabel, onClientCreated, lockClient }: Props) {
  const [newClient, setNewClient] = useState(false);
  const totals = useMemo(() => computeTotals(value.lines, value.vatRate), [value.lines, value.vatRate]);
  const client = clients.find((c) => c.id === value.clientId);

  const setLine = (i: number, patch: Partial<DocumentLine>) => onChange({ lines: value.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const removeLine = (i: number) => onChange({ lines: value.lines.filter((_, j) => j !== i) });
  const moveLine = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.lines.length) return;
    const lines = [...value.lines];
    [lines[i], lines[j]] = [lines[j], lines[i]];
    onChange({ lines });
  };
  const addFromCatalog = (id: string) => {
    const item = catalog.find((c) => c.id === id);
    if (item) onChange({ lines: [...value.lines, { designation: item.designation, qty: 1, unit: item.unit || "u", unitPrice: item.unitPrice || 0, discountPct: 0 }] });
  };

  const catalogOptions = [
    { value: "", label: catalog.length ? "Ajouter une prestation du catalogue…" : "Catalogue vide" },
    ...catalog.filter((c) => c.active !== false).map((c) => ({ value: c.id, label: `${c.designation} — ${formatMGA(c.unitPrice)} / ${c.unit}` })),
  ];

  return (
    <>
      <section className="panel mb-5 p-4 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Icon name="user" className="text-primary" /> Client
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Client *" htmlFor="doc-client" className="mb-0 flex-1">
            <Select
              id="doc-client"
              value={value.clientId}
              disabled={lockClient}
              onChange={(v) => onChange({ clientId: v })}
              options={[{ value: "", label: clients.length ? "Choisir un client" : "Aucun client : créez-en un" }, ...clients.map((c) => ({ value: c.id, label: c.company ? `${c.name} (${c.company})` : c.name }))]}
            />
          </Field>
          {!lockClient && (
            <Button variant="secondary" icon="user-plus" onClick={() => setNewClient(true)}>
              Nouveau client
            </Button>
          )}
        </div>
        {client && (
          <p className="mt-3 text-[0.88rem] text-ink-2">
            {[client.phone, client.email, client.address, client.nif && `NIF ${client.nif}`, client.stat && `STAT ${client.stat}`].filter(Boolean).join(" · ") || "Coordonnées non renseignées"}
          </p>
        )}
      </section>

      <section className="panel mb-5 p-4 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Icon name="list" className="text-primary" /> Lignes
        </h3>
        <div className="mb-2 hidden gap-2 px-1 text-[0.72rem] font-semibold tracking-[0.05em] text-ink-2 uppercase lg:grid lg:grid-cols-[minmax(0,1fr)_80px_80px_150px_80px_130px_84px]">
          <span>Désignation</span>
          <span>Qté</span>
          <span>Unité</span>
          <span className="text-right">PU HT</span>
          <span>Remise %</span>
          <span className="text-right">Total HT</span>
          <span />
        </div>
        <ol className="flex flex-col gap-3">
          {value.lines.map((l, i) => (
            <li key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-paper p-3 sm:grid-cols-4 lg:grid-cols-[minmax(0,1fr)_80px_80px_150px_80px_130px_84px] lg:items-center lg:border-0 lg:bg-transparent lg:p-0">
              <input
                aria-label={`Désignation ligne ${i + 1}`}
                placeholder="Désignation"
                className="field-input col-span-2 sm:col-span-4 lg:col-span-1"
                value={l.designation}
                maxLength={300}
                onChange={(e) => setLine(i, { designation: e.target.value })}
              />
              <input aria-label={`Quantité ligne ${i + 1}`} type="number" min={0} step="any" inputMode="decimal" className="field-input font-mono" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value === "" ? 0 : Number(e.target.value) })} />
              <input aria-label={`Unité ligne ${i + 1}`} placeholder="u" className="field-input" value={l.unit} maxLength={20} onChange={(e) => setLine(i, { unit: e.target.value })} />
              <MoneyInput aria-label={`Prix unitaire HT ligne ${i + 1}`} value={l.unitPrice} onChange={(v) => setLine(i, { unitPrice: v ?? 0 })} />
              <input
                aria-label={`Remise en % ligne ${i + 1}`}
                type="number"
                min={0}
                max={100}
                step="any"
                inputMode="decimal"
                className="field-input font-mono"
                value={l.discountPct ?? 0}
                onChange={(e) => setLine(i, { discountPct: e.target.value === "" ? 0 : Number(e.target.value) })}
              />
              <span className="self-center text-right font-mono font-semibold tabular-nums sm:col-span-2 lg:col-span-1">{formatMGA(lineTotal(l))}</span>
              <span className="flex justify-end gap-1 sm:col-span-2 lg:col-span-1">
                <IconButton icon="arrow-up" label={`Monter la ligne ${i + 1}`} disabled={i === 0} onClick={() => moveLine(i, -1)} className="hidden lg:inline-grid" />
                <IconButton icon="trash" tone="danger" label={`Supprimer la ligne ${i + 1}`} onClick={() => removeLine(i)} />
              </span>
            </li>
          ))}
        </ol>
        {!value.lines.length && <p className="py-4 text-center text-ink-2">Aucune ligne.</p>}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="secondary" icon="plus" onClick={() => onChange({ lines: [...value.lines, emptyLine()] })}>
            Ajouter une ligne
          </Button>
          <div className="sm:min-w-[320px]">
            <Select aria-label="Ajouter une prestation du catalogue" value="" onChange={addFromCatalog} options={catalogOptions} disabled={!catalog.length} />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6 border-t border-line pt-5 md:flex-row md:justify-between">
          <div className="grid gap-x-4 sm:grid-cols-2 md:max-w-[420px]">
            <Field label="TVA (%)" htmlFor="doc-vat">
              <input id="doc-vat" type="number" min={0} max={100} step="any" className="field-input font-mono" value={value.vatRate} onChange={(e) => onChange({ vatRate: e.target.value === "" ? 0 : Number(e.target.value) })} />
            </Field>
            <Field label={dateLabel} htmlFor="doc-date">
              <input id="doc-date" type="date" className="field-input" value={value.date} onChange={(e) => onChange({ date: e.target.value })} />
            </Field>
          </div>
          <Totals ht={totals.ht} vat={totals.vat} ttc={totals.ttc} vatRate={value.vatRate} />
        </div>
        <Field label="Notes (affichées sur le document)" htmlFor="doc-notes" className="mt-2 mb-0">
          <textarea id="doc-notes" rows={3} className="field-input" maxLength={2000} value={value.notes} onChange={(e) => onChange({ notes: e.target.value })} />
        </Field>
      </section>

      <ClientFormModal
        open={newClient}
        onClose={() => setNewClient(false)}
        onSaved={(c) => {
          onClientCreated(c);
          onChange({ clientId: c.id });
        }}
      />
    </>
  );
}

/** Bloc des totaux HT / TVA / TTC (+ réglé / reste dû facultatifs). */
export function Totals({ ht, vat, ttc, vatRate, paid, due }: { ht: number; vat: number; ttc: number; vatRate: number; paid?: number; due?: number }) {
  const row = "flex justify-between gap-8 py-1.5";
  return (
    <dl className="min-w-[260px] self-start rounded-xl border border-line bg-paper px-4 py-2 font-mono text-[0.92rem] tabular-nums">
      <div className={row}>
        <dt className="font-sans text-ink-2">Total HT</dt>
        <dd>{formatMGA(ht)}</dd>
      </div>
      <div className={row}>
        <dt className="font-sans text-ink-2">TVA {vatRate} %</dt>
        <dd>{formatMGA(vat)}</dd>
      </div>
      <div className={`${row} border-t border-line-strong text-base font-bold`}>
        <dt className="font-sans">Total TTC</dt>
        <dd>{formatMGA(ttc)}</dd>
      </div>
      {paid !== undefined && (
        <div className={row}>
          <dt className="font-sans text-ink-2">Déjà réglé</dt>
          <dd>{formatMGA(paid)}</dd>
        </div>
      )}
      {due !== undefined && (
        <div className={`${row} font-bold ${due > 0 ? "text-danger-dark" : "text-success-dark"}`}>
          <dt className="font-sans">Reste à payer</dt>
          <dd>{formatMGA(due)}</dd>
        </div>
      )}
    </dl>
  );
}

/** Affichage en lecture seule d'un document émis : client, lignes, totaux. */
export function DocumentView({
  client,
  lines,
  totals,
  vatRate,
  notes,
  paid,
  due,
}: {
  client: ClientSnapshot;
  lines: DocumentLine[];
  totals: { ht: number; vat: number; ttc: number };
  vatRate: number;
  notes?: string;
  paid?: number;
  due?: number;
}) {
  return (
    <section className="panel mb-5 p-4 sm:p-6">
      <div className="mb-5 rounded-xl border border-line bg-paper p-4 text-[0.9rem]">
        <p className="mb-1 text-[0.72rem] font-semibold tracking-[0.05em] text-ink-2 uppercase">Client</p>
        <p className="font-semibold">{client?.name || "-"}</p>
        <p className="text-ink-2">{[client?.company, client?.address, client?.phone, client?.email, client?.nif && `NIF ${client.nif}`, client?.stat && `STAT ${client.stat}`].filter(Boolean).join(" · ")}</p>
      </div>
      <ResponsiveTable
        caption="Lignes du document"
        rows={lines.map((l, i) => ({ ...l, i }))}
        rowKey={(l) => String(l.i)}
        empty="Aucune ligne"
        columns={[
          { key: "designation", header: "Désignation", render: (l) => l.designation },
          { key: "qty", header: "Qté", className: "font-mono tabular-nums", render: (l) => `${String(l.qty).replace(".", ",")} ${l.unit}` },
          { key: "pu", header: "PU HT", className: "font-mono whitespace-nowrap tabular-nums", render: (l) => formatMGA(l.unitPrice) },
          { key: "discount", header: "Remise", className: "font-mono", render: (l) => (l.discountPct ? `${l.discountPct} %` : "-") },
          { key: "total", header: "Total HT", className: "font-mono whitespace-nowrap tabular-nums text-right", render: (l) => formatMGA(lineTotal(l)) },
        ]}
      />
      <div className="mt-5 flex flex-col gap-4 md:flex-row-reverse md:justify-between">
        <Totals ht={totals.ht} vat={totals.vat} ttc={totals.ttc} vatRate={vatRate} paid={paid} due={due} />
        <div className="max-w-[560px] text-[0.9rem] text-ink-2">
          <p className="italic">{amountInWordsMGA(totals.ttc, { capitalize: true })} TTC</p>
          {notes && <p className="mt-3 whitespace-pre-wrap text-ink">{notes}</p>}
        </div>
      </div>
    </section>
  );
}
