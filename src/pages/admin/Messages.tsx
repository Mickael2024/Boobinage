import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, IconButton } from "../../components/ui/Button";
import { useConfirm } from "../../components/ui/Confirm";
import { Badge, Empty, PageHeader } from "../../components/ui/Display";
import { Icon } from "../../components/ui/Icon";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import { SearchInput } from "../../components/ui/SearchInput";
import { Select } from "../../components/ui/Select";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { FOCUS_RING } from "../../components/ui/styles";
import { useToast } from "../../components/ui/Toast";
import { createClient, deleteWebRequest, getClients, getWebRequests, setWebRequestStatus } from "../../lib/db";
import { couplingLabel, formatDate, matchesSearch, MESSAGE_STATUS_LABELS } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import BRAND from "../../lib/brand";
import type { MessageStatus, WebRequest } from "../../lib/types";

const FILTERS = [
  { value: "all", label: "Tous les statuts" },
  { value: "new", label: "Nouveaux" },
  { value: "read", label: "Lus" },
  { value: "replied", label: "Répondus" },
  { value: "archived", label: "Archivés" },
];
const TONE = { new: "warning", read: "info", replied: "success", archived: "neutral" } as const;

const linkCls = `inline-flex items-center gap-2 rounded-[10px] border border-primary-border bg-primary px-3.5 py-1.5 text-[0.8rem] font-semibold text-on-primary transition hover:bg-primary-light ${FOCUS_RING}`;

