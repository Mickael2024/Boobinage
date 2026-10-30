import type { Motor } from "./types";
import { couplingLabel, formatDay, motorDurationDays, motorEndDate, motorTypeLabel } from "./format";

const BRAND: [number, number, number] = [242, 140, 40];
const INK: [number, number, number] = [37, 42, 48];
const MUTED: [number, number, number] = [100, 116, 139];

// jsPDF est chargé à la demande : il n'alourdit pas le premier chargement
async function newDoc() {
  const { jsPDF } = await import("jspdf");
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}
type Doc = Awaited<ReturnType<typeof newDoc>>;

function header(doc: Doc, subtitle: string) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFontSize(22).setTextColor(...BRAND).text("FORTICO REWIND", pw / 2, 25, { align: "center" });
  doc.setFontSize(14).setTextColor(...INK).text(subtitle, pw / 2, 37, { align: "center" });
  doc.setFontSize(10).setTextColor(...MUTED).text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, pw / 2, 45, { align: "center" });
}

function pageNumbers(doc: Doc) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const pc = doc.getNumberOfPages();
  for (let i = 1; i <= pc; i++) {
    doc.setPage(i);
    doc.setFontSize(8).setTextColor(148, 163, 184).text(`Page ${i}/${pc}`, pw / 2, ph - 10, { align: "center" });
  }
}

const durationText = (m: Motor) => {
  const d = motorDurationDays(m);
  return d === null ? "-" : `${d} jours`;
};

export async function printMotorPDF(motor: Motor) {
  const doc = await newDoc();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 15;
  const usable = pw - 2 * margin;
  header(doc, "FICHE TECHNIQUE MOTEUR");
  let y = 57;
  doc.setDrawColor(200, 200, 200).line(margin, y, pw - margin, y);
  y += 15;

  const section = (title: string) => {
    doc.setFontSize(12).setTextColor(...BRAND).text(title, margin, y);
    y += 10;
    doc.setFontSize(10).setTextColor(...INK);
  };
  const line = (text: string, step = 7) => {
    doc.text(text, margin, y);
    y += step;
  };

  section("INFORMATIONS CLIENT");
  line(`Client : ${motor.clientName || "-"}`);
  line(`Téléphone : ${motor.clientPhone || "-"}`);
  line(`Entreprise : ${motor.clientCompany || "-"}`);
  line(`Adresse : ${motor.clientAddress || "-"}`);
  if (motor.faultTypeName) line(`Type de panne : ${motor.faultTypeName}`);
  line("Panne décrite :", 6);
  const faultLines = doc.splitTextToSize(motor.faultDescription || "Aucune", usable - 10);
  doc.text(faultLines, margin + 5, y);
  y += faultLines.length * 5 + 10;

  section("TECHNICIEN");
  line(`Nom : ${motor.technicianName || "-"}`);
  line(`Email : ${motor.technicianEmail || "-"}`);
  line(`Entreprise : ${motor.technicianCompany || "-"}`, 15);
  doc.setDrawColor(200, 200, 200).line(margin, y, pw - margin, y);
  y += 12;

  section("CARACTÉRISTIQUES");
  const specs = [
    `Type : ${motorTypeLabel(motor)}`,
    `Puissance : ${motor.power || "-"} kW`,
    `Tension : ${motor.voltage || "-"} V`,
    `Courant : ${motor.current || "-"} A`,
    `Fréquence : ${motor.frequency || "-"} Hz`,
    `Vitesse : ${motor.rpm || "-"} RPM`,
    `Cos φ : ${motor.powerFactor || "-"}`,
    `Classe : ${motor.insulationClass || "-"}`,
    `Couplage : ${couplingLabel(motor.couplingType)}`,
    `Pôles : ${motor.poles || "-"}`,
  ];
  specs.forEach((spec, i) => doc.text(spec, margin + (i % 2) * (usable / 2), y + Math.floor(i / 2) * 7));
  y += Math.ceil(specs.length / 2) * 7 + 15;
  if (y > ph - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(10).setTextColor(...MUTED);
  doc.text(`Créé : ${formatDay(motor.createdAt)}`, margin, y);
  doc.text(`Fin : ${motorEndDate(motor)?.toLocaleDateString("fr-FR") ?? "-"}`, margin + 100, y);
  doc.text(`Durée : ${durationText(motor)}`, margin, y + 8);

  pageNumbers(doc);
  doc.save(`fiche_${motor.clientName || motor.id}.pdf`);
}

export async function exportCompletedPDF(motors: Motor[]) {
  const doc = await newDoc();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 20;
  header(doc, "Moteurs terminés");
  let y = 60;

  const now = new Date();
  const thisMonth = motors.filter((mo) => {
    const d = motorEndDate(mo);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const durations = motors.map(motorDurationDays).filter((d): d is number => d !== null);
  const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  doc.setFontSize(11).setTextColor(...INK).text(`Total: ${motors.length} | Mois: ${thisMonth} | Moy: ${avg} jours`, m, y);
  y += 15;
  doc.setDrawColor(200, 200, 200).line(m, y, pw - m, y);
  y += 12;

  motors.forEach((motor, i) => {
    if (y > ph - 80) {
      doc.addPage();
      y = 25;
    }
    doc.setFontSize(12).setTextColor(...BRAND).text(`${i + 1}. ${motor.clientName || "Inconnu"}`, m, y);
    const dt = durationText(motor);
    doc.setFontSize(9);
    const bw = doc.getTextWidth(dt) + 10;
    doc.setFillColor(38, 155, 99).roundedRect(pw - m - bw, y - 5, bw, 7, 3, 3, "F");
    doc.setTextColor(255, 255, 255).text(dt, pw - m - bw / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(10).setTextColor(...INK);
    [
      `Client: ${motor.clientName || "-"}`,
      `Entreprise: ${motor.clientCompany || "-"}`,
      `Tél: ${motor.clientPhone || "-"}`,
      `Adresse: ${motor.clientAddress || "-"}`,
      `Tech: ${motor.technicianName || "-"}`,
      `Type: ${motorTypeLabel(motor, true)} | ${motor.power || "-"} kW | ${motor.voltage || "-"} V`,
      `Créé: ${formatDay(motor.createdAt)} | Fin: ${motorEndDate(motor)?.toLocaleDateString("fr-FR") ?? "-"}`,
    ].forEach((l) => {
      doc.text(l, m + 5, y);
      y += 7;
    });
    if (motor.faultDescription) {
      doc.text("Panne:", m + 5, y);
      y += 6;
      doc.splitTextToSize(motor.faultDescription, pw - 2 * m - 10).forEach((l: string) => {
        doc.text(l, m + 10, y);
        y += 5;
      });
    } else {
      doc.text("Panne: -", m + 5, y);
      y += 7;
    }
    y += 5;
    doc.setDrawColor(220, 220, 220).line(m, y, pw - m, y);
    y += 12;
  });

  pageNumbers(doc);
  doc.save(`termines_${new Date().toISOString().split("T")[0]}.pdf`);
}
