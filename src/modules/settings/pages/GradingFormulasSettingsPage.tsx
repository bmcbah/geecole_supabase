import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  deleteGradingFormula,
  listAssessmentTypes,
  listGradingFormulas,
  saveGradingFormula,
} from "../services/annual-settings.service";
import type { Database } from "../../../shared/lib/supabase/database.types";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { TableSearch } from "../../../shared/components/TableSearch";
import { useToast } from "../../../shared/components/toast-context";

type Formula = Database["public"]["Tables"]["grading_formulas"]["Row"];
type AssessmentType = Database["public"]["Tables"]["assessment_types"]["Row"];

type FormulaDraft = {
  name: string;
  code: string;
  expression: string;
  description: string;
  isDefault: boolean;
};

type Token =
  | { kind: "number"; value: number; position: number }
  | { kind: "variable"; value: string; position: number }
  | { kind: "operator"; value: "+" | "-" | "*" | "/"; position: number }
  | { kind: "left"; value?: never; position: number }
  | { kind: "right"; value?: never; position: number };

const emptyDraft: FormulaDraft = {
  name: "",
  code: "",
  expression: "",
  description: "",
  isDefault: false,
};

export function GradingFormulasSettingsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<Formula[]>([]);
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([]);
  const [editing, setEditing] = useState<Formula | null | undefined>(undefined);
  const [draft, setDraft] = useState<FormulaDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [testValues, setTestValues] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<number>();
  const [testError, setTestError] = useState("");
  const expressionRef = useRef<HTMLTextAreaElement>(null);

  const editable = Boolean(
    year && !["closed", "archived"].includes(year.status),
  );

  const load = useCallback(async () => {
    if (!year) return;
    const [formulaRows, assessmentRows] = await Promise.all([
      listGradingFormulas(year.id),
      listAssessmentTypes(year.id),
    ]);
    setItems(formulaRows);
    setAssessmentTypes(assessmentRows.filter((item) => item.is_active));
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  const variableCodes = useMemo(
    () =>
      assessmentTypes
        .map((item) => item.code.trim().toUpperCase())
        .filter(Boolean),
    [assessmentTypes],
  );

  const expressionValidation = useMemo(
    () => validateFormulaExpression(draft.expression, variableCodes),
    [draft.expression, variableCodes],
  );

  const openEditor = (formula?: Formula) => {
    setEditing(formula ?? null);
    setDraft({
      name: formula?.name ?? "",
      code: formula?.code ?? "",
      expression: formula?.expression ?? "",
      description: formula?.description ?? "",
      isDefault: formula?.is_default ?? false,
    });
    setTestValues(Object.fromEntries(variableCodes.map((code) => [code, 10])));
    setTestResult(undefined);
    setTestError("");
  };

  const closeEditor = () => {
    if (saving) return;
    setEditing(undefined);
    setDraft(emptyDraft);
    setTestResult(undefined);
    setTestError("");
  };

  const insertVariable = (code: string) => {
    const textarea = expressionRef.current;
    const start = textarea?.selectionStart ?? draft.expression.length;
    const end = textarea?.selectionEnd ?? start;
    const before = draft.expression.slice(0, start);
    const after = draft.expression.slice(end);
    const needsSpaceBefore = before.length > 0 && !/[\s(+\-*/]$/.test(before);
    const needsSpaceAfter = after.length > 0 && !/^[\s)+\-*/]/.test(after);
    const inserted = `${needsSpaceBefore ? " " : ""}${code}${needsSpaceAfter ? " " : ""}`;

    setDraft((current) => ({
      ...current,
      expression: `${before}${inserted}${after}`,
    }));

    requestAnimationFrame(() => {
      if (!textarea) return;
      const cursor = start + inserted.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const runTest = () => {
    setTestResult(undefined);
    setTestError("");
    const validation = validateFormulaExpression(
      draft.expression,
      variableCodes,
    );
    if (!validation.valid) {
      setTestError(validation.error);
      return;
    }

    try {
      const result = evaluateFormulaExpression(
        draft.expression,
        variableCodes,
        testValues,
      );
      if (!Number.isFinite(result)) {
        throw new Error("Le résultat n’est pas un nombre fini.");
      }
      setTestResult(result);
    } catch (error) {
      setTestError(
        error instanceof Error ? error.message : "Test de formule impossible.",
      );
    }
  };

  const submit = async () => {
    if (!year || editing === undefined) return;
    const validation = validateFormulaExpression(
      draft.expression,
      variableCodes,
    );
    if (!validation.valid) {
      notify({
        severity: "error",
        summary: "Expression invalide",
        detail: validation.error,
      });
      expressionRef.current?.focus();
      return;
    }

    setSaving(true);
    try {
      await saveGradingFormula(
        institutionId,
        year.id,
        {
          name: draft.name.trim(),
          code: draft.code.trim().toUpperCase(),
          expression: draft.expression.trim(),
          description: draft.description.trim() || null,
          is_default: draft.isDefault,
        },
        editing?.id,
      );
      setEditing(undefined);
      setDraft(emptyDraft);
      setTestResult(undefined);
      setTestError("");
      await load();
      notify({ severity: "success", summary: "Formule enregistrée" });
    } catch {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: "Vérifiez les valeurs et l’unicité du code dans cette année.",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteGradingFormula(id);
      await load();
    } catch {
      notify({ severity: "error", summary: "Suppression impossible" });
    }
  };

  if (!year) {
    return (
      <Message
        severity="warn"
        text="Créez ou sélectionnez une année scolaire avant de configurer les formules."
      />
    );
  }

  const alert = !editable ? (
    <Message
      severity="info"
      text={`${year.name} est clôturée et reste consultable en lecture seule.`}
    />
  ) : undefined;

  const canSubmit =
    editable &&
    !saving &&
    draft.name.trim().length > 0 &&
    draft.code.trim().length > 0 &&
    expressionValidation.valid;

  return (
    <>
      <SettingsTablePanel
        sectionHeader={
          <PageHeader
            title="Formules de calcul"
            description="Composez librement les calculs avec les codes des types de note."
            meta={
              <Tag
                value={`${items.length} formule${items.length > 1 ? "s" : ""}`}
                severity="secondary"
              />
            }
            headingAs="h2"
            compact
          />
        }
        alert={alert}
        toolbar={
          <Toolbar
            start={
              <TableSearch
                id="grading-formulas-search"
                value={search}
                onChange={setSearch}
                placeholder="Rechercher une formule"
              />
            }
            end={
              <Button
                label="Nouvelle formule"
                icon="pi pi-plus"
                size="small"
                disabled={!editable}
                onClick={() => openEditor()}
              />
            }
            className="min-h-0 rounded-none border-0 bg-transparent p-0"
          />
        }
        dataTable={
          <DataTable
            value={items}
            globalFilter={search}
            globalFilterFields={[
              "name",
              "code",
              "expression",
              "description",
              "is_default",
            ]}
            dataKey="id"
            emptyMessage="Aucune formule"
            stripedRows
            responsiveLayout="scroll"
            size="small"
          >
            <Column field="name" header="Formule" />
            <Column field="code" header="Code" />
            <Column
              field="expression"
              header="Expression"
              body={(row: Formula) => (
                <code className="whitespace-nowrap text-xs">
                  {row.expression}
                </code>
              )}
            />
            <Column
              header="Défaut"
              body={(row: Formula) =>
                row.is_default ? (
                  <Tag value="Par défaut" severity="success" />
                ) : null
              }
            />
            <Column
              header="Actions"
              headerClassName="text-right"
              bodyClassName="text-right"
              body={(row: Formula) => (
                <div className="flex items-center justify-end gap-1">
                  <Button
                    icon="pi pi-pencil"
                    text
                    size="small"
                    disabled={!editable}
                    aria-label={`Modifier ${row.name}`}
                    onClick={() => openEditor(row)}
                  />
                  <Button
                    icon="pi pi-trash"
                    text
                    size="small"
                    severity="danger"
                    disabled={!editable}
                    aria-label={`Supprimer ${row.name}`}
                    onClick={() => void remove(row.id)}
                  />
                </div>
              )}
            />
          </DataTable>
        }
      />

      <Dialog
        header={editing ? "Modifier la formule" : "Nouvelle formule"}
        visible={editing !== undefined}
        modal
        className="w-[min(96vw,64rem)]"
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
              label="Enregistrer"
              icon="pi pi-check"
              loading={saving}
              disabled={!canSubmit}
              onClick={() => void submit()}
            />
          </div>
        }
      >
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nom *">
              <InputText
                value={draft.name}
                className="w-full"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Code *">
              <InputText
                value={draft.code}
                className="w-full uppercase"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
              />
            </Field>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <Field label="Expression *">
              <textarea
                ref={expressionRef}
                value={draft.expression}
                rows={5}
                spellCheck={false}
                className={`w-full resize-y rounded-md border px-3 py-2 font-mono text-sm outline-none transition focus:ring-2 ${
                  expressionValidation.valid
                    ? "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
                    : "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                }`}
                placeholder="(EVAL + COMP * 2) / 2"
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    expression: event.target.value.toUpperCase(),
                  }));
                  setTestResult(undefined);
                  setTestError("");
                }}
              />
              <div className="mt-2">
                {expressionValidation.valid ? (
                  <span className="text-xs text-emerald-700">
                    Expression valide.
                  </span>
                ) : (
                  <span className="text-xs text-rose-700">
                    {expressionValidation.error}
                  </span>
                )}
              </div>
            </Field>

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Variables disponibles
              </span>
              <div className="flex min-h-28 flex-wrap content-start gap-2 rounded-lg border border-slate-200 p-3">
                {assessmentTypes.length ? (
                  assessmentTypes.map((type) => (
                    <Button
                      key={type.id}
                      type="button"
                      label={type.code.toUpperCase()}
                      size="small"
                      outlined
                      tooltip={`${type.name} · barème /${type.scale}`}
                      onClick={() => insertVariable(type.code.toUpperCase())}
                    />
                  ))
                ) : (
                  <span className="text-xs text-slate-500">
                    Créez et activez d’abord un type de note.
                  </span>
                )}
              </div>
            </div>
          </div>

          <Field label="Description">
            <textarea
              value={draft.description}
              rows={2}
              className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.isDefault}
              className="h-4 w-4 accent-emerald-600"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  isDefault: event.target.checked,
                }))
              }
            />
            Formule par défaut
          </label>

          <section className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-sm font-semibold text-slate-900">
                  Tester l’expression
                </h3>
                <p className="mb-0 mt-1 text-xs text-slate-500">
                  Saisissez une valeur pour chaque type de note puis exécutez le
                  calcul.
                </p>
              </div>
              <Button
                type="button"
                label="Tester"
                icon="pi pi-play"
                size="small"
                outlined
                disabled={!expressionValidation.valid}
                onClick={runTest}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {assessmentTypes.map((type) => {
                const code = type.code.toUpperCase();
                return (
                  <Field key={type.id} label={`${code} — ${type.name}`}>
                    <InputNumber
                      value={testValues[code] ?? 0}
                      minFractionDigits={0}
                      maxFractionDigits={2}
                      className="w-full"
                      inputClassName="w-full"
                      onValueChange={(event) => {
                        setTestValues((current) => ({
                          ...current,
                          [code]: event.value ?? 0,
                        }));
                        setTestResult(undefined);
                        setTestError("");
                      }}
                    />
                  </Field>
                );
              })}
            </div>

            {testResult !== undefined ? (
              <Message
                className="mt-4 w-full"
                severity="success"
                text={`Résultat : ${testResult.toLocaleString("fr-FR", {
                  maximumFractionDigits: 4,
                })}`}
              />
            ) : null}
            {testError ? (
              <Message
                className="mt-4 w-full"
                severity="error"
                text={testError}
              />
            ) : null}
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

