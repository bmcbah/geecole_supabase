import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { ProgressBar } from "primereact/progressbar";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import type { FinancialAccountDetails } from "../domain/financial-account";
import { getFinancialAccount } from "../services/financial-accounts.service";
import { getStudentFinancialAccount } from "../services/student-finance.service";

interface Props {
  studentId: string;
  academicYearId: string;
}

const formatAmount = (value: number, currency = "GNF") =>
  `${Number(value).toLocaleString("fr-GN")} ${currency}`;

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export function StudentFinancePanel({ studentId, academicYearId }: Props) {
  const navigate = useNavigate();
  const [account, setAccount] = useState<FinancialAccountDetails | null>();

  useEffect(() => {
    if (!studentId || !academicYearId) return;
    setAccount(undefined);
    void getStudentFinancialAccount(studentId, academicYearId)
      .then((summary) => (summary ? getFinancialAccount(summary.id) : null))
      .then(setAccount)
      .catch(() => setAccount(null));
  }, [academicYearId, studentId]);

  const summary = useMemo(() => {
    if (!account) return null;
    const originalAmount = account.items.reduce((sum, item) => sum + item.amount, 0);
    const adjustmentAmount = account.items.reduce((sum, item) => sum + item.adjustmentAmount, 0);
    const progress = account.totalAmount > 0
      ? Math.min(100, Math.round((account.paidAmount / account.totalAmount) * 100))
      : 100;
    const nextInstallment = account.installments
      .filter((item) => item.balanceAmount > 0)
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate))[0];
    return { originalAmount, adjustmentAmount, progress, nextInstallment };
  }, [account]);

  if (account === undefined) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="animate-pulse space-y-4 p-5">
          <div className="h-5 w-52 rounded bg-slate-100" />
          <div className="h-20 rounded-xl bg-slate-50" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-20 rounded-xl bg-slate-50" />
            <div className="h-20 rounded-xl bg-slate-50" />
            <div className="h-20 rounded-xl bg-slate-50" />
          </div>
        </div>
      </div>
    );
  }

  if (!account || !summary) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
          <i className="pi pi-wallet" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-slate-950">Aucun dossier financier</h2>
        <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-slate-500">
          Le dossier sera disponible après confirmation de l’inscription et génération des frais applicables à l’élève.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-24 size-56 rounded-full bg-emerald-100/50 blur-2xl" />
        <div className="relative p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <i className="pi pi-wallet" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">Situation financière</p>
                  <h2 className="text-lg font-semibold text-slate-950">Frais scolaires de l’année sélectionnée</h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Les frais proviennent de la grille tarifaire applicable au niveau de l’élève. Chaque frais garde son propre échéancier ; les remises réduisent le montant net sans modifier les sommes déjà encaissées.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tag value={account.balanceAmount > 0 ? "Paiement en cours" : "Dossier soldé"} severity={account.balanceAmount > 0 ? "warning" : "success"} />
              <Button
                label={account.balanceAmount > 0 ? "Ouvrir le dossier et payer" : "Consulter le dossier"}
                icon="pi pi-arrow-right"
                iconPos="right"
                onClick={() => navigate(`/gestion-financiere/dossiers/${account.id}`)}
              />
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">Progression des encaissements</span>
              <strong className="text-slate-950">{summary.progress}%</strong>
            </div>
            <ProgressBar value={summary.progress} showValue={false} className="mt-2 h-2" />
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
              <span>{formatAmount(account.paidAmount, account.currencyCode)} encaissés</span>
              <span>{formatAmount(account.balanceAmount, account.currencyCode)} restants</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Montant initial", summary.originalAmount, "pi-file", "text-slate-950"],
              ["Avantages accordés", summary.adjustmentAmount, "pi-percentage", "text-amber-700"],
              ["Montant net", account.totalAmount, "pi-calculator", "text-blue-700"],
              ["Reste à payer", account.balanceAmount, "pi-wallet", account.balanceAmount > 0 ? "text-orange-700" : "text-emerald-700"],
            ].map(([label, value, icon, tone]) => (
              <article key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>{label}</span>
                  <i className={`pi ${icon} text-slate-400`} />
                </div>
                <strong className={`mt-2 block text-lg ${tone}`}>{formatAmount(Number(value), account.currencyCode)}</strong>
              </article>
            ))}
          </div>

          {summary.nextInstallment ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
              <div>
                <span className="font-semibold text-blue-950">Prochaine échéance : {summary.nextInstallment.label}</span>
                <span className="ml-2 text-blue-700">le {formatDate(summary.nextInstallment.dueDate)}</span>
              </div>
              <strong className="text-blue-950">{formatAmount(summary.nextInstallment.balanceAmount, account.currencyCode)}</strong>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Détail des frais</h2>
            <p className="text-sm text-slate-500">Montants, avantages et échéances par catégorie.</p>
          </div>
          <Tag value={`${account.items.length} frais`} severity="secondary" />
        </div>

        {account.items.map((item) => {
          const itemPaid = item.balanceAmount <= 0;
          const progress = item.netAmount > 0 ? Math.min(100, Math.round((item.paidAmount / item.netAmount) * 100)) : 100;
          const next = (item.installments ?? []).filter((installment) => installment.balanceAmount > 0).sort((left, right) => left.dueDate.localeCompare(right.dueDate))[0];
          return (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-950">{item.label}</h3>
                    <Tag value={itemPaid ? "Payé" : item.paidAmount > 0 ? "Partiellement payé" : "À payer"} severity={itemPaid ? "success" : item.paidAmount > 0 ? "warning" : "danger"} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.paymentPlanName ?? "Paiement unique"}</p>
                  <ProgressBar value={progress} showValue={false} className="mt-3 h-1.5 max-w-xl" />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4 lg:text-right">
                  <div><span className="block text-xs text-slate-400">Initial</span><strong>{formatAmount(item.amount, account.currencyCode)}</strong></div>
                  <div><span className="block text-xs text-slate-400">Avantages</span><strong className="text-amber-700">-{formatAmount(item.adjustmentAmount, account.currencyCode)}</strong></div>
                  <div><span className="block text-xs text-slate-400">Payé</span><strong className="text-emerald-700">{formatAmount(item.paidAmount, account.currencyCode)}</strong></div>
                  <div><span className="block text-xs text-slate-400">Reste</span><strong className={item.balanceAmount > 0 ? "text-orange-700" : "text-emerald-700"}>{formatAmount(item.balanceAmount, account.currencyCode)}</strong></div>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-sm">
                {next ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-600"><i className="pi pi-calendar mr-2 text-blue-500" />Prochaine échéance : <strong className="text-slate-900">{next.label}</strong>, le {formatDate(next.dueDate)}</span>
                    <strong className="text-slate-950">{formatAmount(next.balanceAmount, account.currencyCode)}</strong>
                  </div>
                ) : (
                  <span className="text-emerald-700"><i className="pi pi-check-circle mr-2" />Aucune échéance restante.</span>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
