import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { StudentProfilePage } from "./StudentProfilePage";
import type { FinancialAccount } from "../../financial-management/domain/financial-account";
import { getStudentFinancialAccount } from "../../financial-management/services/student-finance.service";

const formatAmount = (value: number, currency = "GNF") =>
  `${Number(value).toLocaleString("fr-GN")} ${currency}`;

export function StudentProfileWithFinancePage() {
  const { studentId = "" } = useParams();
  const navigate = useNavigate();
  const { yearId } = useAcademicSession();
  const [account, setAccount] = useState<FinancialAccount | null>();

  useEffect(() => {
    if (!studentId || !yearId) return;
    setAccount(undefined);
    void getStudentFinancialAccount(studentId, yearId)
      .then(setAccount)
      .catch(() => setAccount(null));
  }, [studentId, yearId]);

  return (
    <div className="space-y-4">
      {account === undefined ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">Chargement de la situation financière…</div>
      ) : account ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-white text-emerald-600 ring-1 ring-emerald-200"><i className="pi pi-wallet" /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Situation financière</p><h2 className="font-semibold text-emerald-950">Dossier financier de l’année en cours</h2></div></div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-800">Les frais proviennent de la grille tarifaire applicable au niveau de l’élève. Les avantages réduisent le montant net et GeeCole recalcule automatiquement les échéances encore ouvertes sans modifier les paiements déjà encaissés.</p>
            </div>
            <div className="flex gap-2"><Tag value={account.balanceAmount > 0 ? "À encaisser" : "Soldé"} severity={account.balanceAmount > 0 ? "warning" : "success"} /><Button label={account.balanceAmount > 0 ? "Ouvrir et encaisser" : "Voir le dossier"} icon="pi pi-arrow-right" iconPos="right" onClick={() => navigate(`/gestion-financiere/dossiers/${account.id}`)} /></div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-100"><span className="text-xs text-slate-500">Montant net</span><strong className="block text-lg text-slate-950">{formatAmount(account.totalAmount, account.currencyCode)}</strong></div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-100"><span className="text-xs text-slate-500">Déjà encaissé</span><strong className="block text-lg text-emerald-700">{formatAmount(account.paidAmount, account.currencyCode)}</strong></div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-100"><span className="text-xs text-slate-500">Reste à payer</span><strong className="block text-lg text-amber-700">{formatAmount(account.balanceAmount, account.currencyCode)}</strong></div>
          </div>
        </section>
      ) : (
        <Message severity="info" text="Aucun dossier financier n’est encore généré pour cet élève sur l’année scolaire sélectionnée." />
      )}
      <StudentProfilePage />
    </div>
  );
}