function validateFormulaExpression(
  expression: string,
  allowedVariables: string[],
): { valid: true } | { valid: false; error: string } {
  if (!expression.trim()) {
    return { valid: false, error: "L’expression est obligatoire." };
  }
  try {
    const tokens = tokenize(expression, allowedVariables);
    parseExpression(
      tokens,
      Object.fromEntries(
        allowedVariables.map((code) => [code.toUpperCase(), 1]),
      ),
    );
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error ? error.message : "L’expression est invalide.",
    };
  }
}

function evaluateFormulaExpression(
  expression: string,
  allowedVariables: string[],
  values: Record<string, number>,
) {
  return parseExpression(tokenize(expression, allowedVariables), values);
}

function tokenize(expression: string, allowedVariables: string[]): Token[] {
  const allowed = new Set(allowedVariables.map((code) => code.toUpperCase()));
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < expression.length) {
    const character = expression[cursor];

    if (/\s/.test(character)) {
      cursor += 1;
      continue;
    }

    if (/[0-9.,]/.test(character)) {
      const start = cursor;
      let raw = "";
      while (cursor < expression.length && /[0-9.,]/.test(expression[cursor])) {
        raw += expression[cursor];
        cursor += 1;
      }
      const normalized = raw.replace(",", ".");
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
        throw new Error(`Nombre invalide à la position ${start + 1}.`);
      }
      tokens.push({
        kind: "number",
        value: Number(normalized),
        position: start,
      });
      continue;
    }

    if (/[A-Za-z_]/.test(character)) {
      const start = cursor;
      let identifier = "";
      while (
        cursor < expression.length &&
        /[A-Za-z0-9_]/.test(expression[cursor])
      ) {
        identifier += expression[cursor];
        cursor += 1;
      }
      const variable = identifier.toUpperCase();
      if (!allowed.has(variable)) {
        throw new Error(
          `Variable inconnue « ${variable} » à la position ${start + 1}.`,
        );
      }
      tokens.push({ kind: "variable", value: variable, position: start });
      continue;
    }

    if (character === "(") {
      tokens.push({ kind: "left", position: cursor });
      cursor += 1;
      continue;
    }
    if (character === ")") {
      tokens.push({ kind: "right", position: cursor });
      cursor += 1;
      continue;
    }
    if (
      character === "+" ||
      character === "-" ||
      character === "*" ||
      character === "/"
    ) {
      tokens.push({
        kind: "operator",
        value: character,
        position: cursor,
      });
      cursor += 1;
      continue;
    }

    throw new Error(
      `Caractère interdit « ${character} » à la position ${cursor + 1}.`,
    );
  }

  if (!tokens.length) {
    throw new Error("L’expression est obligatoire.");
  }
  return tokens;
}

