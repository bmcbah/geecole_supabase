import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
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
  SettingsEntityDialog,
  type EntityField,
  type EntityValue,
} from "./SettingsEntityDialog";

export function FinancialBenefitTemplatesPanel() {
  const { institutionId } = useAcademicSession();
  const notify = useToast();
  const [templates, setTemplates] = useState<FinancialBenefitTemplate[]>([]);
  const [editing, setEditing] = useState<FinancialBenefitTemplate | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setTemplates(await listFinancialBenefitTemplates(institutionId));
  }, [institutionId]);

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
      is_stackable: editing?.isStackable ?? true,
      is_active: editing?.isActive ?? true,
    }),
    [editing],
  );

  const submit = async (values: Record<string, EntityValue>) => {
    setSaving(true);
    try {
      await saveFinancialBenefitTemplate(
        institutionId,
        {
          name: String(values.name),
          code: String(values.code),
          description: String(values.description || "") || null,
          benefitType: values.benefit_type as FinancialBenefitTemplate["benefitType"],
          calculationType: values.calculation_type as FinancialBenefitTemplate["calculationType"],
          defaultValue: Number(values.default_value),
          feeTypeIds: [],
          scope: "institution",
          cycleIds: [],
          levelIds: [],
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

  return (
    <>
      <SettingsTablePanel
        sectionHeader={
          <PageHeader
            title="Modèles d’avantages"
            description="Configurez les remises, bourses, exonérations et prises en charge réutilisables."
            meta={<Tag value={`${templates.length} modèle${templates.length > 1 ? "s" : ""}`} severity="secondary" />}
            headingAs="h2"
            compact
          />
        }
        toolbar={
          <Toolbar
            start={<span className="text-xs text-slate-500">Les modèles sont appliqués ensuite à un frais précis du dossier élève.</span>}
            end={<Button label="Nouveau modèle" icon="pi pi-plus" size="small" onClick={() => setEditing(null)} />}
            className="min-h-0 rounded-none border-0 bg-transparent p-0"
          />
        }
        dataTable={
          <DataTable value={templates} dataKey="id" size="small" stripedRows emptyMessage="Aucun modèle d’avantage">
            <Column field="name" header="Modèle" />
            <Column field="code" header="Code" />
            <Column header="Type" body={(row: FinancialBenefitTemplate) => financialBenefitTypeLabels[row.benefitType]} />
            <Column
              header="Valeur"
              body={(row: FinancialBenefitTemplate) =>
                row.calculationType === "percentage"
                  ? `${row.defaultValue}%`
                  : Number(row.defaultValue).toLocaleString("fr-GN")
              }
            />
            <Column header="Calcul" body={(row: FinancialBenefitTemplate) => financialBenefitCalculationLabels[row.calculationType]} />
            <Column header="Cumul" body={(row: FinancialBenefitTemplate) => <Tag value={row.isStackable ? "Oui" : "Non"} severity={row.isStackable ? "success" : "warning"} />} />
            <Column header="Statut" body={(row: FinancialBenefitTemplate) => <Tag value={row.isActive ? "Actif" : "Inactif"} severity={row.isActive ? "success" : "secondary"} />} />
            <Column
              header=""
              headerClassName="text-right"
              bodyClassName="text-right"
              body={(row: FinancialBenefitTemplate) => <Button icon="pi pi-pencil" text size="small" onClick={() => setEditing(row)} />}
            />
          </DataTable>
        }
      />

      <SettingsEntityDialog
        header="Modèle d’avantage"
        visible={editing !== undefined}
        loading={saving}
        columns={2}
        fields={[
          { key: "name", label: "Libellé", required: true },
          { key: "code", label: "Code", required: true },
          {
            key: "benefit_type",
            label: "Type",
            type: "select",
            required: true,
            options: Object.entries(financialBenefitTypeLabels).map(([value, label]) => ({ value, label })),
          },
          {
            key: "calculation_type",
            label: "Mode de calcul",
            type: "select",
            required: true,
            options: Object.entries(financialBenefitCalculationLabels).map(([value, label]) => ({ value, label })),
          },
          { key: "default_value", label: "Valeur", type: "number", required: true },
          { key: "description", label: "Description", type: "textarea", span: 2 },
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
