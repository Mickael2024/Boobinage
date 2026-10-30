import { useEffect, useState } from "react";
import { getMotorById, getReportById } from "../../lib/db";
import { formatDate } from "../../lib/format";
import type { Motor, Report } from "../../lib/types";
import { Loading } from "../ui/Display";
import { Modal, ModalSubtitle } from "../ui/Modal";

/** Fenêtre « Détail rapport » (technicien et admin). */
export function ReportDetailModal({ reportId, onClose }: { reportId: string | null; onClose: () => void }) {
  const [data, setData] = useState<{ report: Report; motor: Motor | null } | null>(null);

  useEffect(() => {
    setData(null);
    if (!reportId) return;
    let alive = true;
    (async () => {
      const report = await getReportById(reportId);
      if (!report) return onClose();
      const motor = await getMotorById(report.motorId);
      if (alive) setData({ report, motor });
    })().catch(console.error);
    return () => {
      alive = false;
    };
  }, [reportId, onClose]);

  const r = data?.report;
  return (
    <Modal open={!!reportId} onClose={onClose} title="Détail rapport" icon="file-alt" wide confirmText="Fermer" cancelText={null}>
      {!r ? (
        <Loading />
      ) : (
        <div>
          <h4 className="mb-1 text-[1.05rem] font-semibold text-primary">Rapport - {r.stepName}</h4>
          <p className="text-ink-2">
            Moteur : {data.motor?.clientName || r.motorClient} | Envoyé par : {r.userName} | {formatDate(r.createdAt)}
          </p>
          {r.description && (
            <>
              <ModalSubtitle>Description</ModalSubtitle>
              <p className="whitespace-pre-wrap">{r.description}</p>
            </>
          )}
          {r.measurements && (
            <>
              <ModalSubtitle>Mesures</ModalSubtitle>
              <pre className="rounded-lg bg-mist p-3 font-mono text-[0.85rem] whitespace-pre-wrap">{r.measurements}</pre>
            </>
          )}
          {!!r.photos?.length && (
            <>
              <ModalSubtitle>Photos</ModalSubtitle>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {r.photos.map((p, i) => (
                  <img key={i} src={p} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-lg border border-line object-cover" />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
