import type { CompanySettings, DocumentLine, Invoice, Motor, Payment, Quote, Report } from "./types";
import { DEFAULT_COMPANY, getCompanySettings, getReportsByMotor } from "./db";
import { amountInWordsMGA, formatMGA, lineTotal, PAYMENT_METHOD_LABELS, remainingDue } from "./money";
import { couplingLabel, formatDate, formatDay, motorDurationDays, motorEndDate, motorTypeLabel, PRIORITY_LABELS, STATUS_LABELS } from "./format";

// Gabarit PDF commun (A4) : en-tête entreprise (logo, coordonnées, NIF/STAT/RCS), bloc client,
// tableaux paginés, totaux, montant en lettres, conditions, coordonnées de paiement, pied de page numéroté.
// Police standard Helvetica (WinAnsi) : accents français OK ; les caractères hors Latin-1 sont remplacés (cf. clean).

type RGB = [number, number, number];
// Couleurs de la charte (équivalents RVB des tokens de src/index.css)
const PRIMARY: RGB = [242, 140, 40];
const PRIMARY_DARK: RGB = [161, 79, 14];
const PRIMARY_SOFT: RGB = [253, 240, 226];
const INK: RGB = [37, 42, 48];
const MUTED: RGB = [86, 92, 99];
const LINE: RGB = [212, 209, 200];
const PAPER: RGB = [247, 245, 239];
const WHITE: RGB = [255, 255, 255];

const M = 15; // marge
const FOOTER_H = 18;

/** Texte compatible avec les polices standard de jsPDF (Latin-1). */
export function clean(s: unknown): string {
  return String(s ?? "")
    .replace(/[    ]/g, " ")
    .replace(/[φΦϕ]/g, "phi")
    .replace(/[Ωω]/g, "Ohm")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/€/g, "EUR")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/[•·]/g, "·")
    .replace(/[^\n\r\t -ÿ]/g, "?");
}
const money = (n: number) => formatMGA(n, { plain: true });

// jsPDF est chargé à la demande : il n'alourdit pas le premier chargement
async function newDoc() {
  const { jsPDF } = await import("jspdf");
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}
type Doc = Awaited<ReturnType<typeof newDoc>>;

interface Logo {
  data: string;
  w: number;
  h: number;
}

/** Logo (Storage) converti en PNG via canvas ; null si inaccessible (CORS, hors ligne…). */
async function loadLogo(url: string): Promise<Logo | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = objectUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 200;
      canvas.height = img.naturalHeight || 200;
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      return { data: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (e) {
    console.warn("Logo indisponible pour le PDF :", e);
    return null;
  }
}

async function loadCompany(): Promise<{ company: CompanySettings; logo: Logo | null }> {
  const company = await getCompanySettings().catch(() => DEFAULT_COMPANY);
  return { company, logo: await loadLogo(company.logoUrl) };
}

/** Lignes d'identification légale de l'entreprise. */
const legalLine = (c: CompanySettings) => [c.nif && `NIF : ${c.nif}`, c.stat && `STAT : ${c.stat}`, c.rcs && `RCS : ${c.rcs}`].filter(Boolean).join("   ");

interface Meta {
  /** Titre du document (« Devis », « Facture »…). */
  title: string;
  number?: string | null;
  /** Lignes « libellé : valeur » sous le numéro. */
  meta?: [string, string][];
}

/** Contexte d'écriture : document, position verticale, saut de page automatique. */
class Writer {
  y = 0;
  readonly pw: number;
  readonly ph: number;
  readonly width: number;
  constructor(
    readonly doc: Doc,
    readonly company: CompanySettings,
    readonly logo: Logo | null,
    readonly head: Meta,
  ) {
    this.pw = doc.internal.pageSize.getWidth();
    this.ph = doc.internal.pageSize.getHeight();
    this.width = this.pw - 2 * M;
  }

