import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import {
  financialBenefitCalculationLabels,
  financialBenefitTypeLabels,
  type FinancialBenefitTemplate,
} from "../../financial-management/domain/financial-benefit";
import {
  listFinancialBenefitTemplates,
  saveFinancialBenefitTemplate,
} from "../../financial-management/services/financial-benefits.service";
import {
  listAnnualAcademicCycles,
  listAnnualAcademicLevels,
} from "../services/academic-structure.service";
import { listFeeTypes, type FeeType } from "../services/school-fees.service";
import {
  SettingsEntityDialog,
  type EntityField,
  type EntityValue,
} from "./SettingsEntityDialog";

const scopeLabels: Record<FinancialBenefitTemplate["scope"], string> = {
  institution: "Tout l’établissement",
  cycle: "Cycles sélectionnés",
  level: "Niveaux sélectionnés",
};

export function FinancialBenefitTemplatesPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [templates, setTemplates] = useState<FinancialBenefitTemplate[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [editing, setEditing] = useState<FinancialBenefitTemplate | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!year) return;
    try {
      const [nextTemplates, nextCycles, nextLevels, nextFeeTypes] = await Promise.all([
        listFinancialBenefitTemplates(institutionId),
        listAnnualAcademicCycles(year.id),
        listAnnualAcademicLevels(year.id),
        listFeeTypes(institutionId),
      ]);
      setTemplates(nextTemplates);
      setCycles(nextCycles.filter((item: any) => item.is_active !== false));
      setLevels(nextLevels.filter((item: any) => item.is_active !== false));
      setFeeTypes(nextFeeTypes.filter((item) => item.is_active));
      setFailure("");
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Impossible de charger les modèles d’avantages.");
    }
  }, [institutionId, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const initial = useMemo<Record<string, EntityValue>>(
    () => ({
      name: editing?.name ?? "",
      code: editing?.code ?? "",
      description: editing?.description ?? "",
      benefit_type: editing?.benefitType ?? "discount",
      calculation_type: editing?.calculationType ?? "fixed",
      default_value: editing?.defaultValue ?? 0,
      scope: editing?.scope ?? "institution",
      cycle_ids: editing?.cycleIds ?? [],
      level_ids: editing?.levelIds ?? [],
      fee_type_ids: editing?.feeTypeIds ?? [],
      is_stackable: editing?.isStackable ?? true,
      is_active: editing?.isActive ?? true,
    }),
    [editing],
  );

  const submit = async (values: Record<string, EntityValue>) => {
    setSaving(true);
    try {
      const scope = values.scope as FinancialBenefitTemplate["scope"];
      await saveFinancialBenefitTemplate(
        institutionId,
        {
          name: String(values.name),
          code: String(values.code),
          description: String(values.description || "") || null,
          benefitType: values.benefit_type as FinancialBenefitTemplate["benefitType"],
          calculationType: values.calculation_type as FinancialBenefitTemplate["calculationType"],
          defaultValue: Number(values.default_value),
          feeTypeIds: (values.fee_type_ids as string[]) ?? [],
          scope,
          cycleIds: scope === "cycle" ? ((values.cycle_ids as string[]) ?? []) : [],
          levelIds: scope === "level" ? ((values.level_ids as string[]) ?? []) : [],
          isStackable: Boolean(values.is_stackable),
          isActive: Boolean(values.is_active),
        },
        editing?.id,
      );
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Modèle d’avantage enregistré" });
    } catch (error) {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!year) {
    return <Message severity="warn" text="Sélectionnez une année scolaire pour configurer la portée des avantages." />;
  }

  return (
    <>
      <SettingsTablePanel
        alert={failure ? <Message severity="error" text={failure} /> : undefined}
        sectionHeader={
          <PageHeader
            title="Modèles d’avantages"
            description="Définissez le calcul, les frais concernés et les élèves auxquels une remise, une bourse ou une exonération peut être accordée."
            meta={<Tag value={`${templates.length} modèle${templates.length > 1 ? "s" : ""}`} severity="secondary" />}
            headingAs="h2"
            compact
          />
        }
        toolbar={
          <Toolbar
            start={<span className="text-xs text-slate-500">Une portée établissement s’applique à tous. Une portée cycle ou niveau limite les choix proposés dans le dossier élève.</span>}
            end={<Button label="Nouveau modèle" icon="pi pi-plus" size="small" onClick={() => setEditing(null)} />}
            className="min-h-0 rounded-none border-0 bg-transparent p-0"
          />
        }
        dataTable={
          <DataTable value={templates} dataKey="id" size="small" stripedRows emptyMessage="Aucun modèle d’avantage" responsiveLayout="scroll">
            <Column field="name" header="Modèle" />
            <Column header="Type" body={(row: FinancialBenefitTemplate) => financialBenefitTypeLabels[row.benefitType]} />
            <Column
              header="Valeur"
              body={(row: FinancialBenefitTemplate) =>
                row.calculationType === "percentage" ? `${row.defaultValue}%` : Number(row.defaultValue).toLocaleString("fr-GN")
              }
            />
            <Column header="Portée" body={(row: FinancialBenefitTemplate) => <Tag value={scopeLabels[row.scope]} severity="info" />} />
            <Column
              header="Frais concernés"
              body={(row: FinancialBenefitTemplate) => row.feeTypeIds.length ? `${row.feeTypeIds.length} catégorie${row.feeTypeIds.length > 1 ? "s" : ""}` : "Tous les frais"}
            />
            <Column header="Cumul" body={(row: FinancialBenefitTemplate) => <Tag value={row.isStackable ? "Cumulable" : "Non cumulable"} severity={row.isStackable ? "success" : "warning"} />} />
            <Column header="Statut" body={(row: FinancialBenefitTemplate) => <Tag value={row.isActive ? "Actif" : "Inactif"} severity={row.isActive ? "success" : "secondary"} />} />
            <Column header="" headerClassName="text-right" bodyClassName="text-right" body={(row: FinancialBenefitTemplate) => <Button icon="pi pi-pencil" text size="small" onClick={() => setEditing(row)} />} />
          </DataTable>
        }
      />

      <SettingsEntityDialog
        header={editing?.id ? "Modifier le modèle d’avantage" : "Nouveau modèle d’avantage"}
        visible={editing !== undefined}
        loading={saving}
        columns={2}
        fields={[
          { key: "name", label: "Libellé", required: true },
          { key: "code", label: "Code", required: true },
          { key: "benefit_type", label: "Type", type: "select", required: true, options: Object.entries(financialBenefitTypeLabels).map(([value, label]) => ({ value, label })) },
          { key: "calculation_type", label: "Mode de calcul", type: "select", required: true, options: Object.entries(financialBenefitCalculationLabels).map(([value, label]) => ({ value, label })) },
          { key: "default_value", label: "Valeur par défaut", type: "number", required: true },
          { key: "scope", label: "Portée", type: "select", required: true, options: Object.entries(scopeLabels).map(([value, label]) => ({ value, label })), resetOnChange: ["cycle_ids", "level_ids"] },
          { key: "cycle_ids", label: "Cycles concernés", type: "multiselect", required: true, span: 2, options: cycles.map((cycle) => ({ value: cycle.id, label: cycle.name })), visibleWhen: (values) => values.scope === "cycle" },
          { key: "level_ids", label: "Niveaux concernés", type: "multiselect", required: true, span: 2, options: levels.map((level) => ({ value: level.id, label: level.name })), visibleWhen: (values) => values.scope === "level" },
          { key: "fee_type_ids", label: "Catégories de frais (vide = toutes)", type: "multiselect", span: 2, options: feeTypes.map((feeType) => ({ value: feeType.id, label: feeType.name })) },
          { key: "description", label: "Description et conditions d’attribution", type: "textarea", span: 2 },
          { key: "is_stackable", label: "Avantage cumulable", type: "boolean" },
          { key: "is_active", label: "Modèle actif", type: "boolean" },
        ] as EntityField[]}
        initial={initial}
        onHide={() => setEditing(undefined)}
        onSubmit={submit}
      />
    </>
  );
}
