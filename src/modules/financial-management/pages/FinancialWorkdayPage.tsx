import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  getFinancialDashboard,
  listFamilyFinancialRows,
  listFinancialInstallments,
  type FamilyFinancialRow,
  type FinancialDashboard,
  type FinancialInstallmentRow,
} from "../services/financial-pilotage.service";

const money = (value: number) => `${Math.round(value).toLocaleString("fr-GN")} GNF`;
const localDate = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR") : "—";

function WorkMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <strong className="mt-2 block text-2xl font-bold text-slate-950">{value}</strong>
      <span className="mt-1 block text-xs text-slate-500">{detail}</span>
    </article>
  );
}

export function FinancialWorkdayPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [installments, setInstallments] = useState<FinancialInstallmentRow[]>([]);
  const [families, setFamilies] = useState<FamilyFinancialRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      const [summary, installmentRows, familyRows] = await Promise.all([
        getFinancialDashboard(institutionId, yearId),
        listFinancialInstallments(institutionId, yearId),
        listFamilyFinancialRows(institutionId, yearId),
      ]);
      setDashboard(summary);
      setInstallments(installmentRows);
      setFamilies(familyRows);
    } catch {
      setFailure("Impossible de préparer votre espace de travail.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const today = new Date().toISOString().slice(0, 10);
  const normalized = query.trim().toLocaleLowerCase("fr");

  const urgent = useMemo(
    () =>
      installments
        .filter((row) => row.situation === "overdue")
        .filter((row) => !normalized || `${row.studentName} ${row.matricule} ${row.feeLabel}`.toLocaleLowerCase("fr").includes(normalized))
        .sort((a, b) => b.daysLate - a.daysLate || b.balanceAmount - a.balanceAmount)
        .slice(0, 12),
    [installments, normalized],
  );

  const dueToday = useMemo(
    () => installments.filter((row) => row.balanceAmount > 0 && row.dueDate === today),
    [installments, today],
  );

  const familiesWithoutContact = useMemo(
    () => families.filter((family) => !family.guardianId || !family.guardianPhone).slice(0, 8),
    [families],
  );

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        eyebrow={`Frais scolaires · ${year?.name ?? "Année scolaire"}`}
        title="Mon travail aujourd’hui"
        description="Commencez par les encaissements, les échéances urgentes et les dossiers qui demandent une action."
        actions={<Button label="Actualiser" icon="pi pi-refresh" severity="secondary" outlined loading={loading} onClick={() => void load()} />}
      />

      {failure ? <Message severity="error" text={failure} /> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <WorkMetric label="À encaisser aujourd’hui" value={money(dueToday.reduce((sum, row) => sum + row.balanceAmount, 0))} detail={`${dueToday.length} échéance(s) exigible(s)`} />
        <WorkMetric label="Retards à traiter" value={money(dashboard?.overdueAmount ?? 0)} detail={`${dashboard?.overdueCount ?? 0} échéance(s) en retard`} />
        <WorkMetric label="Encaissé aujourd’hui" value={money(dashboard?.collectedToday ?? 0)} detail="Paiements validés aujourd’hui" />
        <WorkMetric label="Dossiers sans contact" value={String(familiesWithoutContact.length)} detail="Responsable ou téléphone manquant" />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <button className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left transition hover:border-emerald-400" onClick={() => navigate("/gestion-financiere/dossiers")}>
          <span className="text-sm font-semibold text-emerald-800">Encaisser un paiement</span>
          <strong className="mt-2 block text-lg text-emerald-950">Retrouver l’élève ou la famille</strong>
          <span className="mt-1 block text-sm text-emerald-700">Ouvrir le dossier, vérifier le solde puis enregistrer le paiement.</span>
        </button>
        <button className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left transition hover:border-amber-400" onClick={() => navigate("/gestion-financiere/echeances")}>
          <span className="text-sm font-semibold text-amber-800">Traiter les échéances</span>
          <strong className="mt-2 block text-lg text-amber-950">Prioriser ce qui est dû</strong>
          <span className="mt-1 block text-sm text-amber-700">Voir les retards, les échéances du jour et celles à venir.</span>
        </button>
        <button className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-slate-400" onClick={() => navigate("/gestion-financiere/encaissements")}>
          <span className="text-sm font-semibold text-slate-600">Contrôler la journée</span>
          <strong className="mt-2 block text-lg text-slate-950">Journal et reçus</strong>
          <span className="mt-1 block text-sm text-slate-500">Retrouver une opération, consulter un reçu ou annuler avec motif.</span>
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="m-0 text-base font-semibold text-slate-950">Priorités de recouvrement</h2>
            <p className="mt-1 text-sm text-slate-500">Les retards les plus anciens apparaissent en premier.</p>
          </div>
          <span className="p-input-icon-left w-full md:w-80">
            <i className="pi pi-search" />
            <InputText className="w-full" value={query} placeholder="Élève, matricule ou frais" onChange={(event) => setQuery(event.target.value)} />
          </span>
        </header>
        <DataTable value={urgent} loading={loading} dataKey="id" emptyMessage="Aucune échéance en retard à traiter.">
          <Column header="Élève" body={(row: FinancialInstallmentRow) => <div><strong>{row.studentName}</strong><small className="block text-slate-500">{row.matricule} · {row.levelName}</small></div>} />
          <Column header="Frais" body={(row: FinancialInstallmentRow) => <div>{row.feeLabel}<small className="block text-slate-500">{row.installmentLabel}</small></div>} />
          <Column header="Échéance" body={(row: FinancialInstallmentRow) => localDate(row.dueDate)} />
          <Column header="Retard" body={(row: FinancialInstallmentRow) => <Tag severity="danger" value={`${row.daysLate} jour(s)`} />} />
          <Column header="À payer" body={(row: FinancialInstallmentRow) => <strong>{money(row.balanceAmount)}</strong>} />
          <Column header="Action" body={(row: FinancialInstallmentRow) => <Button label="Traiter" icon="pi pi-arrow-right" text onClick={() => navigate(`/gestion-financiere/dossiers/${row.accountId}`)} />} />
        </DataTable>
      </section>

      {familiesWithoutContact.length ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-sm font-semibold text-amber-950">Dossiers difficiles à suivre</h2>
              <p className="mt-1 text-sm text-amber-800">{familiesWithoutContact.length} famille(s) n’ont pas de responsable financier ou de téléphone exploitable.</p>
            </div>
            <Button label="Voir les situations familles" icon="pi pi-users" severity="warning" outlined onClick={() => navigate("/gestion-financiere/familles")} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
