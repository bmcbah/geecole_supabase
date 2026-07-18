import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { ProgressBar } from "primereact/progressbar";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { useToast } from "../../../shared/components/toast-context";
import {
  financialAccountStatusLabels,
  type FinancialAccountDetails,
  type FinancialAccountItem,
} from "../domain/financial-account";
import {
  financialBenefitTypeLabels,
  type StudentFinancialAdjustment,
} from "../domain/financial-benefit";
import { paymentMethodLabels, type PaymentMethod } from "../domain/financial-payment";
import { FinancialItemBenefitDialog } from "../components/FinancialItemBenefitDialog";
import { getFinancialAccount } from "../services/financial-accounts.service";
import {
  cancelStudentFinancialBenefit,
  listFinancialAdjustments,
} from "../services/financial-benefits.service";
import { registerTargetedFinancialPayment } from "../services/financial-payments.service";
import { listAccountPayments } from "../services/student-finance.service";

const formatAmount = (value: number, currency = "GNF") =>
  `${Number(value).toLocaleString("fr-GN")} ${currency}`;
const formatDate = (value?: string | null) =>
  value
    ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export function FinancialAccountDetailPage() {
  const { accountId = "" } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const { institutionId, year } = useAcademicSession();
  const [account, setAccount] = useState<FinancialAccountDetails>();
  const [adjustments, setAdjustments] = useState<StudentFinancialAdjustment[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [benefitItem, setBenefitItem] = useState<FinancialAccountItem>();
  const [paymentItem, setPaymentItem] = useState<FinancialAccountItem>();
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelAdjustment, setCancelAdjustment] = useState<StudentFinancialAdjustment>();
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setFailure("");
    try {
      const nextAccount = await getFinancialAccount(accountId);
      const [nextAdjustments, nextPayments] = await Promise.all([
        listFinancialAdjustments(accountId),
        listAccountPayments(accountId),
      ]);
      setAccount(nextAccount);
      setAdjustments(nextAdjustments);
      setPayments(nextPayments);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Impossible de charger le dossier financier.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedInstallments = useMemo(
    () => (paymentItem?.installments ?? []).filter((installment) => installment.balanceAmount > 0),
    [paymentItem],
  );
  const paymentTotal = selectedInstallments.reduce(
    (sum, installment) => sum + (amounts[installment.id] ?? 0),
    0,
  );

  const openPayment = (item: FinancialAccountItem) => {
    setPaymentItem(item);
    setAmounts({});
    setMethod("cash");
    setNote("");
  };

  const settleItem = () => {
    setAmounts(
      selectedInstallments.reduce<Record<string, number>>((result, installment) => {
        result[installment.id] = installment.balanceAmount;
        return result;
      }, {}),
    );
  };

  const submitPayment = async () => {
    if (!account || !paymentItem || paymentTotal <= 0) return;
    setSaving(true);
    try {
      await registerTargetedFinancialPayment({
        financialAccountId: account.id,
        allocations: selectedInstallments
          .map((installment) => ({
            installmentId: installment.id,
            amount: amounts[installment.id] ?? 0,
          }))
          .filter((allocation) => allocation.amount > 0),
        method,
        paymentDate: new Date().toISOString().slice(0, 10),
        note,
      });
      setPaymentItem(undefined);
      await load();
      notify({ severity: "success", summary: "Encaissement enregistré" });
    } catch (cause) {
      notify({ severity: "error", summary: "Encaissement impossible", detail: cause instanceof Error ? cause.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const submitCancellation = async () => {
    if (!cancelAdjustment || !cancelReason.trim()) return;
    setSaving(true);
    try {
      await cancelStudentFinancialBenefit(cancelAdjustment.id, cancelReason);
      setCancelAdjustment(undefined);
      setCancelReason("");
      await load();
      notify({ severity: "success", summary: "Avantage annulé et échéancier recalculé" });
    } catch (cause) {
      notify({ severity: "error", summary: "Annulation impossible", detail: cause instanceof Error ? cause.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1480px] space-y-4 pb-8">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }
  if (failure) return <Message severity="error" text={failure} />;
  if (!account) return <Message severity="warn" text="Dossier financier introuvable." />;

  const activeAdjustments = adjustments.filter((item) => item.status === "active");
  const originalAmount = account.items.reduce((sum, item) => sum + item.amount, 0);
  const adjustmentAmount = activeAdjustments.reduce((sum, item) => sum + item.calculatedAmount, 0);
  const paymentProgress = account.totalAmount > 0
    ? Math.min(100, Math.round((account.paidAmount / account.totalAmount) * 100))
    : 100;
  const nextInstallment = account.installments
    .filter((item) => item.balanceAmount > 0)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))[0];

  return (
    <div className="mx-auto max-w-[1480px] space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button label="Retour aux dossiers" icon="pi pi-arrow-left" severity="secondary" text onClick={() => navigate("/gestion-financiere/dossiers")} />
        <Button label="Voir la fiche élève" icon="pi pi-user" outlined onClick={() => navigate(`/scolarite/eleves/${account.studentId}`)} />
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="pointer-events-none absolute right-12 top-6 text-[110px] text-blue-950/[0.025]"><i className="pi pi-wallet" /></div>
        <div className="relative grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700 ring-1 ring-blue-100">Dossier financier</span>
              <Tag value={financialAccountStatusLabels[account.status]} severity={account.balanceAmount > 0 ? "info" : "success"} />
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{account.studentName}</h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
              <span><i className="pi pi-id-card mr-2 text-blue-500" />{account.matricule}</span>
              <span><i className="pi pi-sitemap mr-2 text-blue-500" />{account.cycleName}</span>
              <span><i className="pi pi-chart-bar mr-2 text-blue-500" />{account.levelName}</span>
              <span><i className="pi pi-calendar mr-2 text-blue-500" />{year?.name ?? "Année scolaire"}</span>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
              Ce dossier réunit les frais scolaires générés depuis la grille tarifaire, leurs échéances, les encaissements et les avantages accordés. Les montants déjà payés ne sont jamais modifiés lors d’un recalcul.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Progression des paiements</span>
              <strong className="text-slate-950">{paymentProgress}%</strong>
            </div>
            <ProgressBar value={paymentProgress} showValue={false} className="mt-2 h-2" />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><span className="block text-xs text-slate-500">Encaissé</span><strong className="text-emerald-700">{formatAmount(account.paidAmount, account.currencyCode)}</strong></div>
              <div className="text-right"><span className="block text-xs text-slate-500">Reste</span><strong className="text-orange-700">{formatAmount(account.balanceAmount, account.currencyCode)}</strong></div>
            </div>
            {nextInstallment ? (
              <div className="mt-4 border-t border-slate-200 pt-3 text-sm">
                <span className="block text-xs text-slate-500">Prochaine échéance</span>
                <div className="mt-1 flex items-center justify-between gap-2"><strong>{nextInstallment.label}</strong><span>{formatDate(nextInstallment.dueDate)}</span></div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Montant initial", originalAmount, "pi-file", "text-slate-950"],
          ["Avantages actifs", adjustmentAmount, "pi-percentage", "text-amber-700"],
          ["Montant net", account.totalAmount, "pi-calculator", "text-blue-700"],
          ["Reste à payer", account.balanceAmount, "pi-wallet", account.balanceAmount > 0 ? "text-orange-700" : "text-emerald-700"],
        ].map(([label, value, icon, tone]) => (
          <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400"><span>{label}</span><i className={`pi ${icon}`} /></div>
            <strong className={`mt-2 block text-xl ${tone}`}>{formatAmount(Number(value), account.currencyCode)}</strong>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Frais et échéanciers</h2>
            <p className="text-sm text-slate-500">Accordez une remise ou encaissez directement depuis le frais concerné.</p>
          </div>
          <Tag value={`${account.items.length} frais`} severity="secondary" />
        </div>

        {account.items.map((item) => {
          const paid = (item.installments ?? []).reduce((sum, installment) => sum + installment.paidAmount, 0);
          const balance = (item.installments ?? []).reduce((sum, installment) => sum + installment.balanceAmount, 0);
          const progress = item.netAmount > 0 ? Math.min(100, Math.round((paid / item.netAmount) * 100)) : 100;
          const itemAdjustments = adjustments.filter((adjustment) => adjustment.financialItemId === item.id);
          return (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-950">{item.label}</h3>
                    <Tag value={balance <= 0 ? "Soldé" : paid > 0 ? "Paiement partiel" : "À payer"} severity={balance <= 0 ? "success" : paid > 0 ? "warning" : "danger"} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.paymentPlanName ?? "Paiement unique"}</p>
                  <div className="mt-3 max-w-xl"><ProgressBar value={progress} showValue={false} className="h-1.5" /></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button label="Accorder un avantage" icon="pi pi-percentage" size="small" severity="secondary" outlined disabled={item.netAmount <= item.paidAmount} onClick={() => setBenefitItem(item)} />
                  <Button label="Encaisser" icon="pi pi-wallet" size="small" disabled={balance <= 0} onClick={() => openPayment(item)} />
                </div>
              </div>

              <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2 xl:grid-cols-5">
                <div><span className="text-xs text-slate-500">Initial</span><strong className="mt-1 block">{formatAmount(item.amount, account.currencyCode)}</strong></div>
                <div><span className="text-xs text-slate-500">Avantages</span><strong className="mt-1 block text-amber-700">-{formatAmount(item.adjustmentAmount, account.currencyCode)}</strong></div>
                <div><span className="text-xs text-slate-500">Net</span><strong className="mt-1 block text-blue-700">{formatAmount(item.netAmount, account.currencyCode)}</strong></div>
                <div><span className="text-xs text-slate-500">Payé</span><strong className="mt-1 block text-emerald-700">{formatAmount(paid, account.currencyCode)}</strong></div>
                <div><span className="text-xs text-slate-500">Reste</span><strong className={`mt-1 block ${balance > 0 ? "text-orange-700" : "text-emerald-700"}`}>{formatAmount(balance, account.currencyCode)}</strong></div>
              </div>

              <div className="p-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Échéancier</h4>
                <DataTable value={item.installments ?? []} size="small" emptyMessage="Aucune échéance" responsiveLayout="scroll">
                  <Column field="label" header="Échéance" />
                  <Column header="Date" body={(row) => formatDate(row.dueDate)} />
                  <Column header="Demandé" body={(row) => formatAmount(row.amount, account.currencyCode)} />
                  <Column header="Payé" body={(row) => <span className="text-emerald-700">{formatAmount(row.paidAmount, account.currencyCode)}</span>} />
                  <Column header="Reste" body={(row) => <strong className={row.balanceAmount > 0 ? "text-orange-700" : "text-emerald-700"}>{formatAmount(row.balanceAmount, account.currencyCode)}</strong>} />
                  <Column header="État" body={(row) => <Tag value={row.balanceAmount <= 0 ? "Payée" : row.paidAmount > 0 ? "Partielle" : "À payer"} severity={row.balanceAmount <= 0 ? "success" : row.paidAmount > 0 ? "warning" : "danger"} />} />
                </DataTable>
              </div>

              {itemAdjustments.length ? (
                <div className="border-t border-slate-100 bg-amber-50/40 p-4">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-700">Avantages et historique</h4>
                  <div className="space-y-2">
                    {itemAdjustments.map((adjustment) => (
                      <div key={adjustment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white px-3 py-2.5 text-sm">
                        <div>
                          <div className="flex flex-wrap items-center gap-2"><strong>{adjustment.templateName ?? financialBenefitTypeLabels[adjustment.benefitType]}</strong><span className="font-semibold text-amber-700">-{formatAmount(adjustment.calculatedAmount, account.currencyCode)}</span></div>
                          <div className="mt-1 text-xs text-slate-500">{adjustment.reason} · accordé le {formatDate(adjustment.grantedAt)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag value={adjustment.status === "active" ? "Actif" : "Annulé"} severity={adjustment.status === "active" ? "success" : "secondary"} />
                          {adjustment.status === "active" ? <Button label="Annuler" icon="pi pi-times" text severity="danger" size="small" onClick={() => setCancelAdjustment(adjustment)} /> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="font-semibold text-slate-950">Historique des encaissements</h2><p className="text-sm text-slate-500">Tous les reçus liés à ce dossier financier.</p></div>
          <Tag value={`${payments.length} paiement${payments.length > 1 ? "s" : ""}`} severity="secondary" />
        </div>
        <DataTable value={payments} size="small" className="mt-3" emptyMessage="Aucun encaissement" responsiveLayout="scroll">
          <Column field="receiptNumber" header="Reçu" />
          <Column header="Date" body={(row) => formatDate(row.paymentDate)} />
          <Column header="Montant" body={(row) => <strong>{formatAmount(row.amount, account.currencyCode)}</strong>} />
          <Column header="Mode" body={(row) => paymentMethodLabels[row.method as PaymentMethod] ?? row.method} />
          <Column header="Statut" body={(row) => <Tag value={row.status === "cancelled" ? "Annulé" : "Validé"} severity={row.status === "cancelled" ? "secondary" : "success"} />} />
        </DataTable>
      </section>

      <FinancialItemBenefitDialog visible={Boolean(benefitItem)} institutionId={institutionId} currencyCode={account.currencyCode} item={benefitItem} onHide={() => setBenefitItem(undefined)} onGranted={load} />

      <Dialog header={`Encaisser — ${paymentItem?.label ?? ""}`} visible={Boolean(paymentItem)} modal className="w-[min(96vw,48rem)]" onHide={() => setPaymentItem(undefined)}>
        <div className="space-y-4">
          <Message severity="info" text="Répartissez le montant reçu sur une ou plusieurs échéances. Aucun montant ne peut dépasser le solde de l’échéance." />
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {selectedInstallments.map((installment) => (
              <div key={installment.id} className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_11rem] md:items-center">
                <div><strong className="text-sm">{installment.label}</strong><div className="text-xs text-slate-500">Échéance du {formatDate(installment.dueDate)} · reste {formatAmount(installment.balanceAmount, account.currencyCode)}</div></div>
                <InputNumber value={amounts[installment.id] ?? 0} min={0} max={installment.balanceAmount} useGrouping className="w-full" onValueChange={(event) => setAmounts((current) => ({ ...current, [installment.id]: event.value ?? 0 }))} />
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button label="Solder ce frais" icon="pi pi-check-circle" severity="secondary" outlined onClick={settleItem} />
            <Dropdown value={method} options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))} optionLabel="label" optionValue="value" className="w-full" onChange={(event) => setMethod(event.value)} />
          </div>
          <InputTextarea value={note} rows={2} className="w-full" placeholder="Note facultative" onChange={(event) => setNote(event.target.value)} />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4"><div><span className="text-sm text-blue-700">Total reçu</span><strong className="block text-xl text-blue-950">{formatAmount(paymentTotal, account.currencyCode)}</strong></div><Button label="Enregistrer l’encaissement" icon="pi pi-check" loading={saving} disabled={paymentTotal <= 0} onClick={() => void submitPayment()} /></div>
        </div>
      </Dialog>

      <Dialog header="Annuler l’avantage" visible={Boolean(cancelAdjustment)} modal className="form-dialog" onHide={() => setCancelAdjustment(undefined)}>
        <div className="space-y-4">
          <Message severity="warn" text="L’avantage restera dans l’historique. Son annulation recalculera automatiquement les échéances encore ouvertes." />
          <InputTextarea value={cancelReason} rows={3} className="w-full" placeholder="Motif obligatoire" onChange={(event) => setCancelReason(event.target.value)} />
          <div className="flex justify-end gap-2"><Button label="Retour" severity="secondary" outlined onClick={() => setCancelAdjustment(undefined)} /><Button label="Annuler et recalculer" severity="danger" loading={saving} disabled={!cancelReason.trim()} onClick={() => void submitCancellation()} /></div>
        </div>
      </Dialog>
    </div>
  );
}
