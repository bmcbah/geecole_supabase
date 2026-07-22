import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import type { FinancialAccountDetails, FinancialInstallment } from "../domain/financial-account";
import { paymentMethodLabels, type PaymentMethod } from "../domain/financial-payment";
import { getFinancialAccount } from "../services/financial-accounts.service";
import { registerTargetedFinancialPayment } from "../services/financial-payments.service";

const formatAmount = (value: number, currency = "GNF") => `${Number(value).toLocaleString("fr-GN")} ${currency}`;
const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR");
const toDateInput = (value: Date) => value.toISOString().slice(0, 10);
const controlClass = "h-11 w-full rounded-xl border border-slate-300 bg-white text-sm shadow-sm";
const today = () => new Date().toISOString().slice(0, 10);

const methodOptions = Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }));

export function FinancialPaymentFlowPage() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const [account, setAccount] = useState<FinancialAccountDetails>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [externalReference, setExternalReference] = useState("");
  const [note, setNote] = useState("");
  const [receiptNumber, setReceiptNumber] = useState<string>();

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError("");
    try {
      setAccount(await getFinancialAccount(accountId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger le dossier financier.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { void load(); }, [load]);

  const openInstallments = useMemo(
    () => (account?.installments ?? []).filter((installment) => installment.balanceAmount > 0),
    [account],
  );
  const overdueAmount = useMemo(
    () => openInstallments.filter((installment) => installment.dueDate < today()).reduce((sum, installment) => sum + installment.balanceAmount, 0),
    [openInstallments],
  );
  const currentDueAmount = useMemo(
    () => openInstallments.filter((installment) => installment.dueDate <= today()).reduce((sum, installment) => sum + installment.balanceAmount, 0),
    [openInstallments],
  );
  const allocatedAmount = useMemo(
    () => openInstallments.reduce((sum, installment) => sum + (allocations[installment.id] ?? 0), 0),
    [allocations, openInstallments],
  );
  const unallocatedAmount = Math.max(0, amountReceived - allocatedAmount);
  const overAllocated = allocatedAmount > amountReceived;

  const distribute = (targetAmount: number) => {
    let remaining = Math.min(targetAmount, account?.balanceAmount ?? 0);
    const next: Record<string, number> = {};
    for (const installment of openInstallments) {
      const amount = Math.min(installment.balanceAmount, remaining);
      if (amount > 0) next[installment.id] = amount;
      remaining -= amount;
      if (remaining <= 0) break;
    }
    setAmountReceived(targetAmount);
    setAllocations(next);
  };

  const setAllocation = (installment: FinancialInstallment, value: number | null) => {
    const safeValue = Math.max(0, Math.min(value ?? 0, installment.balanceAmount));
    setAllocations((current) => ({ ...current, [installment.id]: safeValue }));
  };

  const handleAmountChange = (value: number) => {
    setAmountReceived(value);
    let remaining = value;
    const next: Record<string, number> = {};
    for (const installment of openInstallments) {
      const allocated = Math.min(installment.balanceAmount, remaining);
      if (allocated > 0) next[installment.id] = allocated;
      remaining -= allocated;
      if (remaining <= 0) break;
    }
    setAllocations(next);
  };

  const submit = async () => {
    if (!account || amountReceived <= 0 || allocatedAmount <= 0 || overAllocated || unallocatedAmount > 0) return;
    setSaving(true);
    try {
      const receipt = await registerTargetedFinancialPayment({
        financialAccountId: account.id,
        allocations: openInstallments
          .map((installment) => ({ installmentId: installment.id, amount: allocations[installment.id] ?? 0 }))
          .filter((allocation) => allocation.amount > 0),
        method,
        paymentDate: toDateInput(paymentDate),
        externalReference,
        note,
      });
      setReceiptNumber(receipt);
      notify({ severity: "success", summary: "Encaissement enregistré" });
    } catch (cause) {
      notify({ severity: "error", summary: "Encaissement impossible", detail: cause instanceof Error ? cause.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="grid min-h-[50vh] place-items-center"><ProgressSpinner /></div>;
  if (error || !account) return <Message severity="error" text={error || "Dossier financier introuvable."} />;

  if (receiptNumber) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 pb-10">
        <PageHeader title="Encaissement enregistré" description="Le dossier et les échéances ont été mis à jour." />
        <section className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-700"><i className="pi pi-check" /></div>
          <h2 className="mt-5 text-2xl font-bold text-slate-950">{formatAmount(amountReceived, account.currencyCode)}</h2>
          <p className="mt-1 text-sm text-slate-500">encaissés pour {account.studentName}</p>
          <div className="mx-auto mt-6 max-w-md rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
            <div className="flex justify-between gap-4"><span className="text-slate-500">Reçu</span><strong className="font-mono text-slate-950">{receiptNumber}</strong></div>
            <div className="mt-2 flex justify-between gap-4"><span className="text-slate-500">Mode</span><strong>{paymentMethodLabels[method]}</strong></div>
            <div className="mt-2 flex justify-between gap-4"><span className="text-slate-500">Date</span><strong>{paymentDate.toLocaleDateString("fr-FR")}</strong></div>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Button label="Journal et reçus" icon="pi pi-receipt" severity="secondary" outlined onClick={() => navigate("/gestion-financiere/encaissements")} />
            <Button label="Retour au dossier" icon="pi pi-arrow-left" onClick={() => navigate(`/gestion-financiere/dossiers/${account.id}`)} />
          </div>
        </section>
      </div>
    );
  }

  const percent = account.totalAmount > 0 ? Math.min(100, Math.round((account.paidAmount / account.totalAmount) * 100)) : 0;

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title={`Encaisser — ${account.studentName}`}
        description={`${account.matricule} · ${account.levelName} · ${account.cycleName}`}
        actions={<Button label="Annuler" icon="pi pi-times" severity="secondary" text onClick={() => navigate(-1)} />}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Responsable financier</span>
                <strong className="mt-1 block text-base text-slate-950">{account.financialResponsibleName || "Non renseigné"}</strong>
                <span className="text-sm text-slate-500">{account.financialResponsiblePhone || "Téléphone non renseigné"}</span>
              </div>
              <Tag value={account.balanceAmount <= 0 ? "Soldé" : overdueAmount > 0 ? "En retard" : "À payer"} severity={account.balanceAmount <= 0 ? "success" : overdueAmount > 0 ? "danger" : "warning"} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div><span className="text-xs text-slate-500">Net à payer</span><strong className="mt-1 block text-lg text-slate-950">{formatAmount(account.totalAmount, account.currencyCode)}</strong></div>
              <div><span className="text-xs text-slate-500">Déjà payé</span><strong className="mt-1 block text-lg text-emerald-700">{formatAmount(account.paidAmount, account.currencyCode)}</strong></div>
              <div><span className="text-xs text-slate-500">Reste</span><strong className="mt-1 block text-lg text-orange-700">{formatAmount(account.balanceAmount, account.currencyCode)}</strong></div>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} /></div>
            <div className="mt-2 flex justify-between text-xs text-slate-500"><span>{percent}% payé</span><span>{formatAmount(overdueAmount, account.currencyCode)} en retard</span></div>
          </div>
          <aside className="border-t border-slate-200 bg-slate-50/70 p-5 lg:border-l lg:border-t-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Montant reçu</span>
            <InputNumber value={amountReceived} min={0} max={account.balanceAmount} useGrouping currency="GNF" mode="currency" locale="fr-GN" className="mt-2 w-full" inputClassName="h-14 w-full rounded-xl text-xl font-bold" onValueChange={(event) => handleAmountChange(Number(event.value ?? 0))} />
            <div className="mt-3 flex flex-wrap gap-2">
              {overdueAmount > 0 ? <Button label={`Retard ${formatAmount(overdueAmount)}`} size="small" severity="danger" outlined onClick={() => distribute(overdueAmount)} /> : null}
              {currentDueAmount > overdueAmount ? <Button label={`Exigible ${formatAmount(currentDueAmount)}`} size="small" severity="warning" outlined onClick={() => distribute(currentDueAmount)} /> : null}
              <Button label="Tout solder" size="small" severity="success" outlined onClick={() => distribute(account.balanceAmount)} />
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4"><h2 className="text-base font-semibold text-slate-950">Mode et informations du paiement</h2><p className="mt-1 text-sm text-slate-500">Renseignez la preuve reçue au guichet ou par transfert.</p></div>
        <SelectButton value={method} options={methodOptions} optionLabel="label" optionValue="value" allowEmpty={false} className="flex flex-wrap" onChange={(event) => setMethod(event.value as PaymentMethod)} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Date du paiement</span><Calendar value={paymentDate} dateFormat="dd/mm/yy" className="w-full" inputClassName={controlClass} onChange={(event) => setPaymentDate(event.value ?? new Date())} /></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Référence / transaction</span><InputText value={externalReference} className={controlClass} placeholder={method === "cash" ? "Facultatif pour les espèces" : "Numéro de transaction ou dépôt"} onChange={(event) => setExternalReference(event.target.value)} /></label>
        </div>
        <label className="mt-4 block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Note</span><InputTextarea value={note} rows={2} className="w-full rounded-xl" autoResize onChange={(event) => setNote(event.target.value)} /></label>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="text-base font-semibold text-slate-950">Répartition sur les échéances</h2><p className="mt-1 text-sm text-slate-500">Les plus anciennes sont proposées en premier. Vous pouvez ajuster chaque montant.</p></div><Button label="Répartir automatiquement" icon="pi pi-sparkles" severity="secondary" outlined onClick={() => handleAmountChange(amountReceived)} /></div>
        <DataTable value={openInstallments} dataKey="id" emptyMessage="Ce dossier ne contient aucune échéance à payer." className="text-sm" tableStyle={{ minWidth: "850px" }}>
          <Column header="Échéance" body={(row: FinancialInstallment) => <div><strong className="text-slate-900">{row.label}</strong><span className="mt-1 block text-xs text-slate-500">Échéance {row.sequence}</span></div>} />
          <Column header="Date" body={(row: FinancialInstallment) => <div><span>{formatDate(row.dueDate)}</span>{row.dueDate < today() ? <Tag value="En retard" severity="danger" className="ml-2" /> : null}</div>} />
          <Column header="Montant" body={(row: FinancialInstallment) => formatAmount(row.amount, account.currencyCode)} />
          <Column header="Déjà payé" body={(row: FinancialInstallment) => formatAmount(row.paidAmount, account.currencyCode)} />
          <Column header="Reste" body={(row: FinancialInstallment) => <strong>{formatAmount(row.balanceAmount, account.currencyCode)}</strong>} />
          <Column header="Affecter" body={(row: FinancialInstallment) => <InputNumber value={allocations[row.id] ?? 0} min={0} max={row.balanceAmount} useGrouping className="w-40" inputClassName="h-10 w-full rounded-lg" onValueChange={(event) => setAllocation(row, Number(event.value ?? 0))} />} />
        </DataTable>
      </section>

      <section className="sticky bottom-3 z-10 rounded-2xl border border-slate-300 bg-white/95 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
            <span className="text-slate-500">Reçu <strong className="ml-2 text-slate-950">{formatAmount(amountReceived)}</strong></span>
            <span className="text-slate-500">Affecté <strong className="ml-2 text-slate-950">{formatAmount(allocatedAmount)}</strong></span>
            <span className={unallocatedAmount > 0 ? "text-orange-700" : "text-slate-500"}>Non affecté <strong className="ml-2">{formatAmount(unallocatedAmount)}</strong></span>
          </div>
          <Button label={`Valider ${formatAmount(amountReceived)}`} icon="pi pi-check" loading={saving} disabled={amountReceived <= 0 || allocatedAmount <= 0 || overAllocated || unallocatedAmount > 0} onClick={() => void submit()} />
        </div>
        {overAllocated ? <Message severity="error" text="Le montant affecté dépasse le montant reçu." className="mt-3" /> : null}
        {!overAllocated && unallocatedAmount > 0 ? <Message severity="warn" text="Le montant doit être entièrement affecté. La gestion du crédit nécessite le workflow dédié prévu par la documentation." className="mt-3" /> : null}
      </section>
    </div>
  );
}
