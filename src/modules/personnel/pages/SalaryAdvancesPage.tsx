import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PersonnelDecisionDialog } from "../components/PersonnelDecisionDialog";
import { SalaryAdvanceDialog } from "../components/SalaryAdvanceDialog";
import type { Employee, SalaryAdvance } from "../domain/personnel";
import {
  listEmployees,
  listPersonnelCatalog,
  listSalaryAdvances,
  transitionSalaryAdvance,
  type CatalogItem,
} from "../services/personnel.service";

const labels: Record<SalaryAdvance["status"], string> = {
  requested: "Demandée",
  approved: "Approuvée",
  rejected: "Refusée",
  paid: "Décaissée",
  settled: "Soldée",
  cancelled: "Annulée",
};
const money = (value: number) =>
  new Intl.NumberFormat("fr-GN", {
    style: "currency",
    currency: "GNF",
    maximumFractionDigits: 0,
  }).format(value);

export function SalaryAdvancesPage() {
  const { institutionId } = useAcademicSession();
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<SalaryAdvance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [employeeId, setEmployeeId] = useState(params.get("employee") || "");
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<{
    item: SalaryAdvance;
    status: "approved" | "rejected" | "paid" | "settled";
  } | null>(null);
  const load = useCallback(async () => {
    const [advances, people, catalog] = await Promise.all([
      listSalaryAdvances(institutionId),
      listEmployees(institutionId),
      listPersonnelCatalog(institutionId),
    ]);
    setItems(advances);
    setEmployees(people);
    setCatalogs(catalog);
  }, [institutionId]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      items.filter((item) => !employeeId || item.employee_id === employeeId),
    [employeeId, items],
  );
  const changeEmployee = (value: string) => {
    setEmployeeId(value);
    setParams(value ? { employee: value } : {});
  };
  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Avances sur salaire"
        description="Traitez les demandes, décaissements, remboursements et soldes depuis une page RH unique."
        actions={
          <Button
            label="Nouvelle avance"
            icon="pi pi-plus"
            disabled={!employeeId}
            onClick={() => setOpen(true)}
          />
        }
      />
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 md:flex-row md:items-end">
        <label className="w-full md:max-w-md">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">
            Employé
          </span>
          <Dropdown
            className="w-full"
            filter
            showClear
            value={employeeId}
            placeholder="Tous les employés"
            options={employees.map((x) => ({
              value: x.id,
              label: `${x.first_name} ${x.last_name} — ${x.employee_number}`,
            }))}
            onChange={(e) => changeEmployee(e.value || "")}
          />
        </label>
        {!employeeId && (
          <small className="pb-2 text-slate-500">
            Sélectionnez un employé pour enregistrer une avance.
          </small>
        )}
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          value={filtered}
          dataKey="id"
          paginator={filtered.length > 10}
          rows={10}
          emptyMessage="Aucune avance"
          stripedRows
        >
          <Column
            header="Employé"
            body={(x: SalaryAdvance) => (
              <div>
                <strong>
                  {x.employee
                    ? `${x.employee.first_name} ${x.employee.last_name}`
                    : "—"}
                </strong>
                <small className="block text-slate-500">
                  {x.employee?.employee_number}
                </small>
              </div>
            )}
          />
          <Column field="requested_on" header="Demandée le" sortable />
          <Column
            header="Montant"
            body={(x: SalaryAdvance) =>
              money(x.amount_approved ?? x.amount_requested)
            }
          />
          <Column
            header="Reste"
            body={(x: SalaryAdvance) =>
              money(
                Math.max(
                  0,
                  (x.amount_approved ?? x.amount_requested) - x.repaid_amount,
                ),
              )
            }
          />
          <Column
            field="reason"
            header="Motif"
            body={(x: SalaryAdvance) => x.reason || "—"}
          />
          <Column
            header="Statut"
            body={(x: SalaryAdvance) => (
              <Tag
                value={labels[x.status]}
                severity={
                  x.status === "settled"
                    ? "success"
                    : x.status === "rejected"
                      ? "danger"
                      : "info"
                }
              />
            )}
          />
          <Column
            header="Actions"
            body={(x: SalaryAdvance) => (
              <div className="flex flex-wrap gap-1">
                {x.status === "requested" && (
                  <>
                    <Button
                      label="Approuver"
                      icon="pi pi-check"
                      size="small"
                      text
                      severity="success"
                      onClick={() =>
                        setDecision({ item: x, status: "approved" })
                      }
                    />
                    <Button
                      label="Refuser"
                      icon="pi pi-times"
                      size="small"
                      text
                      severity="danger"
                      onClick={() =>
                        setDecision({ item: x, status: "rejected" })
                      }
                    />
                  </>
                )}
                {x.status === "approved" && (
                  <Button
                    label="Décaisser"
                    icon="pi pi-wallet"
                    size="small"
                    text
                    onClick={() => setDecision({ item: x, status: "paid" })}
                  />
                )}
                {x.status === "paid" && (
                  <Button
                    label="Solder"
                    icon="pi pi-check-circle"
                    size="small"
                    text
                    severity="success"
                    onClick={() => setDecision({ item: x, status: "settled" })}
                  />
                )}
              </div>
            )}
          />
        </DataTable>
      </section>
      {employeeId && (
        <SalaryAdvanceDialog
          visible={open}
          onHide={() => setOpen(false)}
          onSaved={load}
          institutionId={institutionId}
          employeeId={employeeId}
          catalogs={catalogs}
        />
      )}
      {decision && (
        <PersonnelDecisionDialog
          visible
          title={`${decision.status === "approved" ? "Approuver" : decision.status === "rejected" ? "Refuser" : decision.status === "paid" ? "Décaisser" : "Solder"} l’avance`}
          description={`Demande de ${money(decision.item.amount_requested)}. Cette action sera tracée dans l’historique RH.`}
          confirmLabel={
            decision.status === "approved"
              ? "Approuver"
              : decision.status === "rejected"
                ? "Confirmer le refus"
                : decision.status === "paid"
                  ? "Confirmer le décaissement"
                  : "Confirmer le solde"
          }
          severity={decision.status === "rejected" ? "danger" : "success"}
          amountLabel={
            decision.status === "approved" ? "Montant approuvé" : undefined
          }
          initialAmount={decision.item.amount_requested}
          maxAmount={decision.item.amount_requested}
          commentRequired={
            decision.status !== "paid" && decision.status !== "settled"
          }
          onHide={() => setDecision(null)}
          onConfirm={async ({ amount, comment }) => {
            await transitionSalaryAdvance({
              advanceId: decision.item.id,
              status: decision.status,
              approvedAmount: amount,
              comment,
            });
            notify({ severity: "success", summary: "Avance mise à jour" });
            await load();
          }}
        />
      )}
    </div>
  );
}