function parseExpression(tokens: Token[], values: Record<string, number>) {
  let index = 0;
  const current = () => tokens[index];

  const parsePrimary = (): number => {
    const token = current();
    if (!token) {
      throw new Error("Valeur ou parenthèse attendue en fin d’expression.");
    }

    if (
      token.kind === "operator" &&
      (token.value === "+" || token.value === "-")
    ) {
      index += 1;
      const value = parsePrimary();
      return token.value === "-" ? -value : value;
    }

    if (token.kind === "number") {
      index += 1;
      return token.value;
    }

    if (token.kind === "variable") {
      index += 1;
      return values[token.value] ?? 0;
    }

    if (token.kind === "left") {
      index += 1;
      const value = parseAdditive();
      const closing = current();
      if (!closing || closing.kind !== "right") {
        throw new Error(
          `Parenthèse fermante attendue après la position ${token.position + 1}.`,
        );
      }
      index += 1;
      return value;
    }

    throw new Error(`Valeur attendue à la position ${token.position + 1}.`);
  };

  const parseMultiplicative = (): number => {
    let value = parsePrimary();
    while (
      current()?.kind === "operator" &&
      (current().value === "*" || current().value === "/")
    ) {
      const operator = current();
      index += 1;
      const right = parsePrimary();
      if (operator.kind === "operator" && operator.value === "/") {
        if (right === 0) {
          throw new Error("Division par zéro impossible.");
        }
        value /= right;
      } else {
        value *= right;
      }
    }
    return value;
  };

  const parseAdditive = (): number => {
    let value = parseMultiplicative();
    while (
      current()?.kind === "operator" &&
      (current().value === "+" || current().value === "-")
    ) {
      const operator = current();
      index += 1;
      const right = parseMultiplicative();
      value =
        operator.kind === "operator" && operator.value === "+"
          ? value + right
          : value - right;
    }
    return value;
  };

  const result = parseAdditive();
  const remaining = current();
  if (remaining) {
    throw new Error(`Opérateur attendu à la position ${remaining.position + 1}.`);
  }
  return result;
}
