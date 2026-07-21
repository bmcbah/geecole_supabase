import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import type { PayrollEntryDetail } from "../domain/personnel";
import { payrollStatusLabels } from "../domain/personnel";
import { getPayrollEntryDetail } from "../services/personnel.service";
import {
  listPersonnelCatalog,
  type CatalogItem,
} from "../services/personnel.service";
import { PayrollAdjustmentDialog } from "../components/PayrollAdjustmentDialog";
import { PayrollPaymentDialog } from "../components/PayrollPaymentDialog";

const money = (value: number) => `${Number(value).toLocaleString("fr-GN")} GNF`;
const date = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("fr-GN");
const modeLabels: Record<string, string> = {
  fixed: "Salaire fixe",
  hourly: "Rémunération horaire",
  session: "À la séance",
  flat_rate: "Forfait",
  mixed: "Fixe + variable",
  unpaid: "Non rémunéré",
};

export function PayrollStatementPage() {
  const navigate = useNavigate();
  const { periodId = "", entryId = "" } = useParams();
  const { institutionId } = useAcademicSession();
  const [statement, setStatement] = useState<PayrollEntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [dialog, setDialog] = useState<"adjustment" | "payment" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailure("");
    try {
      setStatement(
        await getPayrollEntryDetail(institutionId, periodId, entryId),
      );
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Chargement impossible",
      );
    } finally {
      setLoading(false);
    }
  }, [entryId, institutionId, periodId]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void listPersonnelCatalog(institutionId).then(setCatalogs);
  }, [institutionId]);

  const hours = useMemo(
    () =>
      (statement?.work_entries ?? []).reduce(
        (sum, item) => sum + item.minutes,
        0,
      ) / 60,
    [statement],
  );

  if (loading) {
    return (
      <div className="grid min-h-[45vh] place-items-center">
        <ProgressSpinner />
      </div>
    );
  }
  if (failure) {
    return (
      <Message
        severity="error"
        text={`Impossible de charger le bulletin : ${failure}`}
      />
    );
  }
  if (!statement) {
    return (
      <Message
        severity="warn"
        text="Ce bulletin est introuvable ou n’est pas accessible."
      />
    );
  }

  const totalDeductions = statement.deductions + statement.advance_repayments;
  const detailedGains = statement.adjustments
    .filter((item) => item.kind !== "deduction")
    .reduce((sum, item) => sum + item.amount, 0);
  const detailedDeductions = statement.adjustments
    .filter((item) => item.kind === "deduction")
    .reduce((sum, item) => sum + item.amount, 0);
  const unexplainedGains = Math.max(0, statement.gains - detailedGains);
  const unexplainedDeductions = Math.max(
    0,
    statement.deductions - detailedDeductions,
  );
  const balance = statement.net_amount - statement.paid_amount;
  return (
    <div className="space-y-4 pb-10 print:bg-white">
      <div className="print:hidden">
        <PageHeader
          title="Bulletin de rémunération"
          description={`${statement.period.name} · ${statement.employee.first_name} ${statement.employee.last_name}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                label="Retour à la paie"
                icon="pi pi-arrow-left"
                severity="secondary"
                outlined
                onClick={() => navigate("/personnel/paie")}
              />
              <Button
                label="Imprimer"
                icon="pi pi-print"
                onClick={() => window.print()}
              />
              {statement.status === "calculated" && (
                <Button
                  label="Ajouter une rubrique"
                  icon="pi pi-plus"
                  severity="secondary"
                  outlined
                  onClick={() => setDialog("adjustment")}
                />
              )}
              {(["validated", "partially_paid"] as string[]).includes(
                statement.status,
              ) &&
                balance > 0 && (
                  <Button
                    label="Enregistrer un paiement"
                    icon="pi pi-wallet"
                    onClick={() => setDialog("payment")}
                  />
                )}
            </div>
          }
        />
      </div>

      <main className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-wider text-emerald-700">
                Bulletin de rémunération scolaire simplifié
              </p>
              <h1 className="mb-1 mt-2 text-2xl font-bold text-slate-950">
                {statement.period.name}
              </h1>
              <p className="m-0 text-sm text-slate-500">
                Du {date(statement.period.starts_on)} au{" "}
                {date(statement.period.ends_on)}
              </p>
            </div>
            <Tag
              value={payrollStatusLabels[statement.status]}
              severity={
                statement.status === "closed" || statement.status === "paid"
                  ? "success"
                  : "info"
              }
            />
          </div>
        </header>

        <section className="grid gap-6 border-b border-slate-200 px-6 py-5 sm:grid-cols-2 sm:px-8">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500">
              Personnel
            </span>
            <h2 className="mb-1 mt-2 text-lg font-semibold text-slate-950">
              {statement.employee.first_name} {statement.employee.last_name}
            </h2>
            <p className="m-0 text-sm text-slate-600">
              Matricule {statement.employee.employee_number}
            </p>
            {statement.employee.phone ? (
              <p className="mb-0 mt-1 text-sm text-slate-500">
                {statement.employee.phone}
              </p>
            ) : null}
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500">
              Contrat appliqué
            </span>
            <h2 className="mb-1 mt-2 text-base font-semibold text-slate-950">
              {statement.contract
                ? modeLabels[statement.contract.compensation_mode]
                : "Contrat non renseigné"}
            </h2>
            <p className="m-0 text-sm text-slate-600">
              {statement.contract?.reference
                ? `Référence ${statement.contract.reference}`
                : "Aucune référence"}
            </p>
            {hours > 0 ? (
              <p className="mb-0 mt-1 text-sm text-slate-500">
                {hours.toLocaleString("fr-GN", { maximumFractionDigits: 2 })} h
                validées
              </p>
            ) : null}
          </div>
        </section>

        <section className="px-6 py-6 sm:px-8">
          <h2 className="mb-4 mt-0 text-base font-semibold text-slate-950">
            Composition du bulletin
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Rubrique</th>
                  <th className="px-4 py-3">Détail</th>
                  <th className="px-4 py-3 text-right">Gain</th>
                  <th className="px-4 py-3 text-right">Retenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Salaire fixe / forfait
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    Base contractuelle
                  </td>
                  <td className="px-4 py-3 text-right">
                    {money(statement.fixed_amount)}
                  </td>
                  <td />
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Rémunération variable
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {hours
                      ? `${hours.toLocaleString("fr-GN", { maximumFractionDigits: 2 })} h ou séances validées`
                      : "Aucune activité rattachée"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {money(statement.variable_amount)}
                  </td>
                  <td />
                </tr>
                {statement.adjustments.map((item) => {
                  const deduction = item.kind === "deduction";
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium">{item.label}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {item.notes ||
                          (item.kind === "regularization"
                            ? "Régularisation"
                            : deduction
                              ? "Retenue"
                              : "Prime / gain")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {deduction ? "—" : money(item.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {deduction ? money(item.amount) : "—"}
                      </td>
                    </tr>
                  );
                })}
                {unexplainedGains > 0 ? (
                  <tr>
                    <td className="px-4 py-3 font-medium">Autres gains</td>
                    <td className="px-4 py-3 text-slate-500">
                      Détail non disponible dans les rubriques
                    </td>
                    <td className="px-4 py-3 text-right">
                      {money(unexplainedGains)}
                    </td>
                    <td />
                  </tr>
                ) : null}
                {unexplainedDeductions > 0 ? (
                  <tr>
                    <td className="px-4 py-3 font-medium">Autres retenues</td>
                    <td className="px-4 py-3 text-slate-500">
                      Détail non disponible dans les rubriques
                    </td>
                    <td />
                    <td className="px-4 py-3 text-right">
                      {money(unexplainedDeductions)}
                    </td>
                  </tr>
                ) : null}
                {statement.advance_repayments > 0 ? (
                  <tr>
                    <td className="px-4 py-3 font-medium">
                      Remboursement d’avance
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      Échéance retenue sur cette période
                    </td>
                    <td />
                    <td className="px-4 py-3 text-right">
                      {money(statement.advance_repayments)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                <tr>
                  <td className="px-4 py-3" colSpan={2}>
                    Totaux
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700">
                    {money(statement.gross_amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-rose-700">
                    {money(totalDeductions)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="grid gap-4 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:grid-cols-3 sm:px-8">
          {[
            ["Net à payer", statement.net_amount, "text-slate-950"],
            ["Déjà payé", statement.paid_amount, "text-emerald-700"],
            [
              "Reste à payer",
              balance,
              balance > 0 ? "text-amber-700" : "text-emerald-700",
            ],
          ].map(([label, value, color]) => (
            <div key={String(label)}>
              <span className="text-xs font-semibold uppercase text-slate-500">
                {String(label)}
              </span>
              <strong className={`mt-1 block text-xl ${String(color)}`}>
                {money(Number(value))}
              </strong>
            </div>
          ))}
        </section>

        <section className="grid gap-6 px-6 py-6 sm:grid-cols-2 sm:px-8">
          <div>
            <h2 className="mb-3 mt-0 text-sm font-semibold text-slate-950">
              Activités intégrées
            </h2>
            {statement.work_entries.length ? (
              <ul className="m-0 space-y-2 p-0">
                {statement.work_entries.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <span>
                      {date(item.work_date)} ·{" "}
                      {(item.minutes / 60).toLocaleString("fr-GN", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      h
                    </span>
                    <span className="font-medium">
                      {item.rate
                        ? `${money(item.rate)} / h`
                        : "Taux du contrat"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                Aucune activité variable sur ce bulletin.
              </p>
            )}
          </div>
          <div>
            <h2 className="mb-3 mt-0 text-sm font-semibold text-slate-950">
              Paiements enregistrés
            </h2>
            {statement.payments.length ? (
              <ul className="m-0 space-y-2 p-0">
                {statement.payments.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <span>
                      {date(item.paid_on)} · {item.method}
                      {item.reference ? ` · ${item.reference}` : ""}
                    </span>
                    <strong className="text-emerald-700">
                      {money(item.amount)}
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                Aucun paiement enregistré.
              </p>
            )}
          </div>
        </section>
        <footer className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500 sm:px-8">
          Document de gestion interne — ne constitue pas un bulletin de paie
          réglementaire ou une déclaration sociale.
        </footer>
      </main>
      <PayrollAdjustmentDialog
        visible={dialog === "adjustment"}
        onHide={() => setDialog(null)}
        onSaved={load}
        institutionId={institutionId}
        entryId={statement.id}
        catalogs={catalogs}
      />
      <PayrollPaymentDialog
        visible={dialog === "payment"}
        onHide={() => setDialog(null)}
        onSaved={load}
        institutionId={institutionId}
        entryId={statement.id}
        balance={balance}
      />
    </div>
  );
}
