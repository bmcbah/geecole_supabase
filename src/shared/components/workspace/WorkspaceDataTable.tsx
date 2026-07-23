import type { ReactNode } from "react";
import { DataTable, type DataTableProps } from "primereact/datatable";

export function WorkspaceDataTable<TValue extends Record<string, unknown>>({ children, ...props }: DataTableProps<TValue[]> & { children: ReactNode }) {
  return (
    <div className="overflow-hidden border border-slate-200 bg-white">
      <DataTable
        {...props}
        paginator
        rows={25}
        rowsPerPageOptions={[25, 50, 100]}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="{first} à {last} sur {totalRecords}"
        className="text-sm"
        tableStyle={{ minWidth: "980px" }}
      >
        {children}
      </DataTable>
    </div>
  );
}
