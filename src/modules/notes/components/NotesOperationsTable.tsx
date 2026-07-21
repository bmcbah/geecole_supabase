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
  periodId: string;
  classOptions: FilterOption[];
  periodOptions: FilterOption[];
  statusOptions?: FilterOption[];
  placeholder: string;
  children: ReactNode;
  onReload: () => void;
  onSearch: (value: string) => void;
  onStatus?: (value: string) => void;
  onClass: (value: string) => void;
  onPeriod: (value: string) => void;
  onAdvanced: () => void;
  onReset: () => void;
  onPage: (event: DataTablePageEvent) => void;
};

export function NotesOperationsTable(props: Props) {
  const activeCount = [
    props.search,
    props.classId,
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
        status={props.status}
        onStatus={props.onStatus}
        statusOptions={props.statusOptions}
        classId={props.classId}
        onClass={props.onClass}
        classOptions={props.classOptions}
        periodId={props.periodId}
        onPeriod={props.onPeriod}
        periodOptions={props.periodOptions}
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