  font(size: number, style: "normal" | "bold" | "italic" | "bolditalic" = "normal", color: RGB = INK, family = "helvetica") {
    this.doc.setFont(family, style).setFontSize(size).setTextColor(...color);
    return this;
  }
  text(s: unknown, x: number, y: number, opts?: { align?: "left" | "right" | "center" }) {
    this.doc.text(clean(s), x, y, opts);
  }
  split(s: unknown, width: number): string[] {
    return this.doc.splitTextToSize(clean(s), width) as string[];
  }
  /** Hauteur de ligne (mm) pour la taille de police courante. */
  lh(size = this.doc.getFontSize()) {
    return size * 0.42;
  }

  /** Saut de page si la hauteur demandée ne tient pas ; renvoie true si une page a été ajoutée. */
  ensure(h: number) {
    if (this.y + h <= this.ph - FOOTER_H - 4) return false;
    this.doc.addPage();
    this.smallHeader();
    return true;
  }

  /** Logo (image ou monogramme) dans un carré de `size` mm. */
  drawLogo(x: number, y: number, size: number) {
    const { doc, logo } = this;
    if (logo) {
      const ratio = logo.w / logo.h;
      const w = ratio >= 1 ? size : size * ratio;
      const h = ratio >= 1 ? size / ratio : size;
      doc.addImage(logo.data, "PNG", x, y + (size - h) / 2, w, h);
      return w;
    }
    doc.setFillColor(...PRIMARY).roundedRect(x, y, size, size, 3, 3, "F");
    const initials =
      this.company.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "JE";
    this.font(size * 1.1, "bold", INK).text(initials, x + size / 2, y + size / 2 + size * 0.17, { align: "center" });
    return size;
  }

  /** En-tête complet de la première page. */
  header() {
    const { company: c, head } = this;
    const top = 12;
    const logoW = this.drawLogo(M, top, 20);
    const x = M + logoW + 5;
    const maxW = this.width * 0.55 - logoW - 5;
    let ly = top + 5;
    this.font(14, "bold", INK).text(c.name || "Jeff Elec", x, ly);
    ly += 5.5;
    this.font(8.5, "normal", MUTED);
    for (const l of [c.address, [c.phone && `Tél. ${c.phone}`, c.email].filter(Boolean).join("  ·  "), c.website, legalLine(c)].filter(Boolean)) {
      for (const part of this.split(l, maxW)) {
        this.text(part, x, ly);
        ly += 3.8;
      }
    }

    // titre et numéro à droite
    const rx = this.pw - M;
    let ry = top + 6;
    this.font(20, "bold", PRIMARY_DARK).text(head.title.toUpperCase(), rx, ry, { align: "right" });
    ry += 6.5;
    if (head.number) {
      this.font(11, "bold", INK).text(`N° ${head.number}`, rx, ry, { align: "right" });
      ry += 5.5;
    }
    this.font(9, "normal", MUTED);
    for (const [k, v] of head.meta ?? []) {
      this.text(`${k} : ${v}`, rx, ry, { align: "right" });
      ry += 4.4;
    }
    this.y = Math.max(ly, ry, top + 22) + 3;
    this.doc.setDrawColor(...PRIMARY).setLineWidth(0.6).line(M, this.y, this.pw - M, this.y);
    this.doc.setLineWidth(0.2);
    this.y += 7;
  }

  /** Rappel d'en-tête des pages suivantes. */
  smallHeader() {
    this.font(9, "bold", INK).text(this.company.name || "Jeff Elec", M, 14);
    this.font(9, "normal", MUTED).text([this.head.title, this.head.number].filter(Boolean).join(" ") || "", this.pw - M, 14, { align: "right" });
    this.doc.setDrawColor(...LINE).line(M, 17, this.pw - M, 17);
    this.y = 24;
  }

