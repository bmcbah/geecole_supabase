import type { ReactNode } from "react";
import { Button } from "primereact/button";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Message } from "primereact/message";
import { Dropdown } from "primereact/dropdown";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import type { NotesOperationRow } from "../hooks/useNotesOperationsPage";
import {
  NotesDataTableToolbar,
  type FilterOption,
} from "./NotesDataTableToolbar";

type Props = {
  title: string;
  description: string;
  yearName?: string;
  rows: NotesOperationRow[];
  total: number;
  first: number;
  pageSize: number;
  loading: boolean;
  error: string;
  search: string;
  status: string;
  advanced: boolean;
  classId: string;
  cycleId: string;
  levelId: string;
  periodId: string;
  classOptions: FilterOption[];
  cycleOptions: FilterOption[];
  levelOptions: FilterOption[];
  periodOptions: FilterOption[];
  statusOptions?: FilterOption[];
  placeholder: string;
  children: ReactNode;
  onReload: () => void;
  onSearch: (value: string) => void;
  onStatus?: (value: string) => void;
  onClass: (value: string) => void;
  onCycle: (value: string) => void;
  onLevel: (value: string) => void;
  onPeriod: (value: string) => void;
  onAdvanced: () => void;
  onReset: () => void;
  onPage: (event: DataTablePageEvent) => void;
};

const controlClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white text-sm shadow-sm transition-colors hover:border-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function NotesOperationsTable(props: Props) {
  const activeCount = [
    props.search,
    props.classId,
    props.cycleId,
    props.levelId,
    props.periodId,
    props.status,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        compact
        eyebrow="Notes & Bulletins"
        title={props.title}
        description={`${props.description} · ${props.yearName ?? "Année"}`}
        actions={
          <Button
            label="Actualiser"
            icon="pi pi-refresh"
            size="small"
            severity="secondary"
            outlined
            onClick={props.onReload}
          />
        }
      />

      {props.error ? <Message severity="error" text={props.error} /> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-semibold text-slate-950">
              Périmètre pédagogique
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Sélectionnez d’abord le cycle, puis le niveau et la période.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {props.yearName ?? "Année scolaire"}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label>
            <span className={labelClass}>Cycle</span>
            <Dropdown
              value={props.cycleId}
              options={[
                { label: "Tous les cycles", value: "" },
                ...props.cycleOptions,
              ]}
              onChange={(event) => props.onCycle(String(event.value ?? ""))}
              className={controlClass}
            />
          </label>

          <label>
            <span className={labelClass}>Niveau</span>
            <Dropdown
              value={props.levelId}
              options={[
                { label: "Tous les niveaux", value: "" },
                ...props.levelOptions,
              ]}
              disabled={!props.cycleId}
              onChange={(event) => props.onLevel(String(event.value ?? ""))}
              className={controlClass}
            />
          </label>

          <label>
            <span className={labelClass}>Période</span>
            <Dropdown
              value={props.periodId}
              options={[
                { label: "Toutes les périodes", value: "" },
                ...props.periodOptions,
              ]}
              onChange={(event) => props.onPeriod(String(event.value ?? ""))}
              className={controlClass}
            />
          </label>
        </div>
      </section>

      <NotesDataTableToolbar
        search={props.search}
        onSearch={props.onSearch}
        advanced={props.advanced}
        onAdvanced={props.onAdvanced}
        onReset={props.onReset}
        activeCount={activeCount}
        status={props.status}
        onStatus={props.onStatus}
        statusOptions={props.statusOptions}
        classId={props.classId}
        onClass={props.onClass}
        classOptions={props.classOptions}
        periodId=""
        periodOptions={[]}
        placeholder={props.placeholder}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          value={props.rows}
          lazy
          loading={props.loading}
          paginator
          first={props.first}
          rows={props.pageSize}
          totalRecords={props.total}
          rowsPerPageOptions={[10, 25, 50]}
          onPage={props.onPage}
          dataKey="id"
          size="small"
          stripedRows
          emptyMessage="Aucun élément pour ces filtres"
          className="text-sm"
        >
          {props.children}
        </DataTable>
      </section>
    </div>
  );
}
