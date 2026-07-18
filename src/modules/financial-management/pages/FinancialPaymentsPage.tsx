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
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { SettingsTablePanel } from "../../../shared/components/layout/SettingsTablePanel";
import { useToast } from "../../../shared/components/toast-context";
import {
  financialPaymentStatusLabels,
  paymentMethodLabels,
  type FinancialPayment,
  type OpenFinancialInstallment,
  type PaymentMethod,
} from "../domain/financial-payment";
import {
  cancelFinancialPayment,
  listFinancialPayments,
  listOpenFinancialInstallments,
  registerFinancialPayment,
} from "../services/financial-payments.service";

const formatAmount = (value: number) =>
  `${Number(value).toLocaleString("fr-GN")} GNF`;
const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR");
const toDateInput = (value: Date) => value.toISOString().slice(0, 10);
const isOverdue = (dueDate: string) => dueDate < toDateInput(new Date());

export function FinancialPaymentsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [payments, setPayments] = useState<FinancialPayment[]>([]);
  const [installments, setInstallments] = useState<OpenFinancialInstallment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedInstallment, setSelectedInstallment] =
    useState<OpenFinancialInstallment>();
  const [receiptPayment, setReceiptPayment] = useState<FinancialPayment>();
  const [paymentToCancel, setPaymentToCancel] = useState<FinancialPayment>();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [installmentSearch, setInstallmentSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>();
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "upcoming">("all");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    setError(undefined);
    try {
      const [nextPayments, nextInstallments] = await Promise.all([
        listFinancialPayments(institutionId, year.id),
        listOpenFinancialInstallments(institutionId, year.id),
      ]);
      setPayments(nextPayments);
      setInstallments(nextInstallments);
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

  const totalOutstanding = useMemo(
    () => installments.reduce((sum, item) => sum + item.balanceAmount, 0),
    [installments],
  );

  const levels = useMemo(
    () =>
      [...new Set(installments.map((item) => item.levelName).filter(Boolean))]
        .sort()
        .map((value) => ({ label: value, value })),
    [installments],
  );

  const filteredInstallments = useMemo(() => {
    const search = installmentSearch.trim().toLocaleLowerCase("fr");
    return installments.filter((item) => {
      const matchesSearch =
        !search ||
        `${item.studentName} ${item.matricule} ${item.label}`
          .toLocaleLowerCase("fr")
          .includes(search);
      const matchesLevel = !levelFilter || item.levelName === levelFilter;
      const overdue = isOverdue(item.dueDate);
      const matchesDue =
        dueFilter === "all" ||
        (dueFilter === "overdue" && overdue) ||
        (dueFilter === "upcoming" && !overdue);
      return matchesSearch && matchesLevel && matchesDue;
    });
  }, [dueFilter, installmentSearch, installments, levelFilter]);

  const filteredPayments = useMemo(() => {
    const search = historySearch.trim().toLocaleLowerCase("fr");
    return payments.filter((payment) => {
      const matchesSearch =
        !search ||
        `${payment.studentName} ${payment.matricule} ${payment.receiptNumber} ${payment.externalReference ?? ""}`
          .toLocaleLowerCase("fr")
          .includes(search);
      const matchesStatus = !historyStatus || payment.status === historyStatus;
      return matchesSearch && matchesStatus;
    });
  }, [historySearch, historyStatus, payments]);

  const accountInstallments = useMemo(() => {
    if (!selectedInstallment) return [];
    return installments
      .filter(
        (item) =>
          item.financialAccountId === selectedInstallment.financialAccountId,
      )
      .sort(
        (left, right) =>
          left.dueDate.localeCompare(right.dueDate) || left.sequence - right.sequence,
      );
  }, [installments, selectedInstallment]);

  const allocationPreview = useMemo(() => {
    let remaining = amount ?? 0;
    return accountInstallments
      .map((item) => {
        const allocated = Math.min(remaining, item.balanceAmount);
        remaining -= allocated;
        return { ...item, allocated };
      })
      .filter((item) => item.allocated > 0);
  }, [accountInstallments, amount]);

  const resetPaymentForm = () => {
    setSelectedInstallment(undefined);
    setAmount(null);
    setMethod("cash");
    setPaymentDate(new Date());
    setReference("");
    setNote("");
  };

  const startPayment = (installment: OpenFinancialInstallment) => {
    setSelectedInstallment(installment);
    setAmount(installment.balanceAmount);
    setMethod("cash");
    setPaymentDate(new Date());
    setReference("");
    setNote("");
  };

  const accountBalance = accountInstallments.reduce(
    (sum, item) => sum + item.balanceAmount,
    0,
  );
  const amountInvalid = Boolean(
    amount && (amount <= 0 || amount > accountBalance),
  );

  const handleSave = async () => {
    if (!selectedInstallment || !amount || amountInvalid) return;
    setSaving(true);
    try {
      await registerFinancialPayment({
        financialAccountId: selectedInstallment.financialAccountId,
        amount,
        method,
        paymentDate: toDateInput(paymentDate),
        externalReference: reference,
        note,
      });
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
        description={`Choisissez une échéance à régler ou consultez les paiements de ${year.name}.`}
        meta={
          <div className="flex flex-wrap gap-2">
            <Tag
              value={`${installments.length} échéance${installments.length > 1 ? "s" : ""} ouverte${installments.length > 1 ? "s" : ""}`}
              severity="warning"
            />
            <Tag value={`À recevoir ${formatAmount(totalOutstanding)}`} severity="info" />
            <Tag value={`Encaissé ${formatAmount(totalCollected)}`} severity="success" />
          </div>
        }
      />

      {error ? <Message severity="error" text={error} /> : null}

      <TabView>
        <TabPanel header="À encaisser" leftIcon="pi pi-calendar-clock mr-2">
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <i className="pi pi-info-circle mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium text-slate-900">Commencez par l’échéance à régler</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Sélectionnez l’élève et l’échéance présentée. Le montant restant est prérempli et la ventilation sur les échéances suivantes est affichée avant validation.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_14rem_12rem_auto]">
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search" />
                <InputText
                  value={installmentSearch}
                  className="w-full"
                  placeholder="Rechercher un élève, matricule ou échéance"
                  onChange={(event) => setInstallmentSearch(event.target.value)}
                />
              </span>
              <Dropdown
                value={levelFilter}
                options={levels}
                className="w-full"
                showClear
                placeholder="Tous les niveaux"
                onChange={(event) => setLevelFilter(event.value)}
              />
              <Dropdown
                value={dueFilter}
                className="w-full"
                options={[
                  { label: "Toutes les échéances", value: "all" },
                  { label: "En retard", value: "overdue" },
                  { label: "À venir", value: "upcoming" },
                ]}
                onChange={(event) => setDueFilter(event.value)}
              />
              <Button
                label="Réinitialiser"
                icon="pi pi-filter-slash"
                severity="secondary"
                outlined
                onClick={() => {
                  setInstallmentSearch("");
                  setLevelFilter(undefined);
                  setDueFilter("all");
                }}
              />
            </div>

            <SettingsTablePanel
              dataTable={
                <DataTable
                  value={filteredInstallments}
                  loading={loading}
                  dataKey="id"
                  emptyMessage="Aucune échéance ouverte ne correspond aux filtres."
                  paginator={filteredInstallments.length > 10}
                  rows={10}
                  rowsPerPageOptions={[10, 25, 50]}
                  stripedRows
                >
                  <Column field="studentName" header="Élève" sortable />
                  <Column field="matricule" header="Matricule" sortable />
                  <Column field="levelName" header="Niveau" sortable />
                  <Column field="label" header="Échéance" sortable />
                  <Column
                    header="Date prévue"
                    body={(item: OpenFinancialInstallment) => (
                      <div className="flex items-center gap-2">
                        <span>{formatDate(item.dueDate)}</span>
                        {isOverdue(item.dueDate) ? (
                          <Tag value="En retard" severity="danger" />
                        ) : null}
                      </div>
                    )}
                    sortField="dueDate"
                    sortable
                  />
                  <Column
                    header="Montant prévu"
                    body={(item: OpenFinancialInstallment) => formatAmount(item.amount)}
                    sortField="amount"
                    sortable
                  />
                  <Column
                    header="Déjà payé"
                    body={(item: OpenFinancialInstallment) => formatAmount(item.paidAmount)}
                    sortField="paidAmount"
                    sortable
                  />
                  <Column
                    header="Reste à payer"
                    body={(item: OpenFinancialInstallment) => (
                      <strong>{formatAmount(item.balanceAmount)}</strong>
                    )}
                    sortField="balanceAmount"
                    sortable
                  />
                  <Column
                    header=""
                    body={(item: OpenFinancialInstallment) => (
                      <Button
                        label="Encaisser"
                        icon="pi pi-wallet"
                        size="small"
                        onClick={() => startPayment(item)}
                      />
                    )}
                  />
                </DataTable>
              }
            />
          </div>
        </TabPanel>

        <TabPanel header="Historique" leftIcon="pi pi-history mr-2">
          <div className="space-y-4 pt-2">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_14rem_auto]">
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search" />
                <InputText
                  value={historySearch}
                  className="w-full"
                  placeholder="Élève, matricule, reçu ou référence"
                  onChange={(event) => setHistorySearch(event.target.value)}
                />
              </span>
              <Dropdown
                value={historyStatus}
                className="w-full"
                showClear
                placeholder="Tous les statuts"
                options={[
                  { label: "Comptabilisé", value: "posted" },
                  { label: "Annulé", value: "cancelled" },
                ]}
                onChange={(event) => setHistoryStatus(event.value)}
              />
              <Button
                label="Réinitialiser"
                icon="pi pi-filter-slash"
                severity="secondary"
                outlined
                onClick={() => {
                  setHistorySearch("");
                  setHistoryStatus(undefined);
                }}
              />
            </div>

            <SettingsTablePanel
              dataTable={
                <DataTable
                  value={filteredPayments}
                  loading={loading}
                  dataKey="id"
                  emptyMessage="Aucun encaissement ne correspond aux filtres."
                  paginator={filteredPayments.length > 10}
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
                    body={(payment: FinancialPayment) => paymentMethodLabels[payment.method]}
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
          </div>
        </TabPanel>
      </TabView>

      <Dialog
        header="Encaisser une échéance"
        visible={Boolean(selectedInstallment)}
        modal
        className="w-[min(96vw,52rem)]"
        onHide={resetPaymentForm}
      >
        {selectedInstallment ? (
          <div className="space-y-5 pt-2">
            <div className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Élève</p>
                <p className="mt-1 font-semibold text-slate-950">{selectedInstallment.studentName}</p>
                <p className="text-sm text-slate-600">{selectedInstallment.matricule} · {selectedInstallment.levelName}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Échéance choisie</p>
                <p className="mt-1 font-semibold text-slate-950">{selectedInstallment.label}</p>
                <p className="text-sm text-slate-600">Prévue le {formatDate(selectedInstallment.dueDate)} · reste {formatAmount(selectedInstallment.balanceAmount)}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="field">
                <label htmlFor="payment-amount">Montant reçu</label>
                <InputNumber
                  inputId="payment-amount"
                  value={amount}
                  className="w-full"
                  inputClassName="w-full"
                  min={0}
                  max={accountBalance}
                  mode="decimal"
                  useGrouping
                  locale="fr-FR"
                  suffix=" GNF"
                  invalid={amountInvalid}
                  onValueChange={(event) => setAmount(event.value ?? null)}
                />
                <small className={amountInvalid ? "p-error" : "text-slate-500"}>
                  Solde total du dossier : {formatAmount(accountBalance)}
                </small>
              </div>
              <div className="field">
                <label htmlFor="payment-method">Mode de paiement</label>
                <Dropdown
                  inputId="payment-method"
                  value={method}
                  className="w-full"
                  options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))}
                  onChange={(event) => setMethod(event.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="payment-date">Date d’encaissement</label>
                <Calendar
                  inputId="payment-date"
                  value={paymentDate}
                  className="w-full"
                  inputClassName="w-full"
                  dateFormat="dd/mm/yy"
                  showIcon
                  onChange={(event) => event.value && setPaymentDate(event.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="payment-reference">Référence externe</label>
                <InputText
                  id="payment-reference"
                  value={reference}
                  className="w-full"
                  placeholder="Transaction, virement, chèque…"
                  onChange={(event) => setReference(event.target.value)}
                />
              </div>
              <div className="field md:col-span-2">
                <label htmlFor="payment-note">Note</label>
                <InputTextarea
                  id="payment-note"
                  value={note}
                  className="w-full"
                  rows={3}
                  autoResize
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="font-semibold text-slate-950">Ventilation proposée</h3>
                <p className="mt-1 text-sm text-slate-500">Le paiement est affecté automatiquement aux échéances les plus anciennes de ce dossier.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {allocationPreview.length ? (
                  allocationPreview.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{item.label}</p>
                        <p className="text-slate-500">Échéance du {formatDate(item.dueDate)}</p>
                      </div>
                      <strong>{formatAmount(item.allocated)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-slate-500">Saisissez un montant pour voir la ventilation.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <Button label="Annuler" severity="secondary" outlined onClick={resetPaymentForm} />
              <Button
                label="Valider l’encaissement"
                icon="pi pi-check"
                loading={saving}
                disabled={!amount || amountInvalid}
                onClick={() => void handleSave()}
              />
            </div>
          </div>
        ) : null}
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
            <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
              <dt className="text-slate-500">Élève</dt><dd className="font-medium">{receiptPayment.studentName}</dd>
              <dt className="text-slate-500">Matricule</dt><dd>{receiptPayment.matricule}</dd>
              <dt className="text-slate-500">Date</dt><dd>{formatDate(receiptPayment.paymentDate)}</dd>
              <dt className="text-slate-500">Montant</dt><dd className="font-semibold">{formatAmount(receiptPayment.amount)}</dd>
              <dt className="text-slate-500">Mode</dt><dd>{paymentMethodLabels[receiptPayment.method]}</dd>
              <dt className="text-slate-500">Référence</dt><dd className="break-words">{receiptPayment.externalReference || "—"}</dd>
            </dl>
            {receiptPayment.status === "cancelled" ? (
              <Message severity="warn" text={`Reçu annulé : ${receiptPayment.cancellationReason ?? "motif non renseigné"}`} />
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
      >
        <div className="space-y-4 pt-2">
          <Message severity="warn" text="Cette opération restaure le solde du dossier et les échéances concernées." />
          <div className="field">
            <label htmlFor="cancellation-reason">Motif obligatoire</label>
            <InputTextarea
              id="cancellation-reason"
              value={cancellationReason}
              className="w-full"
              rows={4}
              autoResize
              onChange={(event) => setCancellationReason(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button label="Fermer" severity="secondary" outlined onClick={() => setPaymentToCancel(undefined)} />
            <Button
              label="Confirmer l’annulation"
              severity="danger"
              loading={saving}
              disabled={!cancellationReason.trim()}
              onClick={() => void handleCancel()}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