  /** Pied de page (mentions + numéro de page) sur toutes les pages. */
  footer() {
    const { doc, company: c } = this;
    const pages = doc.getNumberOfPages();
    const text = [c.footer, !c.footer && [c.name, legalLine(c)].filter(Boolean).join("  ·  ")].filter(Boolean).join("");
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      const y = this.ph - FOOTER_H + 4;
      doc.setDrawColor(...LINE).line(M, y, this.pw - M, y);
      this.font(7.5, "normal", MUTED);
      const lines = this.split(text, this.width - 25).slice(0, 3);
      lines.forEach((l, k) => this.text(l, M, y + 4 + k * 3.3));
      this.text(`Page ${i}/${pages}`, this.pw - M, y + 4, { align: "right" });
    }
  }

  /** Titre de section. */
  section(title: string) {
    this.ensure(14);
    this.y += 2;
    this.font(10.5, "bold", PRIMARY_DARK).text(title, M, this.y);
    this.y += 1.8;
    this.doc.setDrawColor(...LINE).line(M, this.y, this.pw - M, this.y);
    this.y += 5;
  }

  /** Paragraphe avec retour à la ligne et saut de page. */
  paragraph(s: string, { size = 9.5, style = "normal" as "normal" | "bold" | "italic", color = INK, indent = 0, family = "helvetica" } = {}) {
    if (!s.trim()) return;
    this.font(size, style, color, family);
    for (const l of this.split(s, this.width - indent)) {
      this.ensure(this.lh(size) + 1);
      this.font(size, style, color, family).text(l, M + indent, this.y);
      this.y += this.lh(size) + 0.8;
    }
    this.y += 1.5;
  }

  /** Grille clé / valeur sur `cols` colonnes. */
  keyValues(pairs: [string, string][], cols = 2) {
    const colW = this.width / cols;
    const rowH = 5.4;
    for (let i = 0; i < pairs.length; i += cols) {
      this.ensure(rowH);
      pairs.slice(i, i + cols).forEach(([k, v], j) => {
        const x = M + j * colW;
        this.font(8.5, "normal", MUTED).text(`${k} :`, x, this.y);
        const kw = this.doc.getTextWidth(clean(`${k} : `));
        this.font(9.5, "bold", INK).text(this.split(v || "-", colW - kw - 3)[0] ?? "-", x + kw, this.y);
      });
      this.y += rowH;
    }
    this.y += 2;
  }

  /** Deux blocs côte à côte : gauche (références) et droite (client, encadré). */
  partyBlocks(left: [string, string][], clientTitle: string, client: string[]) {
    const half = (this.width - 8) / 2;
    const rx = M + half + 8;
    const startY = this.y;
    // client (encadré)
    this.font(9.5, "normal", INK);
    const clientLines = client.filter(Boolean).flatMap((l, i) => (i === 0 ? [l] : this.split(l, half - 8)));
    const boxH = 9 + clientLines.length * 4.6 + 2;
    this.doc.setFillColor(...PAPER).setDrawColor(...LINE).roundedRect(rx, startY - 4, half, boxH, 2, 2, "FD");
    this.font(8, "bold", MUTED).text(clientTitle.toUpperCase(), rx + 4, startY + 1);
    let cy = startY + 6.5;
    clientLines.forEach((l, i) => {
      this.font(i === 0 ? 11 : 9, i === 0 ? "bold" : "normal", INK).text(l, rx + 4, cy);
      cy += i === 0 ? 5.2 : 4.4;
    });
    // références
    let ly = startY + 1;
    for (const [k, v] of left.filter(([, v]) => v)) {
      this.font(8.5, "normal", MUTED).text(`${k} :`, M, ly);
      this.font(9.5, "bold", INK).text(this.split(v, half - 36)[0] ?? "", M + 34, ly);
      ly += 5.2;
    }
    this.y = Math.max(startY - 4 + boxH, ly) + 6;
  }

  /** Tableau paginé (en-tête répété sur chaque page). */
  table(cols: { header: string; width: number; align?: "left" | "right" | "center"; mono?: boolean }[], rows: string[][], { zebra = true, fontSize = 9 } = {}) {
    const { doc } = this;
    const pad = 2;
    const drawHead = () => {
      doc.setFillColor(...INK).rect(M, this.y - 4.6, this.width, 7.2, "F");
      let x = M;
      this.font(8, "bold", WHITE);
      for (const c of cols) {
        const tx = c.align === "right" ? x + c.width - pad : c.align === "center" ? x + c.width / 2 : x + pad;
        this.text(c.header, tx, this.y, { align: c.align ?? "left" });
        x += c.width;
      }
      this.y += 6;
    };
    this.ensure(16);
    drawHead();
    rows.forEach((row, r) => {
      this.font(fontSize);
      const cells = row.map((v, i) => this.split(v, cols[i].width - 2 * pad));
      const n = Math.max(1, ...cells.map((c) => c.length));
      const h = n * this.lh(fontSize) + 2.6;
      if (this.ensure(h + 1)) drawHead();
      if (zebra && r % 2 === 1) doc.setFillColor(...PAPER).rect(M, this.y - 3.6, this.width, h, "F");
      let x = M;
      cols.forEach((c, i) => {
        this.font(fontSize, "normal", INK, c.mono ? "courier" : "helvetica");
        const tx = c.align === "right" ? x + c.width - pad : c.align === "center" ? x + c.width / 2 : x + pad;
        cells[i].forEach((l, k) => this.text(l, tx, this.y + k * this.lh(fontSize), { align: c.align ?? "left" }));
        x += c.width;
      });
      this.y += h;
      doc.setDrawColor(...LINE).line(M, this.y - 3.6, this.pw - M, this.y - 3.6);
    });
    this.y += 3;
  }

  /** Bloc de totaux aligné à droite. */
  totals(rows: { label: string; value: string; strong?: boolean; highlight?: boolean }[]) {
    const w = 82;
    const x = this.pw - M - w;
    this.ensure(rows.length * 6.5 + 4);
    for (const r of rows) {
      if (r.highlight) this.doc.setFillColor(...PRIMARY_SOFT).rect(x, this.y - 4.4, w, 6.6, "F");
      this.font(r.strong ? 10.5 : 9.5, r.strong ? "bold" : "normal", r.strong ? INK : MUTED).text(r.label, x + 3, this.y);
      this.font(r.strong ? 10.5 : 9.5, r.strong ? "bold" : "normal", INK).text(r.value, x + w - 3, this.y, { align: "right" });
      this.y += 6.5;
    }
    this.y += 2;
  }
}

