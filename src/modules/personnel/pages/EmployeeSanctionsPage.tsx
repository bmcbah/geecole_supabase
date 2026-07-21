import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { EmployeeSanctionDialog } from "../components/EmployeeSanctionDialog";
import type { Employee, EmployeeSanction } from "../domain/personnel";
import { listEmployeeSanctions, listEmployees, listPersonnelCatalog, type CatalogItem } from "../services/personnel.service";

const labels: Record<EmployeeSanction["status"], string> = { draft: "Brouillon", notified: "Notifiée", contested: "Contestée", closed: "Clôturée", cancelled: "Annulée" };
export function EmployeeSanctionsPage() {
  const { institutionId } = useAcademicSession();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<EmployeeSanction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [employeeId, setEmployeeId] = useState(params.get("employee") || "");
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => { const [sanctions, people, catalog] = await Promise.all([listEmployeeSanctions(institutionId), listEmployees(institutionId), listPersonnelCatalog(institutionId)]); setItems(sanctions); setEmployees(people); setCatalogs(catalog); }, [institutionId]);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => items.filter((item) => !employeeId || item.employee_id === employeeId), [employeeId, items]);
  const changeEmployee = (value: string) => { setEmployeeId(value); setParams(value ? { employee: value } : {}); };
  return <div className="space-y-4 pb-8">
    <PageHeader title="Sanctions" description="Centralisez le suivi disciplinaire, les notifications et les décisions formalisées." actions={<Button label="Nouvelle sanction" icon="pi pi-plus" disabled={!employeeId} onClick={() => setOpen(true)} />} />
    <section className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 md:flex-row md:items-end"><label className="w-full md:max-w-md"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Employé</span><Dropdown className="w-full" filter showClear value={employeeId} placeholder="Tous les employés" options={employees.map((x) => ({ value: x.id, label: `${x.first_name} ${x.last_name} — ${x.employee_number}` }))} onChange={(e) => changeEmployee(e.value || "")} /></label><small className="pb-2 text-amber-800">Données confidentielles : les autorisations fines seront traitées dans le lot sécurité dédié.</small></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><DataTable value={filtered} dataKey="id" paginator={filtered.length > 10} rows={10} emptyMessage="Aucune sanction" stripedRows>
      <Column header="Employé" body={(x: EmployeeSanction) => <div><strong>{x.employee ? `${x.employee.first_name} ${x.employee.last_name}` : "—"}</strong><small className="block text-slate-500">{x.employee?.employee_number}</small></div>} />
      <Column field="incident_on" header="Incident" sortable /><Column field="reason" header="Motif" /><Column field="decision" header="Décision" body={(x: EmployeeSanction) => x.decision || "À formaliser"} /><Column header="Statut" body={(x: EmployeeSanction) => <Tag value={labels[x.status]} severity={x.status === "closed" ? "success" : x.status === "contested" ? "warning" : "info"} />} />
    </DataTable></section>
    {employeeId && <EmployeeSanctionDialog visible={open} onHide={() => setOpen(false)} onSaved={load} institutionId={institutionId} employeeId={employeeId} catalogs={catalogs} />}
  </div>;
}
