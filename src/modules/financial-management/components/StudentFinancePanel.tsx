import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import type { FinancialAccount } from "../domain/financial-account";
import { getStudentFinancialAccount } from "../services/student-finance.service";

interface Props {
  studentId: string;
  academicYearId: string;
}

const formatAmount = (value: number, currency = "GNF") =>
  `${Number(value).toLocaleString("fr-GN")} ${currency}`;

export function StudentFinancePanel({ studentId, academicYearId }: Props) {
  const navigate = useNavigate();
  const [account, setAccount] = useState<FinancialAccount | null>();

  useEffect(() => {
    if (!studentId || !academicYearId) return;
    setAccount(undefined);
    void getStudentFinancialAccount(studentId, academicYearId)
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
                <h2 className="font-semibold text-emerald-950">
                  Frais scolaires de l’année en cours
                </h2>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-800">
              Les frais proviennent de la grille tarifaire applicable à l’élève. Les remises,
              bourses ou exonérations réduisent le montant net, puis GeeCole recalcule les
              échéances encore ouvertes sans modifier les paiements déjà encaissés.
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
    </div>
  );
}