async function writer(head: Meta) {
  const [doc, { company, logo }] = await Promise.all([newDoc(), loadCompany()]);
  const w = new Writer(doc, company, logo, head);
  doc.setProperties({ title: clean([head.title, head.number].filter(Boolean).join(" ")), author: clean(company.name), creator: clean(company.name) });
  w.header();
  return w;
}

const clientLines = (c: Quote["client"]) => [
  c?.name || "-",
  c?.company ?? "",
  c?.address ?? "",
  [c?.phone, c?.email].filter(Boolean).join("  ·  "),
  [c?.nif && `NIF : ${c.nif}`, c?.stat && `STAT : ${c.stat}`].filter(Boolean).join("   "),
];

const LINE_COLS = [
  { header: "Désignation", width: 76 },
  { header: "Qté", width: 15, align: "right" as const },
  { header: "Unité", width: 15 },
  { header: "PU HT", width: 28, align: "right" as const },
  { header: "Remise", width: 16, align: "right" as const },
  { header: "Total HT", width: 30, align: "right" as const },
];
const qtyText = (q: number) => String(Number(q) || 0).replace(".", ",");
const lineRows = (lines: DocumentLine[]) =>
  lines.map((l) => [l.designation, qtyText(l.qty), l.unit || "", money(l.unitPrice), l.discountPct ? `${String(l.discountPct).replace(".", ",")} %` : "", money(lineTotal(l))]);

/** Coordonnées de paiement (RIB, Mobile Money). */
function paymentInfo(w: Writer) {
  const { bankDetails, mobileMoney } = w.company;
  if (!bankDetails && !mobileMoney) return;
  w.section("Modalités de règlement");
  if (bankDetails) w.paragraph(`Virement bancaire : ${bankDetails}`);
  if (mobileMoney) w.paragraph(`Mobile Money : ${mobileMoney}`);
}

function amountWords(w: Writer, phrase: string, ttc: number) {
  w.ensure(12);
  w.paragraph(`${phrase} : ${amountInWordsMGA(ttc, { capitalize: true })} (${money(ttc)} TTC).`, { style: "italic", size: 9.5 });
}

