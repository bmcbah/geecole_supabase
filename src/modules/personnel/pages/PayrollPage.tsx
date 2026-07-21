import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import type { PayrollEntry, PayrollPeriod } from "../domain/personnel";
import { payrollStatusLabels } from "../domain/personnel";
import {
  calculatePayroll,
  createPayrollPeriod,
  listPayrollEntries,
  listPayrollPeriods,
  transitionPayroll,
} from "../services/personnel.service";
const money = (n: number) => `${Number(n).toLocaleString("fr-GN")} GNF`;
const iso = (d: Date) => d.toISOString().slice(0, 10);
export function PayrollPage() {
  const { institutionId } = useAcademicSession();
  const notify = useToast();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [periodId, setPeriodId] = useState<string>();
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    starts: new Date(),
    ends: new Date(),
  });
  const load = useCallback(async () => {
    const data = await listPayrollPeriods(institutionId);
    setPeriods(data);
    setPeriodId((x) => (x && data.some((p) => p.id === x) ? x : data[0]?.id));
  }, [institutionId]);
  useEffect(() => {
    void load();
  }, [load]);
  const loadEntries = useCallback(
    async () => setEntries(periodId ? await listPayrollEntries(periodId) : []),
    [periodId],
  );
  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);
  const total = useMemo(
    () => entries.reduce((s, x) => s + x.net_amount, 0),
    [entries],
  );
  const paid = useMemo(
    () => entries.reduce((s, x) => s + x.paid_amount, 0),
    [entries],
  );
  const period = periods.find((x) => x.id === periodId);
  const anomalies = entries.filter(
    (x) => x.net_amount < 0 || x.net_amount === 0,
  ).length;
  const run = async (action: "calculate" | "validate" | "close") => {
    if (!periodId) return;
    setBusy(true);
    try {
      if (action === "calculate") await calculatePayroll(periodId);
      else
        await transitionPayroll(
          periodId,
          action === "validate" ? "validated" : "closed",
        );
      await load();
      await loadEntries();
      notify({
        severity: "success",
        summary:
          action === "calculate"
            ? "Paie calculée"
            : action === "validate"
              ? "Paie validée"
              : "Période clôturée",
      });
    } catch (error) {
      notify({
        severity: "error",
        summary: "Action impossible",
        detail: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };
  const create = async () => {
    if (!form.name || form.ends < form.starts) return;
    setBusy(true);
    try {
      const created = await createPayrollPeriod({
        institution_id: institutionId,
        name: form.name,
        starts_on: iso(form.starts),
        ends_on: iso(form.ends),
      });
      setOpen(false);
      await load();
      setPeriodId(created.id);
      notify({ severity: "success", summary: "Période ouverte" });
    } catch (error) {
      notify({
        severity: "error",
        summary: "Création impossible",
        detail: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Paie"
        description="Préparez, contrôlez et clôturez la rémunération scolaire depuis les contrats et les heures validées."
        actions={
          <Button
            label="Nouvelle période"
            icon="pi pi-plus"
            onClick={() => setOpen(true)}
          />
        }
      />
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="w-full lg:max-w-sm">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Période de paie
            </span>
            <Dropdown
              className="w-full"
              value={periodId}
              options={periods.map((x) => ({ value: x.id, label: x.name }))}
              placeholder="Sélectionner une période"
              onChange={(e) => setPeriodId(e.value)}
            />
          </label>
          {period && (
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <Tag
                value={payrollStatusLabels[period.status]}
                severity={
                  period.status === "closed" || period.status === "paid"
                    ? "success"
                    : period.status === "calculated"
                      ? "info"
                      : "secondary"
                }
              />
              {["draft", "calculated"].includes(period.status) && (
                <Button
                  label="Calculer"
                  icon="pi pi-calculator"
                  outlined
                  loading={busy}
                  onClick={() => void run("calculate")}
                />
              )}{" "}
              {period.status === "calculated" && (
                <Button
                  label="Valider"
                  icon="pi pi-check"
                  loading={busy}
                  onClick={() => void run("validate")}
                />
              )}{" "}
              {(period.status === "validated" || period.status === "paid") && (
                <Button
                  label="Clôturer"
                  icon="pi pi-lock"
                  severity="secondary"
                  outlined
                  loading={busy}
                  onClick={() => void run("close")}
                />
              )}
            </div>
          )}
        </div>
      </section>
      {!period ? (
        <Message
          severity="info"
          text="Ouvrez une période pour calculer la rémunération du personnel actif."
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Net à payer", money(total)],
              ["Payé", money(paid)],
              ["Reste", money(total - paid)],
              ["Anomalies", anomalies],
            ].map(([label, value]) => (
              <article
                key={String(label)}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <span className="text-xs font-semibold uppercase text-slate-500">
                  {label}
                </span>
                <strong className="mt-1 block text-xl text-slate-900">
                  {value}
                </strong>
              </article>
            ))}
          </section>
          <SettingsTablePanel
            dataTable={
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <DataTable
                  value={entries}
                  dataKey="id"
                  paginator={entries.length > 10}
                  rows={10}
                  stripedRows
                  tableStyle={{ minWidth: "1050px" }}
                  emptyMessage={
                    period.status === "draft"
                      ? "Lancez le calcul pour générer les lignes de paie."
                      : "Aucune ligne calculée"
                  }
                >
                  <Column
                    header="Employé"
                    body={(x: PayrollEntry) => (
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
                  <Column
                    header="Fixe"
                    body={(x: PayrollEntry) => money(x.fixed_amount)}
                  />
                  <Column
                    header="Heures / variable"
                    body={(x: PayrollEntry) => money(x.variable_amount)}
                  />
                  <Column
                    header="Gains"
                    body={(x: PayrollEntry) => money(x.gains)}
                  />
                  <Column
                    header="Retenues"
                    body={(x: PayrollEntry) =>
                      money(x.deductions + x.advance_repayments)
                    }
                  />
                  <Column
                    header="Net"
                    body={(x: PayrollEntry) => (
                      <strong className="text-slate-900">
                        {money(x.net_amount)}
                      </strong>
                    )}
                  />
                  <Column
                    header="Payé"
                    body={(x: PayrollEntry) => (
                      <span className="text-emerald-700">
                        {money(x.paid_amount)}
                      </span>
                    )}
                  />
                  <Column
                    header="Reste"
                    body={(x: PayrollEntry) => (
                      <strong
                        className={
                          x.net_amount - x.paid_amount > 0
                            ? "text-amber-700"
                            : "text-slate-500"
                        }
                      >
                        {money(x.net_amount - x.paid_amount)}
                      </strong>
                    )}
                  />
                </DataTable>
              </div>
            }
          />
        </>
      )}
      <Dialog
        header="Ouvrir une période de paie"
        visible={open}
        modal
        className="w-[min(96vw,38rem)]"
        onHide={() => setOpen(false)}
      >
        <div className="grid gap-4">
          <label>
            <span className="mb-1 block text-sm font-medium">Libellé *</span>
            <InputText
              className="w-full"
              value={form.name}
              placeholder="Ex. Paie juillet 2026"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium">Début *</span>
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
              <span className="mb-1 block text-sm font-medium">Fin *</span>
              <Calendar
                className="w-full"
                minDate={form.starts}
                value={form.ends}
                dateFormat="dd/mm/yy"
                onChange={(e) =>
                  e.value && setForm({ ...form, ends: e.value as Date })
                }
              />
            </label>
          </div>
          <Message
            severity="info"
            text="Le calcul reprendra les contrats actifs et uniquement les heures validées sur cette période."
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            label="Annuler"
            outlined
            severity="secondary"
            onClick={() => setOpen(false)}
          />
          <Button
            label="Ouvrir la période"
            icon="pi pi-check"
            loading={busy}
            disabled={!form.name || form.ends < form.starts}
            onClick={() => void create()}
          />
        </div>
      </Dialog>
    </div>
  );
}
