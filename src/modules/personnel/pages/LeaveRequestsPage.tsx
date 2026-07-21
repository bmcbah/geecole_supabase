import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import type { Employee, LeaveRequest } from "../domain/personnel";
import {
  createLeaveRequest,
  listEmployees,
  listLeaveRequests,
  listPersonnelCatalog,
  setLeaveStatus,
} from "../services/personnel.service";
const labels = {
  draft: "Brouillon",
  submitted: "Soumise",
  approved: "Approuvée",
  rejected: "Refusée",
  cancelled: "Annulée",
};
const iso = (date: Date) => date.toISOString().slice(0, 10);
export function LeaveRequestsPage() {
  const { institutionId } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<{ label: string; value: string }[]>([]);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    typeId: "",
    starts: new Date(),
    ends: new Date(),
    reason: "",
    status: "submitted" as LeaveRequest["status"],
  });
  const load = useCallback(async () => {
    const [requests, people, catalog] = await Promise.all([
      listLeaveRequests(institutionId),
      listEmployees(institutionId),
      listPersonnelCatalog(institutionId),
    ]);
    setItems(requests);
    setEmployees(people.filter((x) => x.status === "active"));
    setTypes(
      catalog
        .filter((x) => x.category === "leave_type" && x.is_active)
        .map((x) => ({ value: x.id, label: x.local_label || x.default_label })),
    );
  }, [institutionId]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () => items.filter((x) => !status || x.status === status),
    [items, status],
  );
  const save = async () => {
    if (!form.employeeId || form.ends < form.starts) return;
    setSaving(true);
    try {
      await createLeaveRequest({
        institution_id: institutionId,
        employee_id: form.employeeId,
        leave_type_item_id: form.typeId,
        starts_on: iso(form.starts),
        ends_on: iso(form.ends),
        reason: form.reason,
        status: form.status,
      });
      setOpen(false);
      await load();
      notify({ severity: "success", summary: "Demande enregistrée" });
    } catch (error) {
      notify({
        severity: "error",
        summary: "Création impossible",
        detail: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };
  const act = async (id: string, next: LeaveRequest["status"]) => {
    await setLeaveStatus(id, next);
    await load();
    notify({
      severity: "success",
      summary: next === "approved" ? "Demande approuvée" : "Demande refusée",
    });
  };
  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Congés et absences"
        description="Centralisez les demandes, périodes, justificatifs et décisions."
        actions={
          <Button
            label="Nouvelle demande"
            icon="pi pi-plus"
            onClick={() => setOpen(true)}
          />
        }
      />
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["À traiter", items.filter((x) => x.status === "submitted").length],
          ["Approuvées", items.filter((x) => x.status === "approved").length],
          ["Total", items.length],
        ].map(([label, value]) => (
          <article
            key={String(label)}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span className="text-xs font-semibold uppercase text-slate-500">
              {label}
            </span>
            <strong className="mt-1 block text-2xl text-slate-900">
              {value}
            </strong>
          </article>
        ))}
      </section>
      <section className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="w-full max-w-xs">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">
            Statut
          </span>
          <Dropdown
            className="w-full"
            value={status}
            options={[
              { label: "Tous les statuts", value: "" },
              ...Object.entries(labels).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
            onChange={(e) => setStatus(e.value)}
          />
        </label>
      </section>
      <SettingsTablePanel
        dataTable={
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <DataTable
              value={filtered}
              dataKey="id"
              paginator={filtered.length > 10}
              rows={10}
              stripedRows
              tableStyle={{ minWidth: "850px" }}
              emptyMessage="Aucune demande"
            >
              <Column
                header="Employé"
                body={(x: LeaveRequest) => (
                  <div>
                    <strong>
                      {x.employee
                        ? `${x.employee.first_name} ${x.employee.last_name}`
                        : "—"}
                    </strong>
                    <small className="block text-slate-400">
                      {x.employee?.employee_number}
                    </small>
                  </div>
                )}
              />
              <Column field="starts_on" header="Début" sortable />
              <Column field="ends_on" header="Fin" sortable />
              <Column
                header="Durée"
                body={(x: LeaveRequest) =>
                  `${Math.max(1, Math.round((new Date(x.ends_on).getTime() - new Date(x.starts_on).getTime()) / 86400000) + 1)} jour(s)`
                }
              />
              <Column
                field="reason"
                header="Motif"
                body={(x: LeaveRequest) => x.reason || "—"}
              />
              <Column
                header="Statut"
                body={(x: LeaveRequest) => (
                  <Tag
                    value={labels[x.status]}
                    severity={
                      x.status === "approved"
                        ? "success"
                        : x.status === "rejected"
                          ? "danger"
                          : x.status === "submitted"
                            ? "warning"
                            : "secondary"
                    }
                  />
                )}
              />
              <Column
                header="Décision"
                body={(x: LeaveRequest) =>
                  x.status === "draft" ? (
                    <Button
                      label="Soumettre"
                      size="small"
                      outlined
                      onClick={() => void act(x.id, "submitted")}
                    />
                  ) : x.status === "submitted" ? (
                    <div className="flex gap-1">
                      <Button
                        label="Approuver"
                        size="small"
                        outlined
                        onClick={() => void act(x.id, "approved")}
                      />
                      <Button
                        icon="pi pi-times"
                        size="small"
                        text
                        severity="danger"
                        onClick={() => void act(x.id, "rejected")}
                      />
                    </div>
                  ) : null
                }
              />
            </DataTable>
          </div>
        }
      />
      <Dialog
        header="Nouvelle demande"
        visible={open}
        modal
        className="w-[min(96vw,42rem)]"
        onHide={() => setOpen(false)}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium">Employé *</span>
            <Dropdown
              className="w-full"
              filter
              value={form.employeeId}
              options={employees.map((x) => ({
                value: x.id,
                label: `${x.first_name} ${x.last_name} — ${x.employee_number}`,
              }))}
              onChange={(e) => setForm({ ...form, employeeId: e.value })}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Type</span>
            <Dropdown
              className="w-full"
              showClear
              value={form.typeId}
              options={types}
              onChange={(e) => setForm({ ...form, typeId: e.value || "" })}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">État</span>
            <Dropdown
              className="w-full"
              value={form.status}
              options={[
                { label: "Soumettre", value: "submitted" },
                { label: "Enregistrer en brouillon", value: "draft" },
              ]}
              onChange={(e) => setForm({ ...form, status: e.value })}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Du *</span>
            <Calendar
              className="w-full"
              value={form.starts}
              dateFormat="dd/mm/yy"
              onChange={(e) =>
                e.value && setForm({ ...form, starts: e.value as Date })
              }
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Au *</span>
            <Calendar
              className="w-full"
              value={form.ends}
              minDate={form.starts}
              dateFormat="dd/mm/yy"
              onChange={(e) =>
                e.value && setForm({ ...form, ends: e.value as Date })
              }
            />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium">Motif</span>
            <InputTextarea
              className="w-full"
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            label="Annuler"
            outlined
            severity="secondary"
            onClick={() => setOpen(false)}
          />
          <Button
            label="Enregistrer"
            icon="pi pi-check"
            loading={saving}
            disabled={!form.employeeId || form.ends < form.starts}
            onClick={() => void save()}
          />
        </div>
      </Dialog>
    </div>
  );
}