// ============================================================
// DEVIS
// ============================================================
export async function printQuotePDF(quote: Quote, { motorRef }: { motorRef?: string } = {}) {
  const w = await writer({
    title: "Devis",
    number: quote.number,
    meta: [
      ["Date", formatDay(quote.createdAt)],
      ["Valable jusqu'au", formatDay(quote.validUntil)],
    ],
  });
  w.partyBlocks([["Dossier", motorRef ?? ""]], "Client", clientLines(quote.client));
  w.table(LINE_COLS, lineRows(quote.lines));
  w.totals([
    { label: "Total HT", value: money(quote.totals.ht) },
    { label: `TVA ${quote.vatRate} %`, value: money(quote.totals.vat) },
    { label: "Total TTC", value: money(quote.totals.ttc), strong: true, highlight: true },
  ]);
  amountWords(w, "Arrêté le présent devis à la somme de", quote.totals.ttc);
  if (quote.notes) {
    w.section("Notes");
    w.paragraph(quote.notes);
  }
  w.section("Conditions");
  w.paragraph(`Devis valable jusqu'au ${formatDay(quote.validUntil)}.${w.company.paymentTerms ? ` ${w.company.paymentTerms}` : ""}`);
  paymentInfo(w);

  // signatures
  w.ensure(36);
  w.y += 3;
  const half = (w.width - 10) / 2;
  w.doc.setDrawColor(...LINE);
  w.doc.rect(M, w.y, half, 28);
  w.doc.rect(M + half + 10, w.y, half, 28);
  w.font(8.5, "bold", MUTED).text("Bon pour accord du client", M + 3, w.y + 5);
  w.font(7.5, "normal", MUTED).text("Date, signature et cachet, précédés de la mention « Bon pour accord »", M + 3, w.y + 9);
  w.font(8.5, "bold", MUTED).text(`Pour ${w.company.name}`, M + half + 13, w.y + 5);
  w.y += 32;

  w.footer();
  w.doc.save(`devis_${quote.number}.pdf`);
}

// ============================================================
// FACTURE / AVOIR
// ============================================================
export async function printInvoicePDF(invoice: Invoice, { originNumber, motorRef }: { originNumber?: string; motorRef?: string } = {}) {
  const credit = invoice.type === "credit_note";
  const draft = invoice.status === "draft";
  const w = await writer({
    title: `${credit ? "Avoir" : "Facture"}${draft ? " (brouillon)" : ""}`,
    number: invoice.number,
    meta: [
      ["Date", formatDay(invoice.issuedAt || invoice.createdAt)],
      ...(!credit ? ([["Échéance", formatDay(invoice.dueDate)]] as [string, string][]) : []),
    ],
  });
  w.partyBlocks(
    [
      [credit ? "Facture d'origine" : "", originNumber ?? ""],
      ["Dossier", motorRef ?? ""],
    ],
    "Facturé à",
    clientLines(invoice.client),
  );
  w.table(LINE_COLS, lineRows(invoice.lines));
  const rows = [
    { label: "Total HT", value: money(invoice.totals.ht) },
    { label: `TVA ${invoice.vatRate} %`, value: money(invoice.totals.vat) },
    { label: credit ? "Total avoir TTC" : "Total TTC", value: money(invoice.totals.ttc), strong: true, highlight: true },
  ];
  if (!credit && !draft && invoice.amountPaid > 0) rows.push({ label: "Déjà réglé", value: money(invoice.amountPaid) }, { label: "Reste à payer", value: money(remainingDue(invoice)), strong: true, highlight: false });
  w.totals(rows);
  amountWords(w, credit ? "Arrêté le présent avoir à la somme de" : "Arrêtée la présente facture à la somme de", invoice.totals.ttc);
  if (invoice.status === "cancelled") w.paragraph("Document annulé.", { style: "bold", color: PRIMARY_DARK });
  if (invoice.notes) {
    w.section("Notes");
    w.paragraph(invoice.notes);
  }
  if (!credit) {
    w.section("Conditions de paiement");
    w.paragraph(`Échéance : ${formatDay(invoice.dueDate)}.${w.company.paymentTerms ? ` ${w.company.paymentTerms}` : ""}`);
    paymentInfo(w);
  }
  w.footer();
  w.doc.save(`${credit ? "avoir" : "facture"}_${invoice.number ?? "brouillon"}.pdf`);
}

