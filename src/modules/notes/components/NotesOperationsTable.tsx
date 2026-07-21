import type { ReactNode } from "react";
import { Button } from "primereact/button";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Message } from "primereact/message";
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

      <NotesDataTableToolbar
        search={props.search}
        onSearch={props.onSearch}
        advanced={props.advanced}
        onAdvanced={props.onAdvanced}
        onReset={props.onReset}
        activeCount={activeCount}
        cycleId={props.cycleId}
        onCycle={props.onCycle}
        cycleOptions={props.cycleOptions}
        levelId={props.levelId}
        onLevel={props.onLevel}
        levelOptions={props.levelOptions}
        periodId={props.periodId}
        onPeriod={props.onPeriod}
        periodOptions={props.periodOptions}
        status={props.status}
        onStatus={props.onStatus}
        statusOptions={props.statusOptions}
        classId={props.classId}
        onClass={props.onClass}
        classOptions={props.classOptions}
        placeholder={props.placeholder}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <h2 className="m-0 text-sm font-semibold text-slate-900">Résultats</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {props.total} élément{props.total > 1 ? "s" : ""} dans le périmètre sélectionné.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {props.yearName ?? "Année scolaire"}
          </span>
        </div>
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
