import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
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
  listFinancialPayments,
  registerFinancialPayment,
} from "../services/financial-payments.service";

const formatAmount = (value: number) =>
  `${Number(value).toLocaleString("fr-GN")} GNF`;

const toDateInput = (value: Date) => value.toISOString().slice(0, 10);

export function FinancialPaymentsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [payments, setPayments] = useState<FinancialPayment[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accountId, setAccountId] = useState<string>();
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

  const resetForm = () => {
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
      setDialogOpen(false);
      resetForm();
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
            <Tag value={`${payments.length} paiement${payments.length > 1 ? "s" : ""}`} severity="secondary" />
            <Tag value={`Encaissé ${formatAmount(totalCollected)}`} severity="success" />
          </div>
        }
        actions={
          <Button
            label="Nouvel encaissement"
            icon="pi pi-plus"
            disabled={!accounts.length}
            onClick={() => setDialogOpen(true)}
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
            <Column field="paymentDate" header="Date" sortable />
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
              body={(payment: FinancialPayment) => paymentMethodLabels[payment.method]}
              sortField="method"
              sortable
            />
            <Column field="externalReference" header="Référence" />
            <Column
              header="Statut"
              body={(payment: FinancialPayment) => (
                <Tag
                  value={financialPaymentStatusLabels[payment.status]}
                  severity={payment.status === "posted" ? "success" : "danger"}
                />
              )}
            />
          </DataTable>
        }
      />

      <Dialog
        header="Nouvel encaissement"
        visible={dialogOpen}
        modal
        className="w-[min(94vw,38rem)]"
        onHide={() => setDialogOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button label="Annuler" severity="secondary" text onClick={() => setDialogOpen(false)} />
            <Button label="Enregistrer" icon="pi pi-check" loading={saving} disabled={!accountId || !amount || amount <= 0} onClick={() => void handleSave()} />
          </div>
        }
      >
        <div className="grid gap-4 pt-2">
          <label className="grid gap-2 text-sm font-medium">
            Dossier financier
            <Dropdown value={accountId} options={accountOptions} optionLabel="label" optionValue="value" placeholder="Sélectionner un élève" filter onChange={(event) => setAccountId(event.value)} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Montant
            <InputNumber value={amount} min={0} mode="decimal" useGrouping locale="fr-FR" suffix=" GNF" onValueChange={(event) => setAmount(event.value ?? null)} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Mode de paiement
            <Dropdown value={method} options={methodOptions} optionLabel="label" optionValue="value" onChange={(event) => setMethod(event.value)} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Date d’encaissement
            <Calendar value={paymentDate} dateFormat="dd/mm/yy" showIcon onChange={(event) => event.value && setPaymentDate(event.value)} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Référence externe
            <InputText value={reference} placeholder="Transaction, virement, chèque…" onChange={(event) => setReference(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Note
            <InputText value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </div>
      </Dialog>
    </div>
  );
}
