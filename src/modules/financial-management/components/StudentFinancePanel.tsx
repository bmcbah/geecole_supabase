import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
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
  new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR");

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

  if (account === undefined) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        Chargement de la situation financière…
      </div>
    );
  }

  if (!account) {
    return (
      <Message
        severity="info"
        text="Aucun dossier financier n’est encore généré pour cet élève sur l’année scolaire sélectionnée."
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-white text-emerald-600 ring-1 ring-emerald-200">
                <i className="pi pi-wallet" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Situation financière
                </p>
                <h2 className="font-semibold text-emerald-950">Frais scolaires de l’année en cours</h2>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-800">
              Chaque frais possède son propre échéancier. Les paiements déjà encaissés sont conservés,
              tandis que les remises, bourses ou exonérations réduisent uniquement le montant restant.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag
              value={account.balanceAmount > 0 ? "À encaisser" : "Soldé"}
              severity={account.balanceAmount > 0 ? "warning" : "success"}
            />
            <Button
              label={account.balanceAmount > 0 ? "Ouvrir et encaisser" : "Voir le dossier"}
              icon="pi pi-arrow-right"
              iconPos="right"
              onClick={() => navigate(`/gestion-financiere/dossiers/${account.id}`)}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 ring-1 ring-emerald-100">
            <span className="text-xs text-slate-500">Montant net</span>
            <strong className="mt-1 block text-lg text-slate-950">
              {formatAmount(account.totalAmount, account.currencyCode)}
            </strong>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-emerald-100">
            <span className="text-xs text-slate-500">Déjà encaissé</span>
            <strong className="mt-1 block text-lg text-emerald-700">
              {formatAmount(account.paidAmount, account.currencyCode)}
            </strong>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-emerald-100">
            <span className="text-xs text-slate-500">Reste à payer</span>
            <strong className="mt-1 block text-lg text-amber-700">
              {formatAmount(account.balanceAmount, account.currencyCode)}
            </strong>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {account.items.map((item) => {
          const itemPaid = item.paidAmount >= item.netAmount;
          return (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-950">{item.label}</h3>
                    <Tag value={itemPaid ? "Payé" : item.paidAmount > 0 ? "Partiellement payé" : "Non payé"} severity={itemPaid ? "success" : item.paidAmount > 0 ? "warning" : "danger"} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.paymentPlanName ?? "Paiement unique"}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-right text-sm">
                  <div><span className="block text-xs text-slate-400">Initial</span><strong>{formatAmount(item.amount, account.currencyCode)}</strong></div>
                  <div><span className="block text-xs text-slate-400">Payé</span><strong className="text-emerald-700">{formatAmount(item.paidAmount, account.currencyCode)}</strong></div>
                  <div><span className="block text-xs text-slate-400">Reste</span><strong className="text-amber-700">{formatAmount(item.balanceAmount, account.currencyCode)}</strong></div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {(item.installments ?? []).map((installment) => {
                  const paid = installment.balanceAmount <= 0;
                  const partial = installment.paidAmount > 0 && !paid;
                  return (
                    <div key={installment.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
                      <div>
                        <div className="font-medium text-slate-900">{installment.label}</div>
                        <div className="text-sm text-slate-500">Échéance du {formatDate(installment.dueDate)}</div>
                      </div>
                      <div className="text-sm"><span className="block text-xs text-slate-400">Demandé</span><strong>{formatAmount(installment.amount, account.currencyCode)}</strong></div>
                      <div className="text-sm"><span className="block text-xs text-slate-400">Versé</span><strong className="text-emerald-700">{formatAmount(installment.paidAmount, account.currencyCode)}</strong></div>
                      <Tag value={paid ? "Payée" : partial ? "Partielle" : "À payer"} severity={paid ? "success" : partial ? "warning" : "danger"} />
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