// ============================================================
// REÇU DE PAIEMENT
// ============================================================
export async function printReceiptPDF(payment: Payment, invoice: Invoice) {
  const ref = `R-${(invoice.number ?? "").replace(/^FA-/, "")}-${payment.id.slice(0, 4).toUpperCase()}`;
  const w = await writer({
    title: "Reçu",
    number: ref,
    meta: [["Date du règlement", formatDay(payment.date)]],
  });
  w.partyBlocks(
    [
      ["Facture", invoice.number ?? "-"],
      ["Date facture", formatDay(invoice.issuedAt)],
    ],
    "Reçu de",
    clientLines(invoice.client),
  );
  w.section("Règlement");
  w.keyValues(
    [
      ["Montant reçu", money(payment.amount)],
      ["Moyen de paiement", PAYMENT_METHOD_LABELS[payment.method] ?? payment.method],
      ["Référence", payment.reference || "-"],
      ["Date", formatDay(payment.date)],
    ],
    2,
  );
  w.paragraph(`Nous reconnaissons avoir reçu la somme de ${amountInWordsMGA(payment.amount)} (${money(payment.amount)}) au titre de la facture ${invoice.number ?? ""}.`, { style: "italic" });
  if (payment.note) w.paragraph(payment.note);
  w.y += 2;
  w.totals([
    { label: "Total facture TTC", value: money(invoice.totals.ttc) },
    { label: "Total réglé à ce jour", value: money(invoice.amountPaid) },
    { label: "Reste à payer", value: money(remainingDue(invoice)), strong: true, highlight: true },
  ]);
  w.ensure(30);
  w.y += 4;
  w.font(8.5, "bold", MUTED).text(`Pour ${w.company.name} (signature et cachet)`, w.pw - M, w.y, { align: "right" });
  w.footer();
  w.doc.save(`recu_${ref}.pdf`);
}

