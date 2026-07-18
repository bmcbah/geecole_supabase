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
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
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
  value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR") : "—";

export function FinancialAccountDetailPage() {
  const { accountId = "" } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const { institutionId } = useAcademicSession();
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

  useEffect(() => { void load(); }, [load]);

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
      notify({ severity: "success", summary: "Avantage annulé" });
    } catch (cause) {
      notify({ severity: "error", summary: "Annulation impossible", detail: cause instanceof Error ? cause.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="grid min-h-[45vh] place-items-center text-sm text-slate-500">Chargement du dossier financier…</div>;
  if (failure) return <Message severity="error" text={failure} />;
  if (!account) return <Message severity="warn" text="Dossier financier introuvable." />;

  const activeAdjustments = adjustments.filter((item) => item.status === "active");

  return (
    <div className="mx-auto max-w-[1480px] space-y-4 pb-8">
      <PageHeader
        eyebrow="Gestion financière"
        title={account.studentName}
        description={`${account.matricule} · ${account.cycleName} · ${account.levelName}`}
        actions={
          <div className="flex gap-2">
            <Button label="Retour" icon="pi pi-arrow-left" severity="secondary" outlined onClick={() => navigate("/gestion-financiere/dossiers")} />
            <Button label="Voir la fiche élève" icon="pi pi-user" outlined onClick={() => navigate(`/scolarite/eleves/${account.studentId}`)} />
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["Montant net", account.totalAmount, "pi-money-bill"],
          ["Encaissé", account.paidAmount, "pi-check-circle"],
          ["Reste à payer", account.balanceAmount, "pi-wallet"],
          ["Avantages actifs", activeAdjustments.reduce((sum, item) => sum + item.calculatedAmount, 0), "pi-percentage"],
        ].map(([label, value, icon]) => (
          <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400"><span>{label}</span><i className={`pi ${icon}`} /></div>
            <strong className="mt-2 block text-xl text-slate-950">{formatAmount(Number(value), account.currencyCode)}</strong>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><h2 className="font-semibold text-slate-950">Frais et échéances</h2><p className="text-sm text-slate-500">Chaque frais conserve son montant initial, ses avantages, son net et ses propres échéances.</p></div>
          <Tag value={financialAccountStatusLabels[account.status]} severity={account.balanceAmount > 0 ? "info" : "success"} />
        </div>
        <div className="divide-y divide-slate-100">
          {account.items.map((item) => {
            const paid = (item.installments ?? []).reduce((sum, installment) => sum + installment.paidAmount, 0);
            const balance = (item.installments ?? []).reduce((sum, installment) => sum + installment.balanceAmount, 0);
            const itemAdjustments = adjustments.filter((adjustment) => adjustment.financialItemId === item.id);
            return (
              <article key={item.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="font-semibold text-slate-950">{item.label}</h3><p className="text-sm text-slate-500">{item.paymentPlanName ?? "Paiement unique"}</p></div>
                  <div className="flex gap-2"><Button label="Accorder un avantage" icon="pi pi-percentage" size="small" severity="secondary" outlined onClick={() => setBenefitItem(item)} /><Button label="Encaisser" icon="pi pi-wallet" size="small" disabled={balance <= 0} onClick={() => openPayment(item)} /></div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Initial</span><strong className="block">{formatAmount(item.amount, account.currencyCode)}</strong></div>
                  <div className="rounded-xl bg-amber-50 p-3"><span className="text-xs text-amber-700">Avantages</span><strong className="block text-amber-900">-{formatAmount(item.adjustmentAmount, account.currencyCode)}</strong></div>
                  <div className="rounded-xl bg-blue-50 p-3"><span className="text-xs text-blue-700">Net</span><strong className="block text-blue-950">{formatAmount(item.netAmount, account.currencyCode)}</strong></div>
                  <div className="rounded-xl bg-emerald-50 p-3"><span className="text-xs text-emerald-700">Payé / reste</span><strong className="block text-emerald-950">{formatAmount(paid, account.currencyCode)} / {formatAmount(balance, account.currencyCode)}</strong></div>
                </div>
                <DataTable value={item.installments ?? []} size="small" className="mt-4" emptyMessage="Aucune échéance">
                  <Column field="label" header="Échéance" />
                  <Column header="Date" body={(row) => formatDate(row.dueDate)} />
                  <Column header="Demandé" body={(row) => formatAmount(row.amount, account.currencyCode)} />
                  <Column header="Payé" body={(row) => formatAmount(row.paidAmount, account.currencyCode)} />
                  <Column header="Reste" body={(row) => <strong>{formatAmount(row.balanceAmount, account.currencyCode)}</strong>} />
                </DataTable>
                {itemAdjustments.length ? <div className="mt-4 space-y-2">{itemAdjustments.map((adjustment) => <div key={adjustment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm"><div><strong>{adjustment.templateName ?? financialBenefitTypeLabels[adjustment.benefitType]}</strong><span className="ml-2 text-slate-500">-{formatAmount(adjustment.calculatedAmount, account.currencyCode)} · {adjustment.reason}</span></div><div className="flex items-center gap-2"><Tag value={adjustment.status === "active" ? "Actif" : "Annulé"} severity={adjustment.status === "active" ? "success" : "secondary"} />{adjustment.status === "active" ? <Button icon="pi pi-times" text severity="danger" size="small" onClick={() => setCancelAdjustment(adjustment)} /> : null}</div></div>)}</div> : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-950">Historique des encaissements</h2>
        <DataTable value={payments} size="small" className="mt-3" emptyMessage="Aucun encaissement">
          <Column field="receiptNumber" header="Reçu" />
          <Column header="Date" body={(row) => formatDate(row.paymentDate)} />
          <Column header="Montant" body={(row) => formatAmount(row.amount, account.currencyCode)} />
          <Column header="Mode" body={(row) => paymentMethodLabels[row.method as PaymentMethod] ?? row.method} />
          <Column header="Statut" body={(row) => <Tag value={row.status === "cancelled" ? "Annulé" : "Validé"} severity={row.status === "cancelled" ? "secondary" : "success"} />} />
        </DataTable>
      </section>

      <FinancialItemBenefitDialog visible={Boolean(benefitItem)} institutionId={institutionId} currencyCode={account.currencyCode} item={benefitItem} onHide={() => setBenefitItem(undefined)} onGranted={load} />

      <Dialog header={`Encaisser — ${paymentItem?.label ?? ""}`} visible={Boolean(paymentItem)} modal className="w-[min(96vw,48rem)]" onHide={() => setPaymentItem(undefined)}>
        <div className="space-y-4">
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">{selectedInstallments.map((installment) => <div key={installment.id} className="grid gap-3 p-3 md:grid-cols-[1fr_11rem]"><div><strong className="text-sm">{installment.label}</strong><div className="text-xs text-slate-500">Reste {formatAmount(installment.balanceAmount, account.currencyCode)}</div></div><InputNumber value={amounts[installment.id] ?? 0} min={0} max={installment.balanceAmount} useGrouping onValueChange={(event) => setAmounts((current) => ({ ...current, [installment.id]: event.value ?? 0 }))} /></div>)}</div>
          <Button label="Solder ce frais" size="small" severity="secondary" outlined onClick={settleItem} />
          <Dropdown value={method} options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))} optionLabel="label" optionValue="value" className="w-full" onChange={(event) => setMethod(event.value)} />
          <InputTextarea value={note} rows={2} className="w-full" placeholder="Note facultative" onChange={(event) => setNote(event.target.value)} />
          <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3"><strong>Total reçu : {formatAmount(paymentTotal, account.currencyCode)}</strong><Button label="Enregistrer" icon="pi pi-check" loading={saving} disabled={paymentTotal <= 0} onClick={() => void submitPayment()} /></div>
        </div>
      </Dialog>

      <Dialog header="Annuler l’avantage" visible={Boolean(cancelAdjustment)} modal className="form-dialog" onHide={() => setCancelAdjustment(undefined)}>
        <div className="space-y-4"><InputTextarea value={cancelReason} rows={3} className="w-full" placeholder="Motif obligatoire" onChange={(event) => setCancelReason(event.target.value)} /><div className="flex justify-end gap-2"><Button label="Retour" severity="secondary" outlined onClick={() => setCancelAdjustment(undefined)} /><Button label="Annuler l’avantage" severity="danger" loading={saving} disabled={!cancelReason.trim()} onClick={() => void submitCancellation()} /></div></div>
      </Dialog>
    </div>
  );
}
