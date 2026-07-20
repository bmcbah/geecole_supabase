import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { Message } from "primereact/message";
import { MultiSelect } from "primereact/multiselect";
import type { AppRole } from "../../../shared/lib/supabase/database.types";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { getPedagogicalSettings, savePedagogicalSettings } from "../services/pedagogical-settings.service";

const roleOptions: { label: string; value: AppRole }[] = [
  { label: "Propriétaire", value: "owner" }, { label: "Administrateur", value: "admin" },
  { label: "Secrétariat", value: "secretary" }, { label: "Enseignant", value: "teacher" },
];

const defaults = { appreciations_required: false, ranking_displayed: true, coefficients_displayed: true, average_decimal_places: 2, notifications_enabled: true, multiple_teachers_enabled: false, validation_roles: ["owner", "admin"] as AppRole[], publication_roles: ["owner", "admin"] as AppRole[] };

export function PedagogicalSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [value, setValue] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const editable = Boolean(year && !["closed", "archived"].includes(year.status));
  const load = useCallback(async () => {
    if (!year) return;
    try { const stored = await getPedagogicalSettings(institutionId, year.id); if (stored) setValue({ ...defaults, ...stored }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Chargement impossible."); }
  }, [institutionId, year]);
  useEffect(() => { void load(); }, [load]);
  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  async function submit() { setSaving(true); try { await savePedagogicalSettings(institutionId, year!.id, value); notify({ severity: "success", summary: "Paramètres pédagogiques enregistrés" }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Enregistrement impossible."); } finally { setSaving(false); } }
  return <section className="space-y-3"><PageHeader headingAs="h2" compact title="Paramètres pédagogiques" description="Règles transverses appliquées aux notes, moyennes et bulletins." />{error ? <Message severity="error" text={error} /> : null}<div className="grid gap-3 lg:grid-cols-2"><SettingsCard title="Notes et calculs"><Toggle label="Appréciations obligatoires" checked={value.appreciations_required} onChange={(checked) => setValue((current) => ({ ...current, appreciations_required: checked }))} /><Toggle label="Afficher le classement" checked={value.ranking_displayed} onChange={(checked) => setValue((current) => ({ ...current, ranking_displayed: checked }))} /><Toggle label="Afficher les coefficients" checked={value.coefficients_displayed} onChange={(checked) => setValue((current) => ({ ...current, coefficients_displayed: checked }))} /><Toggle label="Autoriser plusieurs enseignants par cours" checked={value.multiple_teachers_enabled} onChange={(checked) => setValue((current) => ({ ...current, multiple_teachers_enabled: checked }))} /><label className="field mt-3"><span>Décimales des moyennes</span><InputNumber value={value.average_decimal_places} min={0} max={4} showButtons onValueChange={(event) => setValue((current) => ({ ...current, average_decimal_places: event.value ?? 2 }))} /></label></SettingsCard><SettingsCard title="Validation et publication"><label className="field"><span>Profils autorisés à valider</span><MultiSelect value={value.validation_roles} options={roleOptions} display="chip" className="w-full" onChange={(event) => { const roles: unknown = event.value; if (Array.isArray(roles)) setValue((current) => ({ ...current, validation_roles: roles.filter((role): role is AppRole => typeof role === "string" && roleOptions.some((option) => option.value === role)) })); }} /></label><label className="field mt-3"><span>Profils autorisés à publier</span><MultiSelect value={value.publication_roles} options={roleOptions} display="chip" className="w-full" onChange={(event) => { const roles: unknown = event.value; if (Array.isArray(roles)) setValue((current) => ({ ...current, publication_roles: roles.filter((role): role is AppRole => typeof role === "string" && roleOptions.some((option) => option.value === role)) })); }} /></label><Toggle label="Notifications pédagogiques" checked={value.notifications_enabled} onChange={(checked) => setValue((current) => ({ ...current, notifications_enabled: checked }))} /></SettingsCard></div><div className="flex justify-end"><Button label="Enregistrer" icon="pi pi-check" loading={saving} disabled={!editable} onClick={() => void submit()} /></div></section>;
}

function SettingsCard({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-4 mt-0 text-sm font-semibold text-slate-900">{title}</h3>{children}</section>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 text-sm text-slate-700"><span>{label}</span><InputSwitch checked={checked} onChange={(event) => onChange(Boolean(event.value))} /></label>; }
