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
import type { FinancialAccount } from "../domain/financial-account";
import {
  financialPaymentStatusLabels,
  paymentMethodLabels,
  type FinancialPayment,
  type PaymentMethod,
} from "../domain/financial-payment";
import { listFinancialAccounts } from "../services/financial-accounts.service";
import {
  cancelFinancialPayment,
  listFinancialPayments,
  registerFinancialPayment,
} from "../services/financial-payments.service";

const formatAmount = (value: number) =>
  `${Number(value).toLocaleString("fr-GN")} GNF`;
const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR");
const toDateInput = (value: Date) => value.toISOString().slice(0, 10);

export function FinancialPaymentsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [payments, setPayments] = useState<FinancialPayment[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<FinancialPayment>();
  const [paymentToCancel, setPaymentToCancel] = useState<FinancialPayment>();
  const [accountId, setAccountId] = useState<string>();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    setError(undefined);
    try {
      const [nextPayments, nextAccounts] = await Promise.all([
        listFinancialPayments(institutionId, year.id),
        listFinancialAccounts(institutionId, year.id),
      ]);
      setPayments(nextPayments);
      setAccounts(nextAccounts.filter((account) => account.balanceAmount > 0));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de charger les encaissements.",
      );
    } finally {
      setLoading(false);
    }
  }, [institutionId, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalCollected = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "posted")
        .reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );

  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: `${account.studentName} — reste ${formatAmount(account.balanceAmount)}`,
  }));
  const methodOptions = Object.entries(paymentMethodLabels).map(
    ([value, label]) => ({ value, label }),
  );

  const resetPaymentForm = () => {
    setAccountId(undefined);
    setAmount(null);
    setMethod("cash");
    setPaymentDate(new Date());
    setReference("");
    setNote("");
  };

  const handleSave = async () => {
    if (!accountId || !amount || amount <= 0) return;
    setSaving(true);
    try {
      await registerFinancialPayment({
        financialAccountId: accountId,
        amount,
        method,
        paymentDate: toDateInput(paymentDate),
        externalReference: reference,
        note,
      });
      setPaymentDialogOpen(false);
      resetPaymentForm();
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

  const handleCancel = async () => {
    if (!paymentToCancel || !cancellationReason.trim()) return;
    setSaving(true);
    try {
      await cancelFinancialPayment(paymentToCancel.id, cancellationReason);
      setPaymentToCancel(undefined);
      setCancellationReason("");
      await load();
      notify({ severity: "success", summary: "Encaissement annulé" });
    } catch (cause) {
      notify({
        severity: "error",
        summary: "Annulation impossible",
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
        text="Sélectionnez une année scolaire pour consulter les encaissements."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Encaissements"
        description={`Paiements reçus et ventilés automatiquement sur les échéances pour ${year.name}.`}
        meta={
          <div className="flex flex-wrap gap-2">
            <Tag
              value={`${payments.length} paiement${payments.length > 1 ? "s" : ""}`}
              severity="secondary"
            />
            <Tag
              value={`Encaissé ${formatAmount(totalCollected)}`}
              severity="success"
            />
          </div>
        }
        actions={
          <Button
            label="Nouvel encaissement"
            icon="pi pi-plus"
            disabled={!accounts.length}
            onClick={() => setPaymentDialogOpen(true)}
          />
        }
      />

      <SettingsTablePanel
        alert={error ? <Message severity="error" text={error} /> : undefined}
        dataTable={
          <DataTable
            value={payments}
            loading={loading}
            dataKey="id"
            emptyMessage="Aucun encaissement n’a encore été enregistré."
            paginator={payments.length > 10}
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            stripedRows
          >
            <Column field="receiptNumber" header="Reçu" sortable />
            <Column
              field="paymentDate"
              header="Date"
              body={(payment: FinancialPayment) => formatDate(payment.paymentDate)}
              sortable
            />
            <Column field="studentName" header="Élève" sortable />
            <Column field="matricule" header="Matricule" sortable />
            <Column
              header="Montant"
              body={(payment: FinancialPayment) => formatAmount(payment.amount)}
              sortField="amount"
              sortable
            />
            <Column
              header="Mode"
              body={(payment: FinancialPayment) =>
                paymentMethodLabels[payment.method]
              }
              sortField="method"
              sortable
            />
            <Column
              header="Statut"
              body={(payment: FinancialPayment) => (
                <Tag
                  value={financialPaymentStatusLabels[payment.status]}
                  severity={payment.status === "posted" ? "success" : "danger"}
                />
              )}
            />
            <Column
              header="Actions"
              body={(payment: FinancialPayment) => (
                <div className="flex gap-1">
                  <Button
                    icon="pi pi-receipt"
                    text
                    rounded
                    aria-label="Voir le reçu"
                    onClick={() => setReceiptPayment(payment)}
                  />
                  {payment.status === "posted" ? (
                    <Button
                      icon="pi pi-ban"
                      severity="danger"
                      text
                      rounded
                      aria-label="Annuler l’encaissement"
                      onClick={() => setPaymentToCancel(payment)}
                    />
                  ) : null}
                </div>
              )}
            />
          </DataTable>
        }
      />

      <Dialog
        header="Nouvel encaissement"
        visible={paymentDialogOpen}
        modal
        className="w-[min(94vw,38rem)]"
        onHide={() => setPaymentDialogOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Annuler"
              severity="secondary"
              text
              onClick={() => setPaymentDialogOpen(false)}
            />
            <Button
              label="Enregistrer"
              icon="pi pi-check"
              loading={saving}
              disabled={!accountId || !amount || amount <= 0}
              onClick={() => void handleSave()}
            />
          </div>
        }
      >
        <div className="grid gap-4 pt-2">
          <label className="grid gap-2 text-sm font-medium">
            Dossier financier
            <Dropdown
              value={accountId}
              options={accountOptions}
              optionLabel="label"
              optionValue="value"
              placeholder="Sélectionner un élève"
              filter
              onChange={(event) => setAccountId(event.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Montant
            <InputNumber
              value={amount}
              min={0}
              mode="decimal"
              useGrouping
              locale="fr-FR"
              suffix=" GNF"
              onValueChange={(event) => setAmount(event.value ?? null)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Mode de paiement
            <Dropdown
              value={method}
              options={methodOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(event) => setMethod(event.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Date d’encaissement
            <Calendar
              value={paymentDate}
              dateFormat="dd/mm/yy"
              showIcon
              onChange={(event) => event.value && setPaymentDate(event.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Référence externe
            <InputText
              value={reference}
              placeholder="Transaction, virement, chèque…"
              onChange={(event) => setReference(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Note
            <InputText
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>
      </Dialog>

      <Dialog
        header="Reçu d’encaissement"
        visible={Boolean(receiptPayment)}
        modal
        className="w-[min(94vw,34rem)]"
        onHide={() => setReceiptPayment(undefined)}
      >
        {receiptPayment ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Numéro de reçu</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{receiptPayment.receiptNumber}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <dt className="text-slate-500">Élève</dt><dd className="font-medium">{receiptPayment.studentName}</dd>
              <dt className="text-slate-500">Matricule</dt><dd>{receiptPayment.matricule}</dd>
              <dt className="text-slate-500">Date</dt><dd>{formatDate(receiptPayment.paymentDate)}</dd>
              <dt className="text-slate-500">Montant</dt><dd className="font-semibold">{formatAmount(receiptPayment.amount)}</dd>
              <dt className="text-slate-500">Mode</dt><dd>{paymentMethodLabels[receiptPayment.method]}</dd>
              <dt className="text-slate-500">Référence</dt><dd>{receiptPayment.externalReference || "—"}</dd>
            </dl>
            {receiptPayment.status === "cancelled" ? (
              <Message
                severity="warn"
                text={`Reçu annulé : ${receiptPayment.cancellationReason ?? "motif non renseigné"}`}
              />
            ) : null}
          </div>
        ) : null}
      </Dialog>

      <Dialog
        header="Annuler l’encaissement"
        visible={Boolean(paymentToCancel)}
        modal
        className="w-[min(94vw,34rem)]"
        onHide={() => {
          setPaymentToCancel(undefined);
          setCancellationReason("");
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Fermer"
              severity="secondary"
              text
              onClick={() => setPaymentToCancel(undefined)}
            />
            <Button
              label="Confirmer l’annulation"
              severity="danger"
              loading={saving}
              disabled={!cancellationReason.trim()}
              onClick={() => void handleCancel()}
            />
          </div>
        }
      >
        <div className="grid gap-3 pt-2">
          <Message
            severity="warn"
            text="Cette opération restaure le solde du dossier et les échéances concernées."
          />
          <label className="grid gap-2 text-sm font-medium">
            Motif obligatoire
            <InputTextarea
              value={cancellationReason}
              rows={4}
              autoResize
              onChange={(event) => setCancellationReason(event.target.value)}
            />
          </label>
        </div>
      </Dialog>
    </div>
  );
}
