import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  calculateCourseAverage,
  listFormulaVariables,
} from "../../notes/domain/grading-formula";
import { supabase } from "../../../shared/lib/supabase/client";
import {
  activateGradingFormulaVersion,
  createGradingFormulaVersion,
  listAssessmentTypes,
  listVersionedGradingFormulas,
  type VersionedFormulaListItem,
} from "../services/annual-settings.service";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";

type Option = { label: string; value: string };
type ScopeType = "cycle" | "level";
type Draft = {
  name: string;
  scopeType: ScopeType;
  scopeId: string;
  expression: string;
  rounding: number;
};

const emptyDraft: Draft = {
  name: "",
  scopeType: "cycle",
  scopeId: "",
  expression: "",
  rounding: 2,
};

export function GradingFormulasSettingsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const expressionRef = useRef<HTMLTextAreaElement>(null);
  const [items, setItems] = useState<VersionedFormulaListItem[]>([]);
  const [types, setTypes] = useState<
    Array<{ id: string; code: string; name: string; scale: number }>
  >([]);
  const [cycles, setCycles] = useState<Option[]>([]);
  const [levels, setLevels] = useState<Array<Option & { cycleId: string }>>([]);
  const [editing, setEditing] = useState<
    VersionedFormulaListItem | null | undefined
  >();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [testValues, setTestValues] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<number>();
  const [testError, setTestError] = useState("");
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
        .select("id,level_name_snapshot,cycle_id")
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
        .map(({ id, code, name, scale }) => ({
          id,
          code: code.toUpperCase(),
          name,
          scale,
        })),
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
        cycleId: item.cycle_id,
      })),
    );
  }, [institutionId, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const allowedCodes = useMemo(() => types.map((type) => type.code), [types]);
  const validation = useMemo(
    () => validateExpression(draft.expression, allowedCodes),
    [draft.expression, allowedCodes],
  );
  const scopeOptions = draft.scopeType === "cycle" ? cycles : levels;

  const openEditor = (row?: VersionedFormulaListItem) => {
    const next = row
      ? {
          name: row.name,
          scopeType: row.scopeType ?? "cycle",
          scopeId: row.scopeId ?? "",
          expression: row.rules.expression,
          rounding: row.rules.rounding ?? 2,
        }
      : emptyDraft;
    setEditing(row ?? null);
    setDraft(next);
    setTestValues(Object.fromEntries(types.map((type) => [type.code, 10])));
    setTestResult(undefined);
    setTestError("");
  };

  const closeEditor = () => {
    if (!saving) setEditing(undefined);
  };

  const insertVariable = (code: string) => {
    const textarea = expressionRef.current;
    const start = textarea?.selectionStart ?? draft.expression.length;
    const end = textarea?.selectionEnd ?? start;
    const before = draft.expression.slice(0, start);
    const after = draft.expression.slice(end);
    const value = `${before}${before && !/[\s(+\-*/]$/.test(before) ? " " : ""}${code}${after && !/^[\s)+\-*/]/.test(after) ? " " : ""}${after}`;
    setDraft((current) => ({ ...current, expression: value }));
    setTestResult(undefined);
    requestAnimationFrame(() => textarea?.focus());
  };

  const runTest = () => {
    setTestResult(undefined);
    setTestError("");
    if (!validation.valid) {
      setTestError(validation.error);
      return;
    }
    const referenced = new Set(listFormulaVariables(draft.expression));
    const result = calculateCourseAverage(
      types
        .filter((type) => referenced.has(type.code))
        .map((type) => ({
          value: testValues[type.code] ?? 0,
          scale: 20,
          assessmentTypeCode: type.code,
        })),
      { expression: draft.expression, rounding: draft.rounding },
    );
    if (result.error || result.missingTypeCodes.length) {
      setTestError(
        result.error ??
          `Valeur manquante : ${result.missingTypeCodes.join(", ")}`,
      );
    } else if (result.average !== null) setTestResult(result.average);
  };

  const submit = async () => {
    if (!year || editing === undefined) return;
    if (!draft.name.trim() || !draft.scopeId || !validation.valid) {
      notify({
        severity: "error",
        summary: "Formulaire incomplet",
        detail: !validation.valid
          ? validation.error
          : "Renseignez le nom et le périmètre.",
      });
      return;
    }
    setSaving(true);
    try {
      await createGradingFormulaVersion({
        institutionId,
        yearId: year.id,
        seriesId: editing?.seriesId,
        name: draft.name.trim(),
        code: formulaCodeFromName(draft.name),
        scopeType: draft.scopeType,
        scopeId: draft.scopeId,
        rounding: draft.rounding,
        expression: draft.expression.trim(),
      });
      setEditing(undefined);
      await load();
      notify({
        severity: "success",
        summary: editing
          ? "Nouvelle version créée et appliquée"
          : "Formule créée et appliquée",
      });
    } catch (error) {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: formulaErrorMessage(error),
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
    } catch (error) {
      notify({
        severity: "error",
        summary: "Réactivation impossible",
        detail: formulaErrorMessage(error),
      });
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
  const canSubmit =
    editable &&
    !saving &&
    draft.name.trim() &&
    draft.scopeId &&
    validation.valid;

  return (
    <>
      <SettingsTablePanel
        sectionHeader={
          <PageHeader
            title="Formules de calcul"
            description="Créez une expression avec les codes des types de note, testez-la, puis appliquez sa version à un cycle ou un niveau."
            headingAs="h2"
            compact
          />
        }
        alert={
          !types.length ? (
            <Message
              severity="warn"
              text="Activez d’abord les types de note : leurs codes deviennent les variables de la formule."
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
              onClick={() => openEditor()}
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
            responsiveLayout="scroll"
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
              header="Périmètre"
              body={(row: VersionedFormulaListItem) =>
                row.scopeType
                  ? `${row.scopeType === "level" ? "Niveau" : "Cycle"} — ${[...cycles, ...levels].find((item) => item.value === row.scopeId)?.label ?? "—"}`
                  : "Historique"
              }
            />
            <Column
              header="Expression"
              body={(row: VersionedFormulaListItem) => (
                <code className="text-xs">{row.rules.expression}</code>
              )}
            />
            <Column
              header="Actions"
              body={(row: VersionedFormulaListItem) => (
                <div className="flex flex-wrap gap-1">
                  <Button
                    label="Nouvelle version"
                    icon="pi pi-copy"
                    text
                    size="small"
                    disabled={!editable}
                    onClick={() => openEditor(row)}
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
      <Dialog
        header={
          editing ? `Nouvelle version de ${editing.name}` : "Nouvelle formule"
        }
        visible={editing !== undefined}
        modal
        className="form-dialog form-dialog-wide"
        onHide={closeEditor}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Annuler"
              severity="secondary"
              outlined
              disabled={saving}
              onClick={closeEditor}
            />
            <Button
              label="Enregistrer et appliquer"
              icon="pi pi-check"
              loading={saving}
              disabled={!canSubmit}
              onClick={() => void submit()}
            />
          </div>
        }
      >
        <div className="form-stack gap-6">
          <section className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
            <div className="mb-4">
              <h3 className="m-0 text-sm font-semibold text-slate-900">
                Identification et périmètre
              </h3>
              <p className="mb-0 mt-1 text-xs text-slate-500">
                Le code technique est généré automatiquement à partir du nom.
              </p>
            </div>
            <div className="form-grid">
              <Field label="Nom *">
                <InputText
                  value={draft.name}
                  className="w-full"
                  disabled={Boolean(editing)}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                />
              </Field>
              <Field label="Appliquer à *">
                <Dropdown
                  value={draft.scopeType}
                  options={[
                    { label: "Un cycle", value: "cycle" },
                    { label: "Un niveau (prioritaire)", value: "level" },
                  ]}
                  className="w-full"
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      scopeType: e.value as ScopeType,
                      scopeId: "",
                    }))
                  }
                />
              </Field>
              <Field
                label={draft.scopeType === "cycle" ? "Cycle *" : "Niveau *"}
              >
                <Dropdown
                  value={draft.scopeId}
                  options={scopeOptions}
                  filter
                  className="w-full"
                  placeholder="Sélectionner"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, scopeId: String(e.value) }))
                  }
                />
              </Field>
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 p-4">
            <div className="mb-4">
              <h3 className="m-0 text-sm font-semibold text-slate-900">
                Expression de calcul
              </h3>
              <p className="mb-0 mt-1 text-xs text-slate-500">
                Insérez les types de note comme variables puis validez
                l’expression.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <Field label="Expression *">
                <textarea
                  ref={expressionRef}
                  value={draft.expression}
                  rows={6}
                  spellCheck={false}
                  className={`w-full resize-y rounded-md border px-3 py-2 font-mono text-sm outline-none ${validation.valid ? "border-slate-300" : "border-rose-400"}`}
                  placeholder="(DEVOIR + COMPO * 2) / 3"
                  onChange={(e) => {
                    setDraft((d) => ({
                      ...d,
                      expression: e.target.value.toUpperCase(),
                    }));
                    setTestResult(undefined);
                    setTestError("");
                  }}
                />
                <small
                  className={
                    validation.valid ? "text-emerald-700" : "text-rose-700"
                  }
                >
                  {validation.valid ? "Expression valide." : validation.error}
                </small>
              </Field>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Variables disponibles
                </span>
                <div className="flex min-h-32 flex-wrap content-start gap-2 rounded-lg border border-slate-200 p-3">
                  {types.map((type) => (
                    <Button
                      key={type.id}
                      type="button"
                      label={type.code}
                      size="small"
                      outlined
                      tooltip={`${type.name} · barème /${type.scale}`}
                      onClick={() => insertVariable(type.code)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 max-w-48">
              <Field label="Nombre de décimales">
                <InputNumber
                  value={draft.rounding}
                  min={0}
                  max={4}
                  className="w-full md:w-48"
                  onValueChange={(e) =>
                    setDraft((d) => ({ ...d, rounding: e.value ?? 2 }))
                  }
                />
              </Field>
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold">Tester la formule</h3>
                <p className="mb-0 mt-1 text-xs text-slate-500">
                  Renseignez les valeurs simulées des types utilisés dans
                  l’expression.
                </p>
              </div>
              <Button
                type="button"
                label="Tester"
                icon="pi pi-play"
                size="small"
                outlined
                disabled={!validation.valid}
                onClick={runTest}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {types
                .filter((type) => validation.variables.includes(type.code))
                .map((type) => (
                  <Field key={type.id} label={`${type.code} — ${type.name}`}>
                    <InputNumber
                      value={testValues[type.code] ?? 10}
                      min={0}
                      max={20}
                      maxFractionDigits={2}
                      className="w-full"
                      inputClassName="w-full"
                      onValueChange={(e) => {
                        setTestValues((v) => ({
                          ...v,
                          [type.code]: e.value ?? 0,
                        }));
                        setTestResult(undefined);
                      }}
                    />
                  </Field>
                ))}
            </div>
            {testResult !== undefined && (
              <Message
                className="mt-4 w-full"
                severity="success"
                text={`Résultat : ${testResult.toLocaleString("fr-FR", { maximumFractionDigits: 4 })} / 20`}
              />
            )}
            {testError && (
              <Message
                className="mt-4 w-full"
                severity="error"
                text={testError}
              />
            )}
          </section>
        </div>
      </Dialog>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function validateExpression(
  expression: string,
  allowedCodes: string[],
): { valid: boolean; error: string; variables: string[] } {
  if (!expression.trim())
    return {
      valid: false,
      error: "L’expression est obligatoire.",
      variables: [],
    };
  try {
    const variables = listFormulaVariables(expression);
    const unknown = variables.filter((code) => !allowedCodes.includes(code));
    if (unknown.length)
      return {
        valid: false,
        error: `Variable inconnue : ${unknown.join(", ")}.`,
        variables,
      };
    const result = calculateCourseAverage(
      variables.map((code) => ({
        value: 10,
        scale: 20,
        assessmentTypeCode: code,
      })),
      { expression, rounding: 2 },
    );
    if (result.error) return { valid: false, error: result.error, variables };
    return { valid: true, error: "", variables };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Expression invalide.",
      variables: [],
    };
  }
}

function formulaErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";
  if (message.includes("academic_year_configuration_locked"))
    return "Les formules ne peuvent plus être modifiées pour cette année scolaire.";
  if (
    message.includes("grading_formula_series_year_code_key") ||
    message.includes("duplicate key")
  )
    return "Ce code de formule existe déjà pour cette année.";
  if (message.includes("grading_formula_assignment"))
    return "Une formule active existe déjà sur ce périmètre. Rechargez la page puis réessayez.";
  return message || "Une erreur technique empêche l’enregistrement.";
}

function formulaCodeFromName(name: string) {
  const code = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return code || `FORMULE_${Date.now()}`;
}
