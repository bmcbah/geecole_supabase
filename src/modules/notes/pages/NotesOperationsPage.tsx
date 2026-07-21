import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { NotesDataTableToolbar } from "../components/NotesDataTableToolbar";
import {
  completePostponedResult,
  listOperationsContext,
  listOperationsPage,
  updateAppreciation,
  type AppreciationItem,
  type AverageControlItem,
  type OperationsMode,
  type PostponedResultItem,
} from "../services/notes-operations.service";

type Row = PostponedResultItem | AppreciationItem | AverageControlItem;

export function NotesOperationsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const mode: OperationsMode = pathname.endsWith("appreciations")
    ? "appreciations"
    : pathname.endsWith("controle-moyennes")
      ? "averages"
      : "postponed";
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [first, setFirst] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [state, setState] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<
    PostponedResultItem | AppreciationItem
  >();
  const [resultValue, setResultValue] = useState<number | null>(null);
  const [resultStatus, setResultStatus] = useState<"" | "absent" | "exempt">(
    "",
  );
  const [appreciation, setAppreciation] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!yearId) return;
    setLoading(true);
    setError("");
    try {
      const [page, context] = await Promise.all([
        listOperationsPage(institutionId, yearId, mode, {
          first,
          rows: pageSize,
          search: query,
          classId,
          periodId,
          state,
        }),
        listOperationsContext(institutionId, yearId),
      ]);
      setItems(page.rows);
      setTotal(page.total);
      setClasses(context.classes);
      setPeriods(context.periods);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de charger les données pédagogiques.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    classId,
    first,
    institutionId,
    mode,
    pageSize,
    periodId,
    query,
    state,
    yearId,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  const config =
    mode === "appreciations"
      ? [
          "Appréciations",
          "Commentaire par élève et matière, affiché sur le bulletin.",
        ]
      : mode === "averages"
        ? [
            "Contrôle des moyennes",
            "Contrôlez la complétude de chaque cahier avant la génération.",
          ]
        : [
            "Rattrapages à compléter",
            "Régularisez les résultats Reportés qui bloquent moyenne et bulletin.",
          ];
  const reset = () => {
    setQuery("");
    setClassId("");
    setPeriodId("");
    setState("");
    setFirst(0);
  };
  const openEdit = (row: PostponedResultItem | AppreciationItem) => {
    setEditing(row);
    setResultValue(null);
    setResultStatus("");
    setAppreciation("appreciation" in row ? row.appreciation : "");
  };
  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      if ("noteLabel" in editing)
        await completePostponedResult({
          id: editing.id,
          value: resultStatus ? undefined : (resultValue ?? undefined),
          status: resultStatus || undefined,
        });
      else await updateAppreciation(editing, appreciation);
      setEditing(undefined);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (!yearId)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        compact
        eyebrow="Notes & Bulletins"
        title={config[0]}
        description={`${config[1]} · ${year?.name ?? "Année"}`}
        actions={
          <Button
            label="Actualiser"
            icon="pi pi-refresh"
            size="small"
            severity="secondary"
            outlined
            onClick={() => void load()}
          />
        }
      />
      {error ? <Message severity="error" text={error} /> : null}
      <NotesDataTableToolbar
        search={query}
        onSearch={(v) => {
          setFirst(0);
          setQuery(v);
        }}
        advanced={advanced}
        onAdvanced={() => setAdvanced((v) => !v)}
        onReset={reset}
        activeCount={[query, classId, periodId, state].filter(Boolean).length}
        status={state}
        onStatus={
          mode !== "postponed"
            ? (v) => {
                setFirst(0);
                setState(v);
              }
            : undefined
        }
        statusOptions={
          mode === "appreciations"
            ? [
                { label: "Complétée", value: "complete" },
                { label: "Manquante", value: "missing" },
              ]
            : [
                { label: "Prêt", value: "ready" },
                { label: "Bloqué", value: "incomplete" },
                { label: "À démarrer", value: "not_started" },
              ]
        }
        classId={classId}
        onClass={(v) => {
          setFirst(0);
          setClassId(v);
        }}
        classOptions={classes.map((i) => ({ label: i.name, value: i.id }))}
        periodId={periodId}
        onPeriod={(v) => {
          setFirst(0);
          setPeriodId(v);
        }}
        periodOptions={periods.map((i) => ({ label: i.name, value: i.id }))}
        placeholder="Élève, matricule, matière ou enseignant"
      />
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <DataTable
          value={items}
          lazy
          loading={loading}
          paginator
          first={first}
          rows={pageSize}
          totalRecords={total}
          rowsPerPageOptions={[10, 25, 50]}
          onPage={(e: DataTablePageEvent) => {
            setFirst(e.first);
            setPageSize(e.rows);
          }}
          dataKey="id"
          size="small"
          stripedRows
          emptyMessage="Aucun élément pour ces filtres"
        >
          {mode === "postponed" ? (
            <>
              <Column field="studentName" header="Élève" />
              <Column field="matricule" header="Matricule" />
              <Column field="className" header="Classe" />
              <Column field="subjectName" header="Matière" />
              <Column field="noteLabel" header="Évaluation" />
              <Column
                header="Blocage"
                body={() => (
                  <Tag value="Moyenne + bulletin" severity="warning" />
                )}
              />
              <Column
                header="Action"
                body={(row: PostponedResultItem) => (
                  <Button
                    label="Régulariser"
                    icon="pi pi-pencil"
                    size="small"
                    text
                    onClick={() => openEdit(row)}
                  />
                )}
              />
            </>
          ) : mode === "appreciations" ? (
            <>
              <Column field="studentName" header="Élève" />
              <Column field="className" header="Classe" />
              <Column field="subjectName" header="Matière" />
              <Column
                header="État"
                body={(row: AppreciationItem) => (
                  <Tag
                    value={row.appreciation ? "Complétée" : "À saisir"}
                    severity={row.appreciation ? "success" : "warning"}
                  />
                )}
              />
              <Column
                field="appreciation"
                header="Appréciation du bulletin"
                body={(row: AppreciationItem) =>
                  row.appreciation || (
                    <span className="text-slate-400">Non renseignée</span>
                  )
                }
              />
              <Column
                header="Action"
                body={(row: AppreciationItem) => (
                  <Button
                    label={row.appreciation ? "Modifier" : "Saisir"}
                    icon="pi pi-pencil"
                    size="small"
                    text
                    onClick={() => openEdit(row)}
                  />
                )}
              />
            </>
          ) : (
            <>
              <Column field="className" header="Classe" />
              <Column field="periodName" header="Période" />
              <Column field="subjectName" header="Matière" />
              <Column field="teacherName" header="Enseignant" />
              <Column field="coefficient" header="Coef." />
              <Column
                header="Moyenne"
                body={(row: AverageControlItem) =>
                  row.average === null
                    ? "—"
                    : `${row.average.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} /20`
                }
              />
              <Column
                header="Saisie"
                body={(row: AverageControlItem) => (
                  <span title={`${row.notesCount} évaluation(s)`}>
                    {row.enteredResults}/{row.expectedResults}
                  </span>
                )}
              />
              <Column
                header="Anomalies"
                body={(row: AverageControlItem) =>
                  row.anomalies.length ? (
                    <ul className="m-0 list-none space-y-1 p-0 text-xs text-red-700">
                      {row.anomalies.map((anomaly) => (
                        <li key={anomaly}>{anomaly}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-emerald-700">Aucune</span>
                  )
                }
              />
              <Column
                header="Formule"
                body={(row: AverageControlItem) => (
                  <span title={row.formulaExpression}>{row.formulaName}</span>
                )}
              />
              <Column
                header="État"
                body={(row: AverageControlItem) => (
                  <Tag
                    value={
                      row.state === "ready"
                        ? "Prêt à générer"
                        : row.state === "incomplete"
                          ? "À corriger"
                          : "Aucune évaluation"
                    }
                    severity={
                      row.state === "ready"
                        ? "success"
                        : row.state === "incomplete"
                          ? "danger"
                          : "warning"
                    }
                  />
                )}
              />
              <Column
                header="Action"
                body={(row: AverageControlItem) => (
                  <Button
                    label="Voir le cahier"
                    size="small"
                    text
                    onClick={() =>
                      void navigate(
                        `/notes-bulletins/cahiers?class=${row.classId}&period=${row.periodId}`,
                      )
                    }
                  />
                )}
              />
            </>
          )}
        </DataTable>
      </section>
      <Dialog
        header={
          editing && "noteLabel" in editing
            ? "Régulariser le rattrapage"
            : "Modifier l’appréciation"
        }
        visible={Boolean(editing)}
        modal
        className="w-[min(92vw,34rem)]"
        onHide={() => setEditing(undefined)}
      >
        {editing && "noteLabel" in editing ? (
          <div className="space-y-4">
            <Message
              severity="info"
              text={`${editing.studentName} · ${editing.subjectName} · ${editing.noteLabel}`}
            />
            <label className="field">
              <span>Résultat définitif</span>
              <InputNumber
                value={resultValue}
                min={0}
                max={20}
                minFractionDigits={0}
                maxFractionDigits={2}
                suffix=" /20"
                disabled={Boolean(resultStatus)}
                onValueChange={(e) => setResultValue(e.value ?? null)}
              />
            </label>
            <label className="field">
              <span>Ou statut définitif</span>
              <Dropdown
                value={resultStatus}
                options={[
                  { label: "Aucun — saisir une note", value: "" },
                  { label: "Absent", value: "absent" },
                  { label: "Dispensé", value: "exempt" },
                ]}
                onChange={(e) => {
                  setResultStatus(e.value as typeof resultStatus);
                  if (e.value) setResultValue(null);
                }}
              />
            </label>
          </div>
        ) : (
          <label className="field">
            <span>Commentaire repris sur le bulletin</span>
            <InputTextarea
              value={appreciation}
              rows={5}
              maxLength={500}
              autoResize
              className="w-full"
              onChange={(e) => setAppreciation(e.target.value)}
            />
            <small>{appreciation.length}/500 caractères</small>
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            label="Annuler"
            size="small"
            severity="secondary"
            outlined
            onClick={() => setEditing(undefined)}
          />
          <Button
            label="Enregistrer"
            size="small"
            icon="pi pi-check"
            loading={saving}
            disabled={
              editing && "noteLabel" in editing
                ? resultValue === null && !resultStatus
                : !appreciation.trim()
            }
            onClick={() => void save()}
          />
        </div>
      </Dialog>
    </div>
  );
}
