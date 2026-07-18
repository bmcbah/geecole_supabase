import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  listPaymentPlans,
  type PaymentPlan,
} from "../../settings/services/payment-plans.service";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import {
  financialAccountStatusLabels,
  type FinancialAccount,
  type FinancialAccountStatus,
} from "../domain/financial-account";
import {
  generateFinancialAccount,
  listConfirmedEnrollmentsWithoutFinancialAccount,
  listFinancialAccounts,
} from "../services/financial-accounts.service";

const statusSeverity: Record<
  FinancialAccountStatus,
  "secondary" | "info" | "success" | "danger"
> = {
  draft: "secondary",
  active: "info",
  settled: "success",
  cancelled: "danger",
};

const formatAmount = (value: number, currency = "GNF") =>
  `${Number(value).toLocaleString("fr-GN")} ${currency}`;

export function FinancialAccountsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string>();
  const [paymentPlanId, setPaymentPlanId] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    setError(undefined);
    try {
      const [nextAccounts, nextEnrollments, nextPlans] = await Promise.all([
        listFinancialAccounts(institutionId, year.id),
        listConfirmedEnrollmentsWithoutFinancialAccount(institutionId, year.id),
        listPaymentPlans(institutionId, year.id),
      ]);
      setAccounts(nextAccounts);
      setEnrollments(nextEnrollments);
      setPlans(nextPlans.filter((plan) => plan.is_active));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de charger la gestion financière.",
      );
    } finally {
      setLoading(false);
    }
  }, [institutionId, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(
    () =>
      accounts.reduce(
        (summary, account) => ({
          total: summary.total + account.totalAmount,
          paid: summary.paid + account.paidAmount,
          balance: summary.balance + account.balanceAmount,
        }),
        { total: 0, paid: 0, balance: 0 },
      ),
    [accounts],
  );

  const enrollmentOptions = enrollments.map((enrollment) => {
    const student = Array.isArray(enrollment.student)
      ? enrollment.student[0]
      : enrollment.student;
    return {
      value: enrollment.id,
      label:
        `${student?.first_name ?? ""} ${student?.last_name ?? ""} — ${enrollment.level_name_snapshot}`.trim(),
    };
  });

  const handleGenerate = async () => {
    if (!enrollmentId || !paymentPlanId) return;
    setGenerating(true);
    try {
      await generateFinancialAccount(enrollmentId, paymentPlanId);
      setDialogOpen(false);
      setEnrollmentId(undefined);
      setPaymentPlanId(undefined);
      await load();
      notify({ severity: "success", summary: "Dossier financier généré" });
    } catch (cause) {
      notify({
        severity: "error",
        summary: "Génération impossible",
        detail: cause instanceof Error ? cause.message : undefined,
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!year) {
    return (
      <Message
        severity="warn"
        text="Sélectionnez une année scolaire pour ouvrir la gestion financière."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dossiers financiers"
        description={`Frais et échéanciers figés des élèves pour ${year.name}.`}
        meta={
          <div className="flex flex-wrap gap-2">
            <Tag
              value={`${accounts.length} dossier${accounts.length > 1 ? "s" : ""}`}
              severity="secondary"
            />
            <Tag
              value={`Total ${formatAmount(totals.total)}`}
              severity="info"
            />
            <Tag
              value={`Reste ${formatAmount(totals.balance)}`}
              severity={totals.balance > 0 ? "warning" : "success"}
            />
          </div>
        }
        actions={
          <Button
            label="Générer un dossier"
            icon="pi pi-plus"
            disabled={!enrollments.length || !plans.length}
            onClick={() => setDialogOpen(true)}
          />
        }
      />

      <SettingsTablePanel
        alert={error ? <Message severity="error" text={error} /> : undefined}
        dataTable={
          <DataTable
            value={accounts}
            loading={loading}
            dataKey="id"
            emptyMessage="Aucun dossier financier n’a encore été généré pour cette année scolaire."
            paginator={accounts.length > 10}
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            stripedRows
          >
            <Column field="studentName" header="Élève" sortable />
            <Column field="matricule" header="Matricule" sortable />
            <Column field="levelName" header="Niveau" sortable />
            <Column
              header="Montant"
              body={(account: FinancialAccount) =>
                formatAmount(account.totalAmount, account.currencyCode)
              }
              sortField="totalAmount"
              sortable
            />
            <Column
              header="Payé"
              body={(account: FinancialAccount) =>
                formatAmount(account.paidAmount, account.currencyCode)
              }
              sortField="paidAmount"
              sortable
            />
            <Column
              header="Reste"
              body={(account: FinancialAccount) =>
                formatAmount(account.balanceAmount, account.currencyCode)
              }
              sortField="balanceAmount"
              sortable
            />
            <Column
              header="Statut"
              body={(account: FinancialAccount) => (
                <Tag
                  value={financialAccountStatusLabels[account.status]}
                  severity={statusSeverity[account.status]}
                />
              )}
              sortField="status"
              sortable
            />
          </DataTable>
        }
      />

      <Dialog
        header="Générer un dossier financier"
        visible={dialogOpen}
        modal
        className="w-[min(94vw,36rem)]"
        onHide={() => setDialogOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Annuler"
              severity="secondary"
              text
              onClick={() => setDialogOpen(false)}
            />
            <Button
              label="Générer"
              icon="pi pi-check"
              loading={generating}
              disabled={!enrollmentId || !paymentPlanId}
              onClick={() => void handleGenerate()}
            />
          </div>
        }
      >
        <div className="grid gap-4 pt-2">
          <label className="grid gap-2 text-sm font-medium">
            Inscription confirmée
            <Dropdown
              value={enrollmentId}
              options={enrollmentOptions}
              optionLabel="label"
              optionValue="value"
              placeholder="Sélectionner un élève"
              filter
              onChange={(event) => setEnrollmentId(event.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Plan de paiement
            <Dropdown
              value={paymentPlanId}
              options={plans}
              optionLabel="name"
              optionValue="id"
              placeholder="Sélectionner un plan"
              onChange={(event) => setPaymentPlanId(event.value)}
            />
          </label>
        </div>
      </Dialog>
    </div>
  );
}
