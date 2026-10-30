import { useCallback, useState } from "react";
import { ReportDetailModal } from "../../components/motor/ReportDetail";
import { Button, IconButton } from "../../components/ui/Button";
import { useConfirm } from "../../components/ui/Confirm";
import { Badge, Empty, Loading, PageHeader } from "../../components/ui/Display";
import { Icon } from "../../components/ui/Icon";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { deleteReport, getReports, updateReport } from "../../lib/db";
import { formatDate, REPORT_STATUS_LABELS } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import type { ReportStatus } from "../../lib/types";

const FILTERS = [
  { value: "all", label: "Tous les statuts" },
  { value: "unread", label: "Non lus" },
  { value: "read", label: "Lus" },
  { value: "approved", label: "Approuvés" },
];
const TONE = { approved: "success", unread: "warning", read: "neutral" } as const;

export function Reports() {
  const notify = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const { data, loading, setData } = useAsync(getReports);
  const reports = (data ?? []).filter((r) => filter === "all" || r.status === filter);

  const setStatus = async (id: string, status: ReportStatus, message: string) => {
    await updateReport(id, { status });
    setData((list) => list?.map((r) => (r.id === id ? { ...r, status } : r)));
    notify(message, "success");
  };

  return (
    <>
      <PageHeader title="RAPPORTS DES TECHNICIENS" icon="file-alt">
        <Select inline aria-label="Filtrer par statut" value={filter} onChange={setFilter} options={FILTERS} />
      </PageHeader>

      {loading && !data ? (
        <Loading />
      ) : !reports.length ? (
        <Empty>Aucun rapport</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((r) => (
            <article key={r.id} className={`flex flex-col rounded-xl border bg-white p-5 shadow-xs ${r.status === "unread" ? "border-l-4 border-line border-l-warning" : "border-line"}`}>
              <header className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-semibold">
                    <Icon name="file-alt" className="text-primary" /> {r.stepName}
                  </h4>
                  <p className="text-[0.85rem] text-ink-2">
                    Moteur : {r.motorClient || "Inconnu"} (<span className="font-mono">{r.motorPower || "-"}</span> kW)
                  </p>
                </div>
                <Badge tone={TONE[r.status] ?? "neutral"}>{REPORT_STATUS_LABELS[r.status] ?? r.status}</Badge>
              </header>
              <div className="mb-3 space-y-0.5 text-[0.88rem] text-ink-2 [&_strong]:text-ink">
                <p>
                  <strong>Technicien :</strong> {r.userName}
                </p>
                <p>
                  <strong>Date :</strong> {formatDate(r.createdAt)}
                </p>
                {r.description && <p>{r.description.substring(0, 100)}…</p>}
                {!!r.photos?.length && (
                  <p>
                    <Icon name="image" /> {r.photos.length} photo(s)
                  </p>
                )}
              </div>
              {!!r.photos?.length && (
                <div className="mb-3 flex gap-2">
                  {r.photos.slice(0, 3).map((p, i) => (
                    <button key={i} type="button" onClick={() => setOpen(r.id)} className="overflow-hidden rounded-lg border border-line transition hover:border-primary">
                      <img src={p} alt={`Photo ${i + 1}`} className="size-14 object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <Button size="sm" icon="eye" onClick={() => setOpen(r.id)}>
                  Voir
                </Button>
                {r.status === "unread" && (
                  <Button size="sm" variant="success" icon="check" onClick={() => setStatus(r.id, "read", "Marqué comme lu")}>
                    Lu
                  </Button>
                )}
                {r.status !== "approved" && (
                  <Button size="sm" icon="check-double" onClick={() => setStatus(r.id, "approved", "Approuvé")}>
                    Approuver
                  </Button>
                )}
                <IconButton
                  icon="trash"
                  label="Supprimer"
                  tone="danger"
                  className="ml-auto"
                  onClick={() =>
                    confirm({
                      title: "Supprimer",
                      message: "Supprimer ce rapport ?",
                      icon: "trash",
                      confirmText: "Supprimer",
                      danger: true,
                      onConfirm: async () => {
                        await deleteReport(r.id);
                        setData((list) => list?.filter((x) => x.id !== r.id));
                        notify("Supprimé", "success");
                      },
                    })
                  }
                />
              </div>
            </article>
          ))}
        </div>
      )}

      <ReportDetailModal reportId={open} onClose={close} />
    </>
  );
}
