import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useSearchParams } from "react-router-dom";
import { MetricIcon } from "../../../shared/components/data-display/MetricIcon";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import type { Employee, WorkEntry } from "../domain/personnel";
import {
  createWorkEntry,
  createProposedWorkEntries,
  getEmployeeProfile,
  listEmployees,
  listPersonnelCatalog,
  listWorkEntries,
  setWorkEntryStatus,
} from "../services/personnel.service";

const labels = {
  planned: "Prévue",
  completed: "Effectuée",
  validated: "Validée",
  rejected: "Rejetée",
  paid: "Payée",
};
const controlClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white text-sm shadow-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const iso = (date: Date) => date.toISOString().slice(0, 10);

export function WorkEntriesPage() {
  const { institutionId } = useAcademicSession();
  const notify = useToast();
  const [searchParams] = useSearchParams();
  const employeeFilter = searchParams.get("employee") || "";
  const [items, setItems] = useState<WorkEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<{ label: string; value: string }[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    typeId: "",
    date: new Date(),
    hours: 1,
    rate: 0,
    status: "completed" as WorkEntry["status"],
    notes: "",
  });
  const [proposal, setProposal] = useState({
    employeeId: "",
    contractId: "",
    startsOn: new Date().toISOString().slice(0, 10),
    endsOn: new Date().toISOString().slice(0, 10),
    weeklyHours: 0,
  });
  const load = useCallback(async () => {
    const [entries, people, catalog] = await Promise.all([
      listWorkEntries(institutionId),
      listEmployees(institutionId),
      listPersonnelCatalog(institutionId),
    ]);
    setItems(entries);
    setEmployees(people.filter((x) => x.status === "active"));
    setTypes(
      catalog
        .filter((x) => x.category === "work_type" && x.is_active)
        .map((x) => ({ value: x.id, label: x.local_label || x.default_label })),
    );
  }, [institutionId]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      items.filter(
        (x) =>
          (!status || x.status === status) &&
          (!employeeFilter || x.employee_id === employeeFilter) &&
          `${x.employee?.first_name} ${x.employee?.last_name} ${x.employee?.employee_number}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [employeeFilter, items, query, status],
  );
  const totals = useMemo(
    () => ({
      completed: items.filter((x) => x.status === "completed").length,
      validated: items.filter((x) => x.status === "validated").length,
      hours: items
        .filter((x) => x.status === "validated")
        .reduce((s, x) => s + x.minutes / 60, 0),
    }),
    [items],
  );
  const act = async (id: string, next: WorkEntry["status"]) => {
    await setWorkEntryStatus(id, next);
    await load();
    notify({
      severity: "success",
      summary: next === "validated" ? "Heure validée" : "Heure rejetée",
    });
  };
  const save = async () => {
    if (!form.employeeId || form.hours <= 0) return;
    setSaving(true);
    try {
      await createWorkEntry({
        institution_id: institutionId,
        employee_id: form.employeeId,
        work_type_item_id: form.typeId,
        work_date: iso(form.date),
        minutes: Math.round(form.hours * 60),
        rate: form.rate || undefined,
        status: form.status,
        notes: form.notes,
      });
      setOpen(false);
      await load();
      notify({ severity: "success", summary: "Heure enregistrée" });
    } catch (error) {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };
  const selectProposalEmployee = async (employeeId: string) => {
    const profile = await getEmployeeProfile(institutionId, employeeId);
    const contract = profile?.contracts.find(
      (item) => item.status === "active",
    );
    setProposal((current) => ({
      ...current,
      employeeId,
      contractId: contract?.id || "",
      weeklyHours: contract?.weekly_hours || 0,
    }));
  };
  const propose = async () => {
    setSaving(true);
    try {
      const count = await createProposedWorkEntries({
        institutionId,
        employeeId: proposal.employeeId,
        contractId: proposal.contractId,
        startsOn: proposal.startsOn,
        endsOn: proposal.endsOn,
        weeklyHours: proposal.weeklyHours,
        workTypeItemId: types[0]?.value,
      });
      setProposalOpen(false);
      await load();
      notify({
        severity: "success",
        summary: `${count} proposition(s) créée(s)`,
        detail: "Elles doivent être confirmées puis validées avant la paie.",
      });
    } catch (error) {
      notify({
        severity: "error",
        summary: "Proposition impossible",
        detail: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Présences et heures"
        description="Saisissez les activités réellement effectuées avant leur validation et leur intégration à la paie."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              label="Proposer les heures enseignant"
              icon="pi pi-sparkles"
              severity="secondary"
              outlined
              onClick={() => setProposalOpen(true)}
            />
            <Button
              label="Saisir des heures"
              icon="pi pi-plus"
              onClick={() => setOpen(true)}
            />
          </div>
        }
      />
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["À valider", totals.completed, "pi-clock"],
          ["Validées", totals.validated, "pi-check-circle"],
          [
            "Volume validé",
            `${totals.hours.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`,
            "pi-stopwatch",
          ],
        ].map(([label, value, icon]) => (
          <article
            key={String(label)}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <MetricIcon icon={String(icon)} />
            <div>
              <strong className="block text-xl text-slate-900">{value}</strong>
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          </article>
        ))}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_220px_auto] md:items-end">
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Rechercher
            </span>
            <InputText
              className={controlClass}
              value={query}
              placeholder="Employé ou matricule"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Statut
            </span>
            <Dropdown
              className={controlClass}
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
          {(query || status) && (
            <Button
              label="Réinitialiser"
              text
              severity="secondary"
              icon="pi pi-filter-slash"
              onClick={() => {
                setQuery("");
                setStatus("");
              }}
            />
          )}
        </div>
      </section>
      <SettingsTablePanel
        dataTable={
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <DataTable
              value={filtered}
              dataKey="id"
              paginator={filtered.length > 10}
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              stripedRows
              className="text-sm"
              tableStyle={{ minWidth: "900px" }}
              emptyMessage="Aucune heure enregistrée"
            >
              <Column
                header="Employé"
                sortable
                body={(x: WorkEntry) => (
                  <div>
                    <strong className="block">
                      {x.employee
                        ? `${x.employee.first_name} ${x.employee.last_name}`
                        : "—"}
                    </strong>
                    <small className="text-slate-400">
                      {x.employee?.employee_number}
                    </small>
                  </div>
                )}
              />
              <Column field="work_date" header="Date" sortable />
              <Column
                header="Durée"
                body={(x: WorkEntry) =>
                  `${Math.floor(x.minutes / 60)} h ${x.minutes % 60 || ""}`
                }
              />
              <Column
                header="Taux"
                body={(x: WorkEntry) =>
                  x.rate
                    ? `${x.rate.toLocaleString("fr-GN")} GNF`
                    : "Taux du contrat"
                }
              />
              <Column
                header="Statut"
                body={(x: WorkEntry) => (
                  <Tag
                    value={labels[x.status]}
                    severity={
                      x.status === "validated" || x.status === "paid"
                        ? "success"
                        : x.status === "rejected"
                          ? "danger"
                          : x.status === "completed"
                            ? "warning"
                            : "info"
                    }
                  />
                )}
              />
              <Column
                header="Actions"
                body={(x: WorkEntry) =>
                  x.status === "completed" || x.status === "planned" ? (
                    <div className="flex gap-1">
                      {x.status === "planned" ? (
                        <Button
                          label="Marquer effectuée"
                          size="small"
                          outlined
                          onClick={() => void act(x.id, "completed")}
                        />
                      ) : (
                        <Button
                          label="Valider"
                          size="small"
                          outlined
                          onClick={() => void act(x.id, "validated")}
                        />
                      )}
                      <Button
                        icon="pi pi-times"
                        size="small"
                        text
                        severity="danger"
                        aria-label="Rejeter"
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
        header="Saisir une activité"
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
            <span className="mb-1 block text-sm font-medium">
              Type d’activité
            </span>
            <Dropdown
              className="w-full"
              showClear
              value={form.typeId}
              options={types}
              onChange={(e) => setForm({ ...form, typeId: e.value || "" })}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Date *</span>
            <Calendar
              className="w-full"
              value={form.date}
              dateFormat="dd/mm/yy"
              onChange={(e) =>
                e.value && setForm({ ...form, date: e.value as Date })
              }
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">
              Durée en heures *
            </span>
            <InputNumber
              className="w-full"
              value={form.hours}
              min={0.25}
              maxFractionDigits={2}
              onValueChange={(e) => setForm({ ...form, hours: e.value || 0 })}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">
              Taux spécifique (GNF)
            </span>
            <InputNumber
              className="w-full"
              value={form.rate}
              min={0}
              onValueChange={(e) => setForm({ ...form, rate: e.value || 0 })}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">État initial</span>
            <Dropdown
              className="w-full"
              value={form.status}
              options={[
                { label: "Effectuée", value: "completed" },
                { label: "Prévue", value: "planned" },
              ]}
              onChange={(e) => setForm({ ...form, status: e.value })}
            />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium">Commentaire</span>
            <InputTextarea
              className="w-full"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
            disabled={!form.employeeId || form.hours <= 0}
            onClick={() => void save()}
          />
        </div>
      </Dialog>
      <Dialog
        header="Proposer les heures d’un enseignant"
        visible={proposalOpen}
        modal
        className="w-[min(96vw,42rem)]"
        onHide={() => setProposalOpen(false)}
      >
        <Message
          severity="info"
          text="La proposition reprend la charge hebdomadaire du contrat. Elle doit être corrigée selon les cours réellement effectués, puis validée."
          className="mb-4 w-full"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium">Enseignant *</span>
            <Dropdown
              className="w-full"
              filter
              value={proposal.employeeId}
              options={employees.map((x) => ({
                value: x.id,
                label: `${x.first_name} ${x.last_name} — ${x.employee_number}`,
              }))}
              onChange={(e) => void selectProposalEmployee(e.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Du *</span>
            <InputText
              className="w-full"
              type="date"
              value={proposal.startsOn}
              onChange={(e) =>
                setProposal({ ...proposal, startsOn: e.target.value })
              }
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Au *</span>
            <InputText
              className="w-full"
              type="date"
              value={proposal.endsOn}
              onChange={(e) =>
                setProposal({ ...proposal, endsOn: e.target.value })
              }
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">
              Charge hebdomadaire proposée *
            </span>
            <InputNumber
              className="w-full"
              value={proposal.weeklyHours}
              min={0.25}
              max={60}
              maxFractionDigits={2}
              onValueChange={(e) =>
                setProposal({ ...proposal, weeklyHours: e.value || 0 })
              }
            />
          </label>
        </div>
        {!proposal.contractId && proposal.employeeId && (
          <Message
            severity="warn"
            text="Aucun contrat actif n’a été trouvé pour cette personne."
            className="mt-4 w-full"
          />
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            label="Annuler"
            outlined
            severity="secondary"
            onClick={() => setProposalOpen(false)}
          />
          <Button
            label="Créer les propositions"
            icon="pi pi-sparkles"
            loading={saving}
            disabled={
              !proposal.contractId ||
              proposal.weeklyHours <= 0 ||
              !proposal.startsOn ||
              !proposal.endsOn
            }
            onClick={() => void propose()}
          />
        </div>
      </Dialog>
    </div>
  );
}
