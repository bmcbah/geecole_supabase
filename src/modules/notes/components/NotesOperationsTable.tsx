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
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-3">
        <label className="field">
          <span>Cycle</span>
          <Dropdown
            value={props.cycleId}
            options={[
              { label: "Tous les cycles", value: "" },
              ...props.cycleOptions,
            ]}
            onChange={(event) => props.onCycle(String(event.value ?? ""))}
            className="w-full"
          />
        </label>
        <label className="field">
          <span>Niveau</span>
          <Dropdown
            value={props.levelId}
            options={[
              { label: "Tous les niveaux", value: "" },
              ...props.levelOptions,
            ]}
            disabled={!props.cycleId}
            onChange={(event) => props.onLevel(String(event.value ?? ""))}
            className="w-full"
          />
        </label>
        <label className="field">
          <span>Période</span>
          <Dropdown
            value={props.periodId}
            options={[
              { label: "Toutes les périodes", value: "" },
              ...props.periodOptions,
            ]}
            onChange={(event) => props.onPeriod(String(event.value ?? ""))}
            className="w-full"
          />
        </label>
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
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <DataTable
          value={props.rows}
          className="notes-operations-table"
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
        >
          {props.children}
        </DataTable>
      </section>
    </div>
  );
}
