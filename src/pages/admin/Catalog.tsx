import { useEffect, useState } from "react";
import { Button, IconButton } from "../../components/ui/Button";
import { useConfirm } from "../../components/ui/Confirm";
import { Badge } from "../../components/ui/Display";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { MoneyInput } from "../../components/ui/MoneyInput";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import { ResponsiveTable } from "../../components/ui/ResponsiveTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { deleteCatalogItem, getCatalog, saveCatalogItem, updateCatalogItem } from "../../lib/db";
import { matchesSearch } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { formatMGA } from "../../lib/money";
import type { CatalogItem } from "../../lib/types";

/** Prestations de base proposées quand le catalogue est vide (prix à renseigner). */
const STARTER: Omit<CatalogItem, "id" | "unitPrice">[] = [
  { designation: "Rebobinage moteur triphasé", unit: "kW", category: "Rebobinage" },
  { designation: "Rebobinage moteur monophasé", unit: "kW", category: "Rebobinage" },
  { designation: "Remplacement de roulement", unit: "u", category: "Pièces" },
  { designation: "Vernis d'imprégnation", unit: "forfait", category: "Fournitures" },
  { designation: "Main-d'œuvre", unit: "h", category: "Main-d'œuvre" },
  { designation: "Diagnostic et essais", unit: "forfait", category: "Main-d'œuvre" },
];

type Form = { designation: string; unit: string; unitPrice: number | null; category: string; active: boolean };
const EMPTY: Form = { designation: "", unit: "u", unitPrice: null, category: "", active: true };

/** Gestion du catalogue de prestations réutilisables dans les devis et factures. */
export function Catalog() {
  const notify = useToast();
  const confirm = useConfirm();
  const { data, loading, reload } = useAsync(getCatalog);
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<{ open: boolean; item?: CatalogItem }>({ open: false });
  const [form, setForm] = useState<Form>(EMPTY);

  useEffect(() => {
    if (edit.open) setForm(edit.item ? { designation: edit.item.designation, unit: edit.item.unit, unitPrice: edit.item.unitPrice, category: edit.item.category ?? "", active: edit.item.active !== false } : EMPTY);
  }, [edit]);

  const items = (data ?? []).filter((c) => matchesSearch(search, c.designation, c.category, c.unit));
  const pager = usePagination(items, 20);

  const save = async () => {
    const designation = form.designation.trim();
    if (!designation) {
      notify("Désignation obligatoire", "error");
      return false;
    }
    const item = { designation, unit: form.unit.trim() || "u", unitPrice: form.unitPrice ?? 0, category: form.category.trim(), active: form.active };
    if (edit.item) await updateCatalogItem(edit.item.id, item);
    else await saveCatalogItem(item);
    notify("Prestation enregistrée", "success");
    void reload();
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput inline value={search} onChange={setSearch} placeholder="Rechercher une prestation…" />
        <div className="flex flex-wrap gap-3">
          {!loading && !data?.length && (
            <Button
              variant="secondary"
              icon="wand-magic-sparkles"
              onClick={async () => {
                for (const s of STARTER) await saveCatalogItem({ ...s, unitPrice: 0, active: true });
                notify("Prestations de base ajoutées : renseignez leurs prix", "success");
                await reload();
              }}
            >
              Prestations de base
            </Button>
          )}
          <Button icon="plus" onClick={() => setEdit({ open: true })}>
            Nouvelle prestation
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <SkeletonRows />
      ) : (
        <>
          <ResponsiveTable
            caption="Catalogue de prestations"
            rows={pager.pageItems}
            rowKey={(c) => c.id}
            empty={search ? "Aucune prestation ne correspond" : "Catalogue vide"}
            columns={[
              { key: "designation", header: "Désignation", render: (c) => <strong>{c.designation}</strong> },
              { key: "category", header: "Catégorie", render: (c) => c.category || "-" },
              { key: "price", header: "PU HT", className: "font-mono whitespace-nowrap tabular-nums", render: (c) => `${formatMGA(c.unitPrice)} / ${c.unit}` },
              { key: "active", header: "État", render: (c) => (c.active === false ? <Badge>Inactive</Badge> : <Badge tone="success">Active</Badge>) },
              {
                key: "actions",
                header: "Actions",
                mobileFull: true,
                render: (c) => (
                  <div className="flex gap-1.5">
                    <IconButton icon="pen" label={`Modifier ${c.designation}`} onClick={() => setEdit({ open: true, item: c })} />
                    <IconButton
                      icon="trash"
                      tone="danger"
                      label={`Supprimer ${c.designation}`}
                      onClick={() =>
                        confirm({
                          title: "Supprimer la prestation",
                          message: `Supprimer « ${c.designation} » du catalogue ? Les devis et factures existants ne sont pas modifiés.`,
                          icon: "trash",
                          confirmText: "Supprimer",
                          danger: true,
                          onConfirm: async () => {
                            await deleteCatalogItem(c.id);
                            notify("Prestation supprimée", "success");
                            void reload();
                          },
                        })
                      }
                    />
                  </div>
                ),
              },
            ]}
          />
          <Pagination page={pager.page} pageCount={pager.pageCount} onChange={pager.setPage} summary={pager.summary} />
        </>
      )}

      <Modal open={edit.open} onClose={() => setEdit({ open: false })} title={edit.item ? "Modifier la prestation" : "Nouvelle prestation"} icon="tags" confirmText="Enregistrer" onConfirm={save}>
        <Field label="Désignation *" htmlFor="cat-designation">
          <input id="cat-designation" className="field-input" maxLength={300} value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
        </Field>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Prix unitaire HT" htmlFor="cat-price">
            <MoneyInput id="cat-price" value={form.unitPrice} onChange={(v) => setForm((f) => ({ ...f, unitPrice: v }))} />
          </Field>
          <Field label="Unité" htmlFor="cat-unit">
            <input id="cat-unit" className="field-input" placeholder="u, h, kW, forfait…" maxLength={20} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
          </Field>
        </div>
        <Field label="Catégorie" htmlFor="cat-category">
          <input id="cat-category" className="field-input" maxLength={80} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
        </Field>
        <label className="flex cursor-pointer items-center gap-2.5 text-[0.9rem]">
          <input type="checkbox" className="size-[18px] accent-primary" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
          Proposée dans les devis et factures
        </label>
      </Modal>
    </>
  );
}
