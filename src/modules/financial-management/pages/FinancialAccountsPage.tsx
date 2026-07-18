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
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import {
  financialAccountStatusLabels,
  type FinancialAccount,
  type FinancialAccountDetails,
  type FinancialAccountStatus,
} from "../domain/financial-account";
import { paymentMethodLabels, type PaymentMethod } from "../domain/financial-payment";
import {
  generateFinancialAccount,
  getFinancialAccount,
  listConfirmedEnrollmentsWithoutFinancialAccount,
  listFinancialAccounts,
} from "../services/financial-accounts.service";
import { registerFinancialPayment } from "../services/financial-payments.service";

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
const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR");
const toDateInput = (value: Date) => value.toISOString().slice(0, 10);

export function FinancialAccountsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string>();
  const [paymentAccount, setPaymentAccount] = useState<FinancialAccountDetails>();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    setError(undefined);
    try {
      const [nextAccounts, nextEnrollments] = await Promise.all([
        listFinancialAccounts(institutionId, year.id),
        listConfirmedEnrollmentsWithoutFinancialAccount(institutionId, year.id),
      ]);
      setAccounts(nextAccounts);
      setEnrollments(nextEnrollments);
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
      label: `${student?.first_name ?? ""} ${student?.last_name ?? ""} — ${enrollment.level_name_snapshot}`.trim(),
    };
  });

  const handleGenerate = async () => {
    if (!enrollmentId) return;
    setGenerating(true);
    try {
      await generateFinancialAccount(enrollmentId);
      setGenerationDialogOpen(false);
      setEnrollmentId(undefined);
      await load();
      notify({ severity: "success", summary: "Dossier financier généré" });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : undefined;
      notify({
        severity: "error",
        summary: "Génération impossible",
        detail,
      });
    } finally {
      setGenerating(false);
    }
  };

  const openPayment = async (account: FinancialAccount) => {
    try {
      const details = await getFinancialAccount(account.id);
      setPaymentAccount(details);
      const firstOpen = details.installments.find((item) => item.balanceAmount > 0);
      setAmount(firstOpen?.balanceAmount ?? details.balanceAmount);
      setMethod("cash");
      setPaymentDate(new Date());
      setReference("");
      setNote("");
    } catch (cause) {
      notify({
        severity: "error",
        summary: "Dossier inaccessible",
        detail: cause instanceof Error ? cause.message : undefined,
      });
    }
  };

  const closePayment = () => {
    setPaymentAccount(undefined);
    setAmount(null);
    setReference("");
    setNote("");
  };

  const allocationPreview = useMemo(() => {
    if (!paymentAccount) return [];
    let remaining = amount ?? 0;
    return paymentAccount.installments
      .filter((item) => item.balanceAmount > 0)
      .map((item) => {
        const allocated = Math.min(remaining, item.balanceAmount);
        remaining -= allocated;
        return { ...item, allocated };
      })
      .filter((item) => item.allocated > 0);
  }, [amount, paymentAccount]);

  const handlePayment = async () => {
    if (
      !paymentAccount ||
      !amount ||
      amount <= 0 ||
      amount > paymentAccount.balanceAmount
    ) {
      return;
    }

    setSaving(true);
    try {
      await registerFinancialPayment({
        financialAccountId: paymentAccount.id,
        amount,
        method,
        paymentDate: toDateInput(paymentDate),
        externalReference: reference,
        note,
      });
      closePayment();
      await load();
      notify({ severity: "success", summary: "Encaissement enregistré" });
    } catch (cause) {
      notify({
        severity: "error",
        summary: "Encaissement impossible",
        detail: cause instanceof Error ? cause.message : undefined,
      });
    } finally {
      setSaving(false);
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
        description={`Les frais et leurs plans sont résolus automatiquement selon le niveau, le cycle puis l’établissement pour ${year.name}.`}
        meta={
          <div className="flex flex-wrap gap-2">
            <Tag value={`${accounts.length} dossier${accounts.length > 1 ? "s" : ""}`} severity="secondary" />
            <Tag value={`Total ${formatAmount(totals.total)}`} severity="info" />
            <Tag value={`Reste ${formatAmount(totals.balance)}`} severity={totals.balance > 0 ? "warning" : "success"} />
          </div>
        }
        actions={
          <Button
            label="Générer un dossier"
            icon="pi pi-plus"
            disabled={!enrollments.length}
            onClick={() => setGenerationDialogOpen(true)}
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
            emptyMessage="Aucun dossier financier n’a encore été généré."
            paginator={accounts.length > 10}
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            stripedRows
          >
            <Column field="studentName" header="Élève" sortable />
            <Column field="matricule" header="Matricule" sortable />
            <Column field="levelName" header="Niveau" sortable />
            <Column header="Montant" body={(account: FinancialAccount) => formatAmount(account.totalAmount, account.currencyCode)} sortable sortField="totalAmount" />
            <Column header="Payé" body={(account: FinancialAccount) => formatAmount(account.paidAmount, account.currencyCode)} sortable sortField="paidAmount" />
            <Column header="Reste" body={(account: FinancialAccount) => <strong>{formatAmount(account.balanceAmount, account.currencyCode)}</strong>} sortable sortField="balanceAmount" />
            <Column header="Statut" body={(account: FinancialAccount) => <Tag value={financialAccountStatusLabels[account.status]} severity={statusSeverity[account.status]} />} sortable sortField="status" />
            <Column header="" body={(account: FinancialAccount) => <Button label="Encaisser" icon="pi pi-wallet" size="small" disabled={account.balanceAmount <= 0 || account.status === "cancelled"} onClick={() => void openPayment(account)} />} />
          </DataTable>
        }
      />

      <Dialog
        header="Générer un dossier financier"
        visible={generationDialogOpen}
        modal
        className="form-dialog form-dialog-wide"
        onHide={() => {
          setGenerationDialogOpen(false);
          setEnrollmentId(undefined);
        }}
      >
        <div className="form-grid">
          <div className="field field-wide">
            <label htmlFor="financial-enrollment">Inscription confirmée</label>
            <Dropdown
              inputId="financial-enrollment"
              className="w-full"
              value={enrollmentId}
              options={enrollmentOptions}
              optionLabel="label"
              optionValue="value"
              placeholder="Sélectionner un élève"
              filter
              showClear
              onChange={(event) => setEnrollmentId(event.value)}
            />
            <small className="text-slate-500">
              GeeCole détecte les frais applicables et résout le plan de chaque frais automatiquement.
            </small>
          </div>
          <div className="dialog-actions field-wide">
            <Button label="Annuler" severity="secondary" outlined onClick={() => setGenerationDialogOpen(false)} />
            <Button label="Générer" icon="pi pi-check" loading={generating} disabled={!enrollmentId} onClick={() => void handleGenerate()} />
          </div>
        </div>
      </Dialog>

      <Dialog
        header="Encaisser un élève"
        visible={Boolean(paymentAccount)}
        modal
        className="w-[min(96vw,54rem)]"
        onHide={closePayment}
      >
        {paymentAccount ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <div className="text-lg font-semibold">{paymentAccount.studentName}</div>
                <div className="text-sm text-slate-500">{paymentAccount.matricule} · {paymentAccount.levelName}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">Solde du dossier</div>
                <div className="text-xl font-semibold">{formatAmount(paymentAccount.balanceAmount, paymentAccount.currencyCode)}</div>
              </div>
            </div>

            <div className="space-y-3">
              {paymentAccount.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-sm text-slate-500">Plan : {item.paymentPlanName ?? "Non renseigné"}</div>
                    </div>
                    <strong>{formatAmount(item.amount, paymentAccount.currencyCode)}</strong>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {(item.installments ?? []).map((installment) => (
                      <div key={installment.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
                        <div>
                          <div>{installment.label}</div>
                          <div className="text-slate-500">{formatDate(installment.dueDate)}</div>
                        </div>
                        <div className="text-right">
                          <div>{formatAmount(installment.amount, paymentAccount.currencyCode)}</div>
                          <div className={installment.balanceAmount <= 0 ? "text-green-600" : installment.paidAmount > 0 ? "text-orange-600" : "text-slate-500"}>
                            {installment.balanceAmount <= 0 ? "Payé" : `Reste ${formatAmount(installment.balanceAmount, paymentAccount.currencyCode)}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="field">
                <label htmlFor="payment-amount">Montant reçu</label>
                <InputNumber inputId="payment-amount" value={amount} min={0} max={paymentAccount.balanceAmount} mode="decimal" useGrouping className="w-full" onValueChange={(event) => setAmount(event.value ?? null)} />
              </div>
              <div className="field">
                <label htmlFor="payment-method">Mode de paiement</label>
                <Dropdown inputId="payment-method" value={method} options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))} className="w-full" onChange={(event) => setMethod(event.value)} />
              </div>
              <div className="field">
                <label htmlFor="payment-date">Date</label>
                <Calendar inputId="payment-date" value={paymentDate} dateFormat="dd/mm/yy" className="w-full" onChange={(event) => event.value && setPaymentDate(event.value as Date)} />
              </div>
              <div className="field">
                <label htmlFor="payment-reference">Référence</label>
                <InputText id="payment-reference" value={reference} className="w-full" onChange={(event) => setReference(event.target.value)} />
              </div>
              <div className="field md:col-span-2">
                <label htmlFor="payment-note">Note</label>
                <InputTextarea id="payment-note" value={note} rows={2} className="w-full" onChange={(event) => setNote(event.target.value)} />
              </div>
            </div>

            {allocationPreview.length ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="mb-2 font-semibold">Ventilation prévue</div>
                <div className="space-y-1 text-sm">
                  {allocationPreview.map((item) => (
                    <div key={item.id} className="flex justify-between gap-3">
                      <span>{item.label}</span>
                      <strong>{formatAmount(item.allocated, paymentAccount.currencyCode)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button label="Annuler" severity="secondary" outlined onClick={closePayment} />
              <Button label="Enregistrer l’encaissement" icon="pi pi-check" loading={saving} disabled={!amount || amount <= 0 || amount > paymentAccount.balanceAmount} onClick={() => void handlePayment()} />
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}