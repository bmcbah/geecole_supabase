import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { MultiSelect } from "primereact/multiselect";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { CodeField } from "../../../shared/components/forms/CodeField";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import { listAnnualAcademicCycles, listAnnualAcademicLevels } from "../services/academic-structure.service";
import { listFeeTypes, type FeeScope, type FeeType } from "../services/school-fees.service";
import {
  deletePaymentPlan,
  listPaymentPlans,
  savePaymentPlan,
  setPaymentPlanActive,
  type PaymentPlan,
  type PaymentPlanInstallment,
  type PaymentPlanKind,
} from "../services/payment-plans.service";

const kindLabels: Record<PaymentPlanKind, string> = {
  cash: "Comptant",
  installments: "Tranches",
  monthly: "Mensualités",
  custom: "Personnalisé",
};

const emptyInstallment = (): PaymentPlanInstallment => ({
  sequence: 1,
  label: "Échéance 1",
  percentage: 100,
  due_date: new Date().toISOString().slice(0, 10),
});

export function PaymentPlansSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [cycles, setCycles] = useState<Awaited<ReturnType<typeof listAnnualAcademicCycles>>>([]);
  const [levels, setLevels] = useState<Awaited<ReturnType<typeof listAnnualAcademicLevels>>>([]);
  const [editing, setEditing] = useState<PaymentPlan | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const editable = Boolean(year && !["closed", "archived"].includes(year.status));

  const load = useCallback(async () => {
    if (!year) return;
    const [nextPlans, nextFeeTypes, nextCycles, nextLevels] = await Promise.all([
      listPaymentPlans(institutionId, year.id),
      listFeeTypes(institutionId),
      listAnnualAcademicCycles(year.id),
      listAnnualAcademicLevels(year.id),
    ]);
    setPlans(nextPlans);
    setFeeTypes(nextFeeTypes);
    setCycles(nextCycles);
    setLevels(nextLevels);
  }, [institutionId, year]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!year) {
    return <Message severity="warn" text="Sélectionnez une année scolaire avant de configurer les plans de paiement." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsTablePanel
        sectionHeader={
          <PageHeader
            title={`Plans de paiement — ${year.name}`}
            description="Définissez la répartition et les dates d’échéance applicables aux futurs dossiers financiers."
            meta={<Tag value={`${plans.length} plan${plans.length > 1 ? "s" : ""}`} severity="secondary" />}
            headingAs="h2"
            compact
          />
        }
        alert={!editable ? <Message severity="info" text={`${year.name} est en lecture seule.`} /> : undefined}
        toolbar={
          <Toolbar
            start={<span className="text-xs text-slate-500">Chaque plan doit répartir exactement 100 %.</span>}
            end={<Button label="Nouveau plan" icon="pi pi-plus" size="small" disabled={!editable || feeTypes.length === 0} onClick={() => setEditing(null)} />}
            className="min-h-0 rounded-none border-0 bg-transparent p-0"
          />
        }
        dataTable={
          <DataTable value={plans} dataKey="id" size="small" stripedRows responsiveLayout="scroll" emptyMessage="Aucun plan de paiement">
            <Column field="name" header="Plan" />
            <Column header="Type" body={(row: PaymentPlan) => kindLabels[row.kind]} />
            <Column header="Portée" body={(row: PaymentPlan) => row.scope === "institution" ? "Établissement" : row.scope === "cycle" ? "Cycles" : "Niveaux"} />
            <Column header="Échéances" body={(row: PaymentPlan) => row.installments.length} />
            <Column header="Statut" body={(row: PaymentPlan) => <Tag value={row.is_active ? "Actif" : "Inactif"} severity={row.is_active ? "success" : "secondary"} />} />
            <Column
              header="Actions"
              headerClassName="text-right"
              bodyClassName="text-right"
              body={(row: PaymentPlan) => (
                <div className="flex justify-end gap-1">
                  <Button icon="pi pi-pencil" text size="small" disabled={!editable} onClick={() => setEditing(row)} />
                  <Button icon={row.is_active ? "pi pi-pause" : "pi pi-play"} text size="small" disabled={!editable} onClick={() => void setPaymentPlanActive(row.id, !row.is_active).then(load)} />
                  <Button icon="pi pi-trash" text size="small" severity="danger" disabled={!editable} onClick={() => void deletePaymentPlan(row.id).then(load)} />
                </div>
              )}
            />
          </DataTable>
        }
      />

      <PaymentPlanDialog
        visible={editing !== undefined}
        loading={saving}
        plan={editing ?? undefined}
        feeTypes={feeTypes.filter((item) => item.is_active)}
        cycles={cycles}
        levels={levels}
        onHide={() => setEditing(undefined)}
        onSubmit={async (value) => {
          setSaving(true);
          try {
            await savePaymentPlan({ ...value, institution_id: institutionId, academic_year_id: year.id }, editing?.id);
            setEditing(undefined);
            await load();
            notify({ severity: "success", summary: "Plan de paiement enregistré" });
          } catch (error) {
            notify({ severity: "error", summary: "Enregistrement impossible", detail: error instanceof Error ? error.message : undefined });
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}

function PaymentPlanDialog({ visible, loading, plan, feeTypes, cycles, levels, onHide, onSubmit }: {
  visible: boolean;
  loading: boolean;
  plan?: PaymentPlan;
  feeTypes: FeeType[];
  cycles: Awaited<ReturnType<typeof listAnnualAcademicCycles>>;
  levels: Awaited<ReturnType<typeof listAnnualAcademicLevels>>;
  onHide: () => void;
  onSubmit: (value: Omit<Parameters<typeof savePaymentPlan>[0], "institution_id" | "academic_year_id">) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<PaymentPlanKind>("cash");
  const [feeTypeIds, setFeeTypeIds] = useState<string[]>([]);
  const [scope, setScope] = useState<FeeScope>("institution");
  const [cycleIds, setCycleIds] = useState<string[]>([]);
  const [levelIds, setLevelIds] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [installments, setInstallments] = useState<PaymentPlanInstallment[]>([emptyInstallment()]);

  useEffect(() => {
    if (!visible) return;
    setName(plan?.name ?? "");
    setCode(plan?.code ?? "");
    setKind(plan?.kind ?? "cash");
    setFeeTypeIds(plan?.fee_type_ids ?? []);
    setScope(plan?.scope ?? "institution");
    setCycleIds(plan?.cycle_ids ?? []);
    setLevelIds(plan?.level_ids ?? []);
    setActive(plan?.is_active ?? true);
    setInstallments(plan?.installments?.length ? plan.installments : [emptyInstallment()]);
  }, [plan, visible]);

  const total = useMemo(() => installments.reduce((sum, row) => sum + Number(row.percentage || 0), 0), [installments]);
  const validTargets = scope === "institution" || (scope === "cycle" ? cycleIds.length > 0 : levelIds.length > 0);
  const valid = name.trim() && code.trim() && feeTypeIds.length > 0 && validTargets && installments.length > 0 && installments.every((row) => row.label.trim() && row.due_date && row.percentage > 0) && Math.abs(total - 100) < 0.001;

  const updateInstallment = (index: number, patch: Partial<PaymentPlanInstallment>) => {
    setInstallments((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  };

  return (
    <Dialog header={plan ? "Modifier le plan" : "Nouveau plan"} visible={visible} modal className="form-dialog form-dialog-wide" onHide={onHide}>
      <div className="form-grid">
        <div className="field"><label htmlFor="plan-name">Nom</label><InputText id="plan-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div className="field"><label htmlFor="plan-code">Code</label><CodeField id="plan-code" value={code} source={name} onChange={setCode} /></div>
        <div className="field"><label htmlFor="plan-kind">Type</label><Dropdown inputId="plan-kind" value={kind} options={Object.entries(kindLabels).map(([value, label]) => ({ value, label }))} onChange={(event) => setKind(event.value as PaymentPlanKind)} /></div>
        <div className="field"><label htmlFor="plan-scope">Portée</label><Dropdown inputId="plan-scope" value={scope} options={[{ label: "Tout l’établissement", value: "institution" }, { label: "Cycles", value: "cycle" }, { label: "Niveaux", value: "level" }]} onChange={(event) => { setScope(event.value as FeeScope); setCycleIds([]); setLevelIds([]); }} /></div>
        <div className="field field-wide"><label htmlFor="plan-fees">Frais concernés</label><MultiSelect inputId="plan-fees" value={feeTypeIds} options={feeTypes.map((item) => ({ label: item.name, value: item.id }))} optionLabel="label" optionValue="value" display="chip" filter onChange={(event) => setFeeTypeIds(event.value as string[])} /></div>
        {scope === "cycle" && <div className="field field-wide"><label htmlFor="plan-cycles">Cycles concernés</label><MultiSelect inputId="plan-cycles" value={cycleIds} options={cycles.map((item) => ({ label: item.name, value: item.id }))} optionLabel="label" optionValue="value" display="chip" onChange={(event) => setCycleIds(event.value as string[])} /></div>}
        {scope === "level" && <div className="field field-wide"><label htmlFor="plan-levels">Niveaux concernés</label><MultiSelect inputId="plan-levels" value={levelIds} options={levels.map((item) => ({ label: `${item.cycle_name_snapshot} — ${item.level_name_snapshot}`, value: item.id }))} optionLabel="label" optionValue="value" display="chip" filter onChange={(event) => setLevelIds(event.value as string[])} /></div>}

        <div className="field-wide flex items-center justify-between border-t border-slate-200 pt-3">
          <div><strong>Échéances</strong><div className="text-xs text-slate-500">Total attendu : 100 %</div></div>
          <Tag value={`${total.toLocaleString("fr-FR")} %`} severity={Math.abs(total - 100) < 0.001 ? "success" : "danger"} />
        </div>

        <div className="field-wide flex flex-col gap-2">
          {installments.map((row, index) => (
            <div className="grid grid-cols-[minmax(0,1fr)_140px_150px_auto] items-end gap-2" key={`${row.sequence}-${index}`}>
              <div className="field"><label htmlFor={`installment-label-${index}`}>Libellé</label><InputText id={`installment-label-${index}`} value={row.label} onChange={(event) => updateInstallment(index, { label: event.target.value })} /></div>
              <div className="field"><label htmlFor={`installment-percent-${index}`}>Pourcentage</label><InputNumber inputId={`installment-percent-${index}`} value={row.percentage} suffix=" %" min={0.01} max={100} onValueChange={(event) => updateInstallment(index, { percentage: event.value ?? 0 })} /></div>
              <div className="field"><label htmlFor={`installment-date-${index}`}>Date</label><InputText id={`installment-date-${index}`} type="date" value={row.due_date} onChange={(event) => updateInstallment(index, { due_date: event.target.value })} /></div>
              <Button icon="pi pi-trash" text severity="danger" disabled={installments.length === 1} onClick={() => setInstallments((current) => current.filter((_, rowIndex) => rowIndex !== index))} />
            </div>
          ))}
          <Button label="Ajouter une échéance" icon="pi pi-plus" outlined size="small" className="self-start" onClick={() => setInstallments((current) => [...current, { ...emptyInstallment(), sequence: current.length + 1, label: `Échéance ${current.length + 1}`, percentage: 0 }])} />
        </div>

        <div className="checkbox-field field-wide"><Checkbox inputId="plan-active" checked={active} onChange={(event) => setActive(Boolean(event.checked))} /><label htmlFor="plan-active">Plan actif</label></div>
        {!valid && <Message className="field-wide" severity="warn" text="Complétez les champs obligatoires et vérifiez que le total des échéances est égal à 100 %." />}
        <div className="dialog-actions field-wide"><Button label="Annuler" severity="secondary" outlined onClick={onHide} /><Button label="Enregistrer" icon="pi pi-check" loading={loading} disabled={!valid} onClick={() => void onSubmit({ name, code, kind, fee_type_ids: feeTypeIds, scope, cycle_ids: cycleIds, level_ids: levelIds, is_active: active, installments })} /></div>
      </div>
    </Dialog>
  );
}