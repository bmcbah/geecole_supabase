import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { supabase } from "../../../shared/lib/supabase/client";
import {
  activateGradingFormulaVersion,
  createGradingFormulaVersion,
  listAssessmentTypes,
  listVersionedGradingFormulas,
  type VersionedFormulaListItem,
} from "../services/annual-settings.service";
import {
  SettingsEntityDialog,
  type EntityField,
  type EntityValue,
} from "./SettingsEntityDialog";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";

type Option = { label: string; value: string };

export function GradingFormulasSettingsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<VersionedFormulaListItem[]>([]);
  const [types, setTypes] = useState<Array<{ code: string; name: string }>>([]);
  const [cycles, setCycles] = useState<Option[]>([]);
  const [levels, setLevels] = useState<Option[]>([]);
  const [editing, setEditing] = useState<
    VersionedFormulaListItem | null | undefined
  >(undefined);
  const [saving, setSaving] = useState(false);
  const editable = Boolean(
    year && !["closed", "archived"].includes(year.status),
  );

  const load = useCallback(async () => {
    if (!year) return;
    const [formulaRows, typeRows, cycleRows, levelRows] = await Promise.all([
      listVersionedGradingFormulas(year.id),
      listAssessmentTypes(year.id),
      supabase
        .from("academic_cycles")
        .select("id,name")
        .eq("institution_id", institutionId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("academic_year_levels")
        .select("id,level_name_snapshot")
        .eq("academic_year_id", year.id)
        .eq("is_active", true)
        .order("sort_order"),
    ]);
    if (cycleRows.error) throw cycleRows.error;
    if (levelRows.error) throw levelRows.error;
    setItems(formulaRows);
    setTypes(
      typeRows
        .filter((item) => item.is_active)
        .map(({ code, name }) => ({ code, name })),
    );
    setCycles(
      (cycleRows.data ?? []).map((item) => ({
        label: item.name,
        value: item.id,
      })),
    );
    setLevels(
      (levelRows.data ?? []).map((item) => ({
        label: item.level_name_snapshot,
        value: item.id,
      })),
    );
  }, [institutionId, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const fields = useMemo<EntityField[]>(
    () => [
      { key: "name", label: "Nom de la formule", required: true },
      { key: "code", label: "Code", required: true },
      {
        key: "scope_type",
        label: "Appliquer à",
        type: "select",
        required: true,
        options: [
          { label: "Un cycle (tous ses niveaux)", value: "cycle" },
          { label: "Un niveau (prioritaire sur le cycle)", value: "level" },
        ],
        resetOnChange: ["cycle_id", "level_id"],
      },
      {
        key: "cycle_id",
        label: "Cycle",
        type: "select",
        required: true,
        options: cycles,
        visibleWhen: (values) => values.scope_type === "cycle",
      },
      {
        key: "level_id",
        label: "Niveau",
        type: "select",
        required: true,
        options: levels,
        visibleWhen: (values) => values.scope_type === "level",
      },
      { key: "rounding", label: "Décimales", type: "number", required: true },
      ...types.map<EntityField>((type) => ({
        key: `weight_${type.code}`,
        label: `Poids — ${type.name}`,
        type: "number",
        required: true,
      })),
    ],
    [cycles, levels, types],
  );

  const initial = useMemo<Record<string, EntityValue>>(
    () => ({
      name: editing?.name ?? "",
      code: editing?.code ?? "",
      scope_type: editing?.scopeType ?? "cycle",
      cycle_id: editing?.scopeType === "cycle" ? editing.scopeId : "",
      level_id: editing?.scopeType === "level" ? editing.scopeId : "",
      rounding: editing?.rules.rounding ?? 2,
      ...Object.fromEntries(
        types.map((type) => [
          `weight_${type.code}`,
          editing?.rules.weights[type.code] ?? 1,
        ]),
      ),
    }),
    [editing, types],
  );

  const submit = async (values: Record<string, EntityValue>) => {
    if (!year) return;
    const scopeType = String(values.scope_type) as "cycle" | "level";
    const scopeId = String(
      values[scopeType === "cycle" ? "cycle_id" : "level_id"] ?? "",
    );
    setSaving(true);
    try {
      await createGradingFormulaVersion({
        institutionId,
        yearId: year.id,
        seriesId: editing?.seriesId,
        name: String(values.name),
        code: String(values.code).toUpperCase(),
        scopeType,
        scopeId,
        rounding: Number(values.rounding),
        weights: Object.fromEntries(
          types.map((type) => [
            type.code,
            Number(values[`weight_${type.code}`]),
          ]),
        ),
      });
      setEditing(undefined);
      await load();
      notify({
        severity: "success",
        summary: editing
          ? "Nouvelle version créée et appliquée"
          : "Formule créée et appliquée",
      });
    } catch {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail:
          "Vérifiez le périmètre et les poids. Une seule formule active est autorisée par périmètre.",
      });
    } finally {
      setSaving(false);
    }
  };

  const reactivate = async (row: VersionedFormulaListItem) => {
    if (!year || !row.scopeType || !row.scopeId) return;
    setSaving(true);
    try {
      await activateGradingFormulaVersion({
        institutionId,
        yearId: year.id,
        versionId: row.versionId,
        scopeType: row.scopeType,
        scopeId: row.scopeId,
      });
      await load();
      notify({
        severity: "success",
        summary: `Version v${row.version} réactivée`,
      });
    } catch {
      notify({ severity: "error", summary: "Réactivation impossible" });
    } finally {
      setSaving(false);
    }
  };

  if (!year)
    return (
      <Message
        severity="warn"
        text="Sélectionnez une année scolaire avant de configurer les formules."
      />
    );
  return (
    <>
      <SettingsTablePanel
        sectionHeader={
          <PageHeader
            title="Formules de calcul"
            description="Versionnez la pondération des types de note et appliquez-la à un cycle ou à un niveau. Le niveau est prioritaire."
            headingAs="h2"
            compact
          />
        }
        alert={
          !types.length ? (
            <Message
              severity="warn"
              text="Activez d’abord les types de note du catalogue GeeCole : ils constituent les variables de la formule."
            />
          ) : undefined
        }
        toolbar={
          <div className="flex justify-end">
            <Button
              label="Nouvelle formule"
              icon="pi pi-plus"
              size="small"
              disabled={!editable || !types.length}
              onClick={() => setEditing(null)}
            />
          </div>
        }
        dataTable={
          <DataTable
            value={items}
            dataKey="versionId"
            size="small"
            stripedRows
            emptyMessage="Aucune formule versionnée"
          >
            <Column field="name" header="Formule" />
            <Column field="code" header="Code" />
            <Column
              header="Version"
              body={(row: VersionedFormulaListItem) => (
                <Tag
                  value={`v${row.version}`}
                  severity={row.assignmentId ? "success" : "secondary"}
                />
              )}
            />
            <Column
              header="Périmètre actif"
              body={(row: VersionedFormulaListItem) =>
                row.scopeType
                  ? `${row.scopeType === "level" ? "Niveau" : "Cycle"} — ${[...cycles, ...levels].find((item) => item.value === row.scopeId)?.label ?? "—"}`
                  : "Historique"
              }
            />
            <Column
              header="Poids"
              body={(row: VersionedFormulaListItem) =>
                Object.entries(row.rules.weights)
                  .map(([code, weight]) => `${code}×${weight}`)
                  .join(" · ")
              }
            />
            <Column
              header="Actions"
              body={(row: VersionedFormulaListItem) => (
                <div className="flex gap-1">
                  <Button
                    label="Nouvelle version"
                    icon="pi pi-copy"
                    text
                    size="small"
                    disabled={!editable}
                    onClick={() => setEditing(row)}
                  />
                  {!row.assignmentId && row.scopeType && (
                    <Button
                      label="Réactiver"
                      icon="pi pi-refresh"
                      text
                      size="small"
                      disabled={!editable || saving}
                      onClick={() => void reactivate(row)}
                    />
                  )}
                </div>
              )}
            />
          </DataTable>
        }
      />
      <SettingsEntityDialog
        header={
          editing ? `Nouvelle version de ${editing.name}` : "Nouvelle formule"
        }
        visible={editing !== undefined}
        loading={saving}
        fields={fields}
        initial={initial}
        columns={2}
        onHide={() => setEditing(undefined)}
        onSubmit={submit}
      />
    </>
  );
}
