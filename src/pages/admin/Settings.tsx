import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { Empty, Loading, PageHeader } from "../../components/ui/Display";
import { Field } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { Logo } from "../../components/ui/Logo";
import { useToast } from "../../components/ui/Toast";
import { getCompanySettings, saveCompanySettings, uploadCompanyLogo } from "../../lib/db";
import { useAsync } from "../../lib/hooks";
import type { CompanySettings } from "../../lib/types";

type TextKey = Exclude<keyof CompanySettings, "vatRate" | "quoteValidityDays" | "invoiceDueDays" | "updatedAt">;

function Section({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <section className="panel mb-5 p-5 sm:p-6">
      <h3 className="mb-5 flex items-center gap-2.5 border-b border-line pb-3 text-base font-semibold">
        <Icon name={icon} className="text-primary" /> {title}
      </h3>
      {children}
    </section>
  );
}

/** Paramètres entreprise (settings/company) : en-têtes des PDF, TVA, conditions, site vitrine. */
export function Settings() {
  const notify = useToast();
  const { data, loading, error } = useAsync(getCompanySettings);
  const [form, setForm] = useState<CompanySettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <Empty>Erreur de chargement des paramètres</Empty>;
  if (!form) return <Loading />;

  const set = (patch: Partial<CompanySettings>) => setForm((f) => f && { ...f, ...patch });
  const input = (key: TextKey, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label} htmlFor={`st-${key}`}>
      <input id={`st-${key}`} className="field-input" value={form[key] ?? ""} onChange={(e) => set({ [key]: e.target.value })} {...props} />
    </Field>
  );
  const area = (key: TextKey, label: string, rows = 3, placeholder = "") => (
    <Field label={label} htmlFor={`st-${key}`}>
      <textarea id={`st-${key}`} rows={rows} className="field-input" placeholder={placeholder} value={form[key] ?? ""} onChange={(e) => set({ [key]: e.target.value })} />
    </Field>
  );
  const num = (key: "vatRate" | "quoteValidityDays" | "invoiceDueDays", label: string, max: number) => (
    <Field label={label} htmlFor={`st-${key}`}>
      <input id={`st-${key}`} type="number" min={0} max={max} step="any" className="field-input font-mono" value={form[key]} onChange={(e) => set({ [key]: e.target.value === "" ? 0 : Number(e.target.value) })} />
    </Field>
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim()) return notify("La raison sociale est obligatoire", "error");
    if (!(form.vatRate >= 0 && form.vatRate <= 100)) return notify("Taux de TVA invalide", "error");
    if (form.mapUrl && !/^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(form.mapUrl)) return notify("Le lien de carte doit être une URL « embed » Google Maps (https://www.google.com/maps/embed?pb=…)", "warning");
    setBusy(true);
    try {
      const { updatedAt: _ignored, ...rest } = form;
      const cleaned = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
      await saveCompanySettings(cleaned as Partial<CompanySettings>);
      notify("Paramètres enregistrés", "success");
    } catch (err) {
      console.error(err);
      notify("Enregistrement impossible", "error");
    } finally {
      setBusy(false);
    }
  };

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return notify("Choisissez une image (PNG ou JPEG)", "warning");
    if (file.size > 2 * 1024 * 1024) return notify("Logo : 2 Mo maximum", "warning");
    setUploading(true);
    try {
      const url = await uploadCompanyLogo(file);
      set({ logoUrl: url });
      await saveCompanySettings({ logoUrl: url });
      notify("Logo enregistré", "success");
    } catch (err) {
      console.error(err);
      notify("Envoi du logo impossible (Firebase Storage indisponible ?)", "error");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <>
      <PageHeader title="Paramètres de l'entreprise" icon="building" subtitle="Coordonnées affichées sur les devis, factures, reçus et sur le site vitrine" />
      <form onSubmit={submit} noValidate className="mx-auto max-w-[900px]">
        <Section icon="id-card" title="Identité">
          <div className="mb-5 flex flex-wrap items-center gap-4">
            {form.logoUrl ? <img src={form.logoUrl} alt="Logo de l'entreprise" className="size-20 rounded-xl border border-line object-contain" /> : <Logo size={80} />}
            <div className="flex flex-wrap gap-2">
              <input ref={fileInput} id="st-logo" type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => uploadLogo(e.target.files?.[0])} />
              <Button variant="secondary" icon="upload" loading={uploading} onClick={() => fileInput.current?.click()}>
                {form.logoUrl ? "Changer le logo" : "Ajouter un logo"}
              </Button>
              {form.logoUrl && (
                <Button
                  variant="secondary"
                  icon="times"
                  onClick={async () => {
                    set({ logoUrl: "" });
                    await saveCompanySettings({ logoUrl: "" });
                    notify("Logo retiré", "success");
                  }}
                >
                  Retirer
                </Button>
              )}
            </div>
          </div>
          <div className="grid gap-x-4 sm:grid-cols-2">
            {input("name", "Raison sociale *", { maxLength: 120 })}
            {input("phone", "Téléphone", { type: "tel" })}
            {input("email", "Email", { type: "email" })}
            {input("website", "Site web")}
          </div>
          {area("address", "Adresse", 2)}
          <div className="grid gap-x-4 sm:grid-cols-3">
            {input("nif", "NIF")}
            {input("stat", "STAT")}
            {input("rcs", "RCS")}
          </div>
        </Section>

        <Section icon="calculator" title="Facturation">
          <div className="grid gap-x-4 sm:grid-cols-3">
            {num("vatRate", "Taux de TVA (%)", 100)}
            {num("quoteValidityDays", "Validité des devis (jours)", 365)}
            {num("invoiceDueDays", "Délai de paiement (jours)", 365)}
          </div>
          {area("paymentTerms", "Conditions de paiement", 2, "Ex. : 50 % d'acompte à la commande, solde à la livraison.")}
          {area("bankDetails", "Coordonnées bancaires (RIB)", 2, "Banque, titulaire, n° de compte…")}
          {area("mobileMoney", "Mobile Money", 2, "Ex. : MVola 034 00 000 00 (Jeff Elec)")}
          {area("footer", "Pied de page des documents", 2, "Mentions légales, capital, etc. (par défaut : raison sociale + NIF/STAT/RCS)")}
        </Section>


        <div className="flex justify-end">
          <Button type="submit" iconRight="save" loading={busy}>
            Enregistrer
          </Button>
        </div>
      </form>
    </>
  );
}