// ============================================================
// FICHE MOTEUR (ordre de réparation)
// ============================================================
export async function printMotorPDF(motor: Motor, reports?: Report[]) {
  const [w, list] = await Promise.all([
    writer({
      title: "Fiche de réparation",
      number: motor.orNumber,
      meta: [
        ["Réception", formatDay(motor.receivedAt || motor.createdAt)],
        ["Date promise", formatDay(motor.promisedAt)],
        ["Statut", STATUS_LABELS[motor.status] ?? motor.status],
      ],
    }),
    reports ? Promise.resolve(reports) : getReportsByMotor(motor.id).catch(() => [] as Report[]),
  ]);

  w.partyBlocks(
    [
      ["Technicien", motor.technicianName || "-"],
      ["Priorité", PRIORITY_LABELS[motor.priority ?? "normal"]],
      ["Garantie", motor.warranty ? `Oui${motor.warrantyNote ? ` (${motor.warrantyNote})` : ""}` : "Non"],
      ["N° de série", motor.serialNumber || "-"],
    ],
    "Client",
    [motor.clientName || "-", motor.clientCompany ?? "", motor.clientAddress ?? "", [motor.clientPhone, motor.clientEmail].filter(Boolean).join("  ·  ")],
  );

  w.section("Caractéristiques du moteur");
  w.keyValues([
    ["Type", motorTypeLabel(motor)],
    ["Modèle", motor.templateCustom || "-"],
    ["Puissance", motor.power ? `${motor.power} kW` : "-"],
    ["Tension", motor.voltage ? `${motor.voltage} V` : "-"],
    ["Courant", motor.current ? `${motor.current} A` : "-"],
    ["Fréquence", motor.frequency ? `${motor.frequency} Hz` : "-"],
    ["Vitesse", motor.rpm ? `${motor.rpm} tr/min` : "-"],
    ["Cos phi", motor.powerFactor || "-"],
    ["Classe d'isolation", motor.insulationClass || "-"],
    ["Couplage", couplingLabel(motor.couplingType)],
    ["Pôles", motor.poles || "-"],
    ["N° de série", motor.serialNumber || "-"],
  ]);

  w.section("Panne et diagnostic");
  if (motor.faultTypeName) w.keyValues([["Type de panne", motor.faultTypeName]], 1);
  w.paragraph(motor.faultDescription || "Aucune description de panne.");
  if (motor.diagnostic?.length)
    w.table(
      [
        { header: "Contrôle", width: 100 },
        { header: "Valeur attendue", width: 80 },
      ],
      motor.diagnostic.map((d) => [d.title, d.expected || "-"]),
    );

  w.section("Étapes de réparation");
  if (motor.steps?.length)
    w.table(
      [
        { header: "Étape", width: 62 },
        { header: "Sous-étapes", width: 24, align: "center" },
        { header: "Statut", width: 30 },
        { header: "Complétée le", width: 32 },
        { header: "Validée le", width: 32 },
      ],
      motor.steps.map((s) => {
        const done = (s.substepsCompleted ?? []).filter(Boolean).length;
        return [s.name, `${done}/${s.substeps.length}`, s.validated ? "Validée" : s.completed ? "À valider" : "À faire", s.completedAt ? formatDate(s.completedAt) : "-", s.validatedAt ? formatDate(s.validatedAt) : "-"];
      }),
    );
  else w.paragraph("Aucune étape.");

  w.section("Rapports et mesures");
  const sorted = [...list].sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));
  if (!sorted.length) w.paragraph("Aucun rapport.");
  for (const r of sorted) {
    w.ensure(16);
    w.paragraph(`${r.stepName} — ${formatDate(r.createdAt)} — ${r.userName || "-"}${r.photos?.length ? ` — ${r.photos.length} photo(s)` : ""}`, { style: "bold", size: 9.5 });
    if (r.description) w.paragraph(r.description, { indent: 4, size: 9 });
    if (r.measurements) w.paragraph(r.measurements, { indent: 4, size: 8.5, family: "courier" });
  }

  w.section("Dates");
  const days = motorDurationDays(motor);
  w.keyValues([
    ["Création", formatDay(motor.createdAt)],
    ["Fin", motorEndDate(motor)?.toLocaleDateString("fr-FR") ?? "-"],
    ["Durée", days === null ? "-" : `${days} jour(s)`],
    ["Imprimé le", new Date().toLocaleDateString("fr-FR")],
  ]);

  w.footer();
  w.doc.save(`fiche_${motor.orNumber || motor.clientName || motor.id}.pdf`);
}

// ============================================================
// LISTE DES MOTEURS TERMINÉS
// ============================================================
export async function exportCompletedPDF(motors: Motor[]) {
  const now = new Date();
  const thisMonth = motors.filter((mo) => {
    const d = motorEndDate(mo);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const durations = motors.map(motorDurationDays).filter((d): d is number => d !== null);
  const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  const w = await writer({ title: "Moteurs terminés", meta: [["Édité le", now.toLocaleDateString("fr-FR")]] });
  w.keyValues(
    [
      ["Total", String(motors.length)],
      ["Ce mois", String(thisMonth)],
      ["Durée moyenne", `${avg} jour(s)`],
    ],
    3,
  );
  w.table(
    [
      { header: "N° OR", width: 26 },
      { header: "Client", width: 42 },
      { header: "Moteur", width: 34 },
      { header: "Technicien", width: 30 },
      { header: "Fin", width: 24 },
      { header: "Durée", width: 24, align: "right" },
    ],
    motors.map((m) => {
      const d = motorDurationDays(m);
      return [
        m.orNumber || "-",
        [m.clientName || "-", m.clientCompany].filter(Boolean).join("\n"),
        `${motorTypeLabel(m, true)} ${m.power ? `${m.power} kW` : ""}`.trim(),
        m.technicianName || "-",
        motorEndDate(m)?.toLocaleDateString("fr-FR") ?? "-",
        d === null ? "-" : `${d} j`,
      ];
    }),
    { fontSize: 8.5 },
  );
  w.footer();
  w.doc.save(`termines_${now.toISOString().split("T")[0]}.pdf`);
}
