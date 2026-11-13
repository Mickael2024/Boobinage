// Export CSV pour la comptabilité : séparateur « ; », BOM UTF-8 (ouverture directe dans Excel).

type Cell = string | number | null | undefined;

const escape = (v: Cell) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCSV(headers: string[], rows: Cell[][]) {
  return [headers, ...rows].map((r) => r.map(escape).join(";")).join("\r\n");
}

/** Déclenche le téléchargement d'un fichier CSV. */
export function downloadCSV(filename: string, headers: string[], rows: Cell[][]) {
  const blob = new Blob(["﻿" + toCSV(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Date ISO → JJ/MM/AAAA pour les exports. */
export const csvDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR");
};
