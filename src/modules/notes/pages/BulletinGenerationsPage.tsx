import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import {
  DataTable,
  type DataTablePageEvent,
  type DataTableSortEvent,
} from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { NotesDataTableToolbar } from "../components/NotesDataTableToolbar";
import {
  generateBulletins,
  listBatches,
  listGenerationContext,
  listGenerationItems,
  type BulletinBatchRow,
  type BulletinGenerationItem,
  type GenerationScope,
} from "../services/bulletins.service";

type Context = Awaited<ReturnType<typeof listGenerationContext>>;
const emptyContext: Context = {
  periods: [],
  cycles: [],
  levels: [],
  classes: [],
  students: [],
};
export function BulletinGenerationsPage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<BulletinBatchRow[]>([]);
  const [context, setContext] = useState<Context>(emptyContext);
  const [total, setTotal] = useState(0);
  const [first, setFirst] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<1 | -1 | 0>(-1);
  const [advanced, setAdvanced] = useState(false);
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [periodId, setPeriodId] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [details, setDetails] = useState<BulletinGenerationItem[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!yearId) return;
    setLoading(true);
    try {
      const [page, generationContext] = await Promise.all([
        listBatches(institutionId, yearId, {
          first,
          rows: pageSize,
          search: query,
          status,
          periodId: periodFilter,
          dateFrom,
          dateTo,
          sortField,
          sortOrder,
        }),
        listGenerationContext(institutionId, yearId),
      ]);
      setItems(page.rows);
      setTotal(page.total);
      setContext(generationContext);
    } catch {
      setError("Impossible de charger les générations.");
    } finally {
      setLoading(false);
    }
  }, [
    dateFrom,
    dateTo,
    first,
    institutionId,
    pageSize,
    periodFilter,
    query,
    sortField,
    sortOrder,
    status,
    yearId,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  const activeCount = useMemo(
    () =>
      [query, status, periodFilter, dateFrom, dateTo].filter(Boolean).length,
    [dateFrom, dateTo, periodFilter, query, status],
  );
  const compatiblePeriods = context.periods.filter(
    (item) => item.cycle_id === cycleId,
  );
  const compatibleLevels = context.levels.filter(
    (item) => item.cycle_id === cycleId,
  );
  const compatibleClasses = context.classes.filter(
    (item) => item.academic_year_level_id === levelId,
  );
  const compatibleStudents = context.students.filter(
    (item) => item.classId === classId,
  );
  const scope: GenerationScope = studentId
    ? "student"
    : classId
      ? "class"
      : levelId
        ? "level"
        : "cycle";
  const scopeId = studentId || classId || levelId || cycleId;

  function resetGeneration() {
    setPeriodId("");
    setCycleId("");
    setLevelId("");
    setClassId("");
    setStudentId("");
    setOpen(true);
  }
  async function submit() {
    if (!yearId || !periodId || !scopeId) return;
    setLoading(true);
    setError("");
    try {
      const result = await generateBulletins({
        institutionId,
        yearId,
        periodId,
        scope,
        scopeId,
      });
      setNotice(
        `${result.generated} bulletin(s) généré(s), ${result.blocked} bloqué(s). Ouvrez le détail du lot pour corriger les blocages.`,
      );
      setOpen(false);
      await load();
    } catch {
      setError(
        "La génération a échoué. Vérifiez le périmètre, les affectations et les notes.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function showDetails(row: BulletinBatchRow) {
    setLoading(true);
    try {
      setDetails(await listGenerationItems(row.id));
      setDetailsOpen(true);
    } catch {
      setError("Impossible de charger le rapport du lot.");
    } finally {
      setLoading(false);
    }
  }

  if (!yearId)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        eyebrow="Notes & Bulletins"
        title="Générations"
        description={`Préparer et contrôler les lots de bulletins · ${year?.name ?? "Année"}`}
        actions={
          <Button
            label="Générer des bulletins"
            icon="pi pi-sparkles"
            onClick={resetGeneration}
          />
        }
      />
      {error ? <Message severity="error" text={error} /> : null}
      {notice ? <Message severity="success" text={notice} /> : null}
      <NotesDataTableToolbar
        search={query}
        onSearch={(value) => {
          setFirst(0);
          setQuery(value);
        }}
        advanced={advanced}
        onAdvanced={() => setAdvanced((value) => !value)}
        activeCount={activeCount}
        onReset={() => {
          setQuery("");
          setStatus("");
          setPeriodFilter("");
          setDateFrom("");
          setDateTo("");
          setFirst(0);
        }}
        status={status}
        onStatus={(value) => {
          setFirst(0);
          setStatus(value);
        }}
        statusOptions={[
          { label: "Terminé", value: "completed" },
          { label: "Partiel", value: "partial" },
          { label: "Bloqué", value: "failed" },
        ]}
        periodId={periodFilter}
        onPeriod={(value) => {
          setFirst(0);
          setPeriodFilter(value);
        }}
        periodOptions={context.periods.map((period) => ({
          label: period.label,
          value: period.id,
        }))}
        dateFrom={dateFrom}
        onDateFrom={(value) => {
          setFirst(0);
          setDateFrom(value);
        }}
        dateTo={dateTo}
        onDateTo={(value) => {
          setFirst(0);
          setDateTo(value);
        }}
        placeholder="Période ou lot"
      />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          value={items}
          lazy
          loading={loading}
          dataKey="id"
          stripedRows
          paginator
          first={first}
          rows={pageSize}
          totalRecords={total}
          rowsPerPageOptions={[10, 25, 50]}
          onPage={(event: DataTablePageEvent) => {
            setFirst(event.first);
            setPageSize(event.rows);
          }}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={(event: DataTableSortEvent) => {
            setFirst(0);
            setSortField(String(event.sortField));
            setSortOrder(event.sortOrder ?? 0);
          }}
          emptyMessage="Aucun lot de génération"
        >
          <Column
            field="createdAt"
            header="Date"
            sortable
            body={(row: BulletinBatchRow) =>
              new Date(row.createdAt).toLocaleString("fr-FR")
            }
          />
          <Column field="periodName" header="Période" />
          <Column field="scope" header="Portée" />
          <Column field="total" header="Élèves" sortable />
          <Column field="generated" header="Générés" />
          <Column
            field="blocked"
            header="Bloqués"
            body={(row: BulletinBatchRow) => (
              <Tag
                value={row.blocked}
                severity={row.blocked ? "danger" : "success"}
              />
            )}
          />
          <Column
            field="status"
            header="État"
            sortable
            body={(row: BulletinBatchRow) => (
              <Tag
                value={row.status}
                severity={
                  row.status === "completed"
                    ? "success"
                    : row.status === "failed"
                      ? "danger"
                      : "warning"
                }
              />
            )}
          />
          <Column
            header="Rapport"
            body={(row: BulletinBatchRow) => (
              <Button
                label="Voir le détail"
                icon="pi pi-list"
                text
                onClick={() => void showDetails(row)}
              />
            )}
          />
        </DataTable>
      </section>
      <Dialog
        header="Générer les bulletins"
        visible={open}
        modal
        className="w-[min(94vw,38rem)]"
        onHide={() => setOpen(false)}
      >
        <div className="space-y-4">
          <Message
            severity="info"
            text="Choisissez le cycle puis affinez si nécessaire jusqu’au niveau, à la classe ou à l’élève. La période ouverte est proposée automatiquement."
          />
          <Field label="Cycle *">
            <Dropdown
              value={cycleId}
              options={context.cycles.map((cycle) => ({
                label: cycle.name,
                value: cycle.id,
              }))}
              filter
              onChange={(event) => {
                const nextCycle = String(event.value);
                setCycleId(nextCycle);
                setLevelId("");
                setClassId("");
                setStudentId("");
                setPeriodId(
                  context.periods.find(
                    (period) =>
                      period.cycle_id === nextCycle && period.status === "open",
                  )?.id ?? "",
                );
              }}
              className="w-full"
              placeholder="Choisir un cycle"
            />
          </Field>
          {cycleId ? (
            <Field label="Niveau (facultatif)">
              <Dropdown
                value={levelId}
                options={compatibleLevels.map((item) => ({
                  label: item.level_name_snapshot,
                  value: item.id,
                }))}
                showClear
                filter
                onChange={(event) => {
                  setLevelId(String(event.value ?? ""));
                  setClassId("");
                  setStudentId("");
                }}
                className="w-full"
              />
            </Field>
          ) : null}
          {levelId ? (
            <Field label="Classe (facultatif)">
              <Dropdown
                value={classId}
                options={compatibleClasses.map((item) => ({
                  label: item.name,
                  value: item.id,
                }))}
                showClear
                filter
                onChange={(event) => {
                  setClassId(String(event.value ?? ""));
                  setStudentId("");
                }}
                className="w-full"
              />
            </Field>
          ) : null}
          {classId ? (
            <Field label="Élève (facultatif)">
              <Dropdown
                value={studentId}
                options={compatibleStudents.map((item) => ({
                  label: `${item.name} · ${item.matricule}`,
                  value: item.id,
                }))}
                showClear
                filter
                onChange={(event) => setStudentId(String(event.value ?? ""))}
                className="w-full"
              />
            </Field>
          ) : null}
          {cycleId ? (
            <Field label="Période *">
              <Dropdown
                value={periodId}
                options={compatiblePeriods.map((period) => ({
                  label: period.name,
                  value: period.id,
                }))}
                onChange={(event) => setPeriodId(String(event.value))}
                className="w-full"
                placeholder="Choisir une période"
              />
            </Field>
          ) : null}
          {cycleId ? (
            <Message
              severity="secondary"
              text={`Périmètre retenu : ${scope === "cycle" ? "tout le cycle" : scope === "level" ? "tout le niveau" : scope === "class" ? "toute la classe" : "un élève"}.`}
            />
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              label="Annuler"
              severity="secondary"
              outlined
              onClick={() => setOpen(false)}
            />
            <Button
              label="Lancer la génération"
              icon="pi pi-play"
              loading={loading}
              disabled={!periodId || !scopeId}
              onClick={() => void submit()}
            />
          </div>
        </div>
      </Dialog>
      <Dialog
        header="Rapport de génération"
        visible={detailsOpen}
        modal
        className="w-[min(96vw,64rem)]"
        onHide={() => setDetailsOpen(false)}
      >
        <DataTable
          value={details}
          dataKey="id"
          paginator
          rows={10}
          emptyMessage="Aucun élève dans ce lot"
        >
          <Column field="studentName" header="Élève" />
          <Column field="matricule" header="Matricule" />
          <Column field="className" header="Classe" />
          <Column
            field="status"
            header="État"
            body={(row: BulletinGenerationItem) => (
              <Tag
                value={row.status === "blocked" ? "Bloqué" : "Généré"}
                severity={row.status === "blocked" ? "danger" : "success"}
              />
            )}
          />
          <Column
            field="message"
            header="Motif / résultat"
            body={(row: BulletinGenerationItem) =>
              row.message ?? "Bulletin généré"
            }
          />
        </DataTable>
      </Dialog>
    </div>
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
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