function mailto(msg: WebRequest) {
  const subject = `${BRAND.name} - Votre demande de devis`;
  const body = `Bonjour ${msg.clientName || ""},\n\nNous avons bien reçu votre demande de devis.\n\nNotre équipe vous contactera dans les plus brefs délais.\n\nCordialement,\n\n${BRAND.name}`;
  return `mailto:${msg.clientEmail || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const kind = (t?: string) => (t === "three_phase" ? "Triphasé" : t === "single_phase" ? "Monophasé" : "-");

export function Messages() {
  const notify = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data, loading, error, reload, setData } = useAsync(getWebRequests);
  const messages = useMemo(
    () => (data ?? []).filter((m) => (filter === "all" || m.status === filter) && matchesSearch(search, m.clientName, m.clientEmail, m.clientPhone, m.clientCompany, m.description, m.power)),
    [data, filter, search],
  );
  const pager = usePagination(messages, 10);

  /** Fiche client (existante si même email / téléphone, sinon créée) puis éditeur de devis pré-rempli. */
  const convert = async (msg: WebRequest) => {
    try {
      const clients = await getClients();
      const digits = (s?: string) => (s ?? "").replace(/\D/g, "");
      const email = (msg.clientEmail ?? "").trim().toLowerCase();
      let client = clients.find((c) => (email && (c.email ?? "").toLowerCase() === email) || (digits(msg.clientPhone).length >= 6 && digits(c.phone) === digits(msg.clientPhone)));
      if (!client) {
        client = await createClient({
          name: (msg.clientName || "Client du site").trim(),
          company: msg.clientCompany?.trim() || "",
          phone: msg.clientPhone?.trim() || "",
          email: msg.clientEmail?.trim() || "",
          address: msg.clientAddress?.trim() || "",
          notes: "Créé depuis une demande de devis du site",
        });
        notify(`Fiche client « ${client.name} » créée`, "success");
      } else notify(`Fiche client existante utilisée : ${client.name}`, "info");
      if (msg.status === "new") await setWebRequestStatus(msg.id, "read");
      navigate(`/admin/quotes/new?client=${client.id}&request=${msg.id}`);
    } catch (e) {
      console.error(e);
      notify("Conversion impossible", "error");
    }
  };

  const setStatus = async (id: string, status: MessageStatus, message: string) => {
    await setWebRequestStatus(id, status);
    setData((list) => list?.map((m) => (m.id === id ? { ...m, status } : m)));
    notify(message, "success");
  };

  return (
    <>
      <PageHeader title="Demandes de devis (web)" icon="envelope">
        <Button icon="sync-alt" onClick={reload}>
          Actualiser
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput inline value={search} onChange={setSearch} placeholder="Nom, email, téléphone, panne…" />
        <Select inline aria-label="Filtrer par statut" value={filter} onChange={setFilter} options={FILTERS} />
      </div>

      {loading && !data ? (
        <SkeletonRows />
      ) : error && !data ? (
        <Empty>Erreur de chargement</Empty>
      ) : !messages.length ? (
        <Empty>{search || filter !== "all" ? "Aucune demande ne correspond" : "Aucune demande de devis"}</Empty>
      ) : (
        <>
        <div className="grid gap-4 lg:grid-cols-2">
          {pager.pageItems.map((msg) => (
            <article key={msg.id} className={`flex flex-col rounded-xl border bg-white p-5 shadow-xs ${msg.status === "new" ? "border-l-4 border-line border-l-warning" : "border-line"}`}>
              <header className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5 text-[0.88rem] text-ink-2 [&_i]:w-4 [&_i]:text-primary">
                  <h4 className="text-base font-semibold text-ink">
                    <Icon name="user" className="text-primary" /> {msg.clientName || "Inconnu"}
                  </h4>
                  <p className="[overflow-wrap:anywhere]">
                    <Icon name="envelope" /> {msg.clientEmail || "-"} | <Icon name="phone" /> {msg.clientPhone || "-"}
                  </p>
                  {msg.clientCompany && (
                    <p>
                      <Icon name="building" /> {msg.clientCompany}
                    </p>
                  )}
                  {msg.clientAddress && (
                    <p>
                      <Icon name="map-marker-alt" /> {msg.clientAddress}
                    </p>
                  )}
                </div>
                <Badge tone={TONE[msg.status] ?? "neutral"}>{MESSAGE_STATUS_LABELS[msg.status] ?? msg.status}</Badge>
              </header>
              <div className="mb-3 space-y-0.5 rounded-[10px] bg-mist p-3.5 text-[0.88rem] text-ink-2 [&_strong]:text-ink">
                <p>
                  <strong>Type moteur :</strong> {kind(msg.motorType)}
                </p>
                <p>
                  <strong>Puissance :</strong> {msg.power || "-"} kW | <strong>Tension :</strong> {msg.voltage || "-"} V
                </p>
                <p>
                  <strong>Courant :</strong> {msg.current || "-"} A | <strong>Fréquence :</strong> {msg.frequency || "-"} Hz
                </p>
                <p>
                  <strong>Vitesse :</strong> {msg.rpm || "-"} RPM | <strong>Cos φ :</strong> {msg.powerFactor || "-"}
                </p>
                <p>
                  <strong>Classe :</strong> {msg.insulationClass || "-"} | <strong>Couplage :</strong> {couplingLabel(msg.couplingType)}
                </p>
                <p className="whitespace-pre-wrap">
                  <strong>Panne :</strong> {msg.description || "-"}
                </p>
                <p>
                  <strong>Date :</strong> {formatDate(msg.createdAt)}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2">
                {msg.status === "new" && (
                  <Button size="sm" icon="check" onClick={() => setStatus(msg.id, "read", "Demande marquée comme lue")}>
                    Marquer lu
                  </Button>
                )}
                {msg.status === "read" && (
                  <Button size="sm" variant="success" icon="reply" onClick={() => setStatus(msg.id, "replied", "Demande marquée comme répondue")}>
                    Marquer répondu
                  </Button>
                )}
                {msg.status !== "archived" && (
                  <Button size="sm" icon="archive" onClick={() => setStatus(msg.id, "archived", "Demande archivée")}>
                    Archiver
                  </Button>
                )}
                <Button size="sm" icon="file-signature" onClick={() => convert(msg)}>
                  Créer client + devis
                </Button>
                <a
                  href={mailto(msg)}
                  className={linkCls}
                  onClick={() => {
                    if (msg.status === "new" || msg.status === "read") void setStatus(msg.id, "replied", "Demande marquée comme répondue");
                  }}
                >
                  <Icon name="envelope" /> Répondre
                </a>
                {msg.clientPhone && (
                  <a href={`tel:${msg.clientPhone}`} className={linkCls}>
                    <Icon name="phone" /> Appeler
                  </a>
                )}
                <IconButton
                  icon="trash"
                  label="Supprimer"
                  tone="danger"
                  className="ml-auto"
                  onClick={() =>
                    confirm({
                      title: "Supprimer la demande",
                      message: "Voulez-vous vraiment supprimer cette demande de devis ?",
                      icon: "trash",
                      confirmText: "Supprimer",
                      danger: true,
                      onConfirm: async () => {
                        await deleteWebRequest(msg.id);
                        setData((list) => list?.filter((x) => x.id !== msg.id));
                        notify("Demande supprimée", "success");
                      },
                    })
                  }
                />
              </div>
            </article>
          ))}
        </div>
        <Pagination page={pager.page} pageCount={pager.pageCount} onChange={pager.setPage} summary={pager.summary} />
        </>
      )}
    </>
  );
}
