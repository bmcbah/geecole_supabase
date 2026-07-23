import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { SchoolingPanel } from "../components/SchoolingPanel";
import {
  changeEnrollmentStatus,
  listEnrollmentWorkflows,
  type EnrollmentWorkflowRow,
  type EnrollmentWorkflowStatus,
} from "../services/schooling-workflows.service";

const labels: Partial<Record<EnrollmentWorkflowStatus, string>> = {
  draft: "Brouillon",
  confirmed: "Confirmée",
  cancelled: "Annulée",
  transferred: "Transférée",
  rejected: "Refusée",
  withdrawn: "Retirée",
};
const severity = (
  status: EnrollmentWorkflowStatus,
): "success" | "secondary" | "danger" | "warning" =>
  status === "confirmed"
    ? "success"
    : status === "draft"
      ? "secondary"
      : status === "cancelled" || status === "rejected"
        ? "danger"
        : "warning";

export function InscriptionsWorkspacePage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<EnrollmentWorkflowRow[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"to-review" | "confirmed" | "history">(
    "to-review",
  );
  const [selected, setSelected] = useState<EnrollmentWorkflowRow | null>(null);
  const [target, setTarget] = useState<EnrollmentWorkflowStatus>("confirmed");
  const [transitionVisible, setTransitionVisible] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      const rows = await listEnrollmentWorkflows(institutionId, yearId);
      const scoped = rows.filter((item) => item.status !== "pre_registered");
      setItems(scoped);
      setSelected((current) =>
        current
          ? (scoped.find((item) => item.id === current.id) ?? null)
          : (scoped.find((item) => item.status === "draft") ??
            scoped[0] ??
            null),
      );
    } catch {
      setFailure("Impossible de charger les dossiers d’inscription.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const counters = useMemo(
    () => ({
      toReview: items.filter((item) => item.status === "draft").length,
      confirmed: items.filter((item) => item.status === "confirmed").length,
      history: items.filter((item) =>
        ["cancelled", "transferred", "rejected", "withdrawn"].includes(
          item.status,
        ),
      ).length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return items.filter((item) => {
      const matchesView =
        view === "to-review"
          ? item.status === "draft"
          : view === "confirmed"
            ? item.status === "confirmed"
            : ["cancelled", "transferred", "rejected", "withdrawn"].includes(
                item.status,
              );
      const searchable =
        `${item.student.first_name} ${item.student.last_name} ${item.student.matricule} ${item.level_name_snapshot}`.toLocaleLowerCase(
          "fr",
        );
      return matchesView && (!normalized || searchable.includes(normalized));
    });
  }, [items, query, view]);

  const openTransition = (status: EnrollmentWorkflowStatus) => {
    setTarget(status);
    setReason("");
    setTransitionVisible(true);
  };

  const apply = async () => {
    if (!selected) return;
    try {
      await changeEnrollmentStatus(selected.id, target, reason);
      setTransitionVisible(false);
      setReason("");
      await load();
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "La transition n’a pas pu être enregistrée.",
      );
    }
  };

  if (!yearId)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <SchoolingPanel
      path={`Scolarité · ${year?.name ?? "Année active"}`}
      title="Validation des inscriptions"
      description="Traitez les nouveaux dossiers jusqu’à leur validation. La liste sert de file de travail, pas de registre des élèves."
      alert={failure ? <Message severity="error" text={failure} /> : undefined}
      toolbar={
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <span className="p-input-icon-left min-w-64 flex-1">
            <i className="pi pi-search" />
            <InputText
              className="w-full"
              value={query}
              placeholder="Nom, matricule ou niveau"
              onChange={(event) => setQuery(event.target.value)}
            />
          </span>
          <Button
            label="Nouvelle inscription"
            icon="pi pi-plus"
            size="small"
            onClick={() => void navigate("/scolarite/inscriptions/nouvelle")}
          />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["to-review", "À valider", counters.toReview, "pi-inbox"],
              ["confirmed", "Validées", counters.confirmed, "pi-check-circle"],
              ["history", "Historique", counters.history, "pi-history"],
            ] as const
          ).map(([id, label, count, icon]) => (
            <button
              key={id}
              type="button"
              className={`flex items-center justify-between rounded-xl border p-4 text-left ${view === id ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-200"}`}
              onClick={() => setView(id)}
            >
              <span>
                <span className="block text-xs font-semibold uppercase text-slate-500">
                  {label}
                </span>
                <strong className="mt-1 block text-2xl text-slate-950">
                  {count}
                </strong>
              </span>
              <i className={`pi ${icon} text-xl text-emerald-600`} />
            </button>
          ))}
        </div>

        <div className="grid min-h-[560px] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-950">
                File de dossiers
              </h2>
              <p className="text-xs text-slate-500">
                {loading ? "Chargement…" : `${filtered.length} dossier(s)`}
              </p>
            </div>
            <div className="max-h-[500px] overflow-y-auto p-2">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mb-1 w-full rounded-lg border p-3 text-left ${selected?.id === item.id ? "border-emerald-300 bg-emerald-50" : "border-transparent hover:bg-slate-50"}`}
                  onClick={() => setSelected(item)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span>
                      <strong className="block text-sm text-slate-900">
                        {item.student.first_name} {item.student.last_name}
                      </strong>
                      <small className="text-slate-500">
                        {item.student.matricule} · {item.level_name_snapshot}
                      </small>
                    </span>
                    <Tag
                      value={labels[item.status] ?? item.status}
                      severity={severity(item.status)}
                    />
                  </div>
                </button>
              ))}
              {!filtered.length ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  Aucun dossier dans cette file.
                </div>
              ) : null}
            </div>
          </aside>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            {selected ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      Dossier sélectionné
                    </span>
                    <h2 className="mt-1 text-xl font-semibold text-slate-950">
                      {selected.student.first_name} {selected.student.last_name}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {selected.student.matricule}
                    </p>
                  </div>
                  <Tag
                    value={labels[selected.status] ?? selected.status}
                    severity={severity(selected.status)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Cycle", selected.cycle_name_snapshot],
                    ["Niveau", selected.level_name_snapshot],
                    [
                      "Classe",
                      selected.assignment[0]?.class_name ?? "Non affectée",
                    ],
                    [
                      "Date",
                      new Date(selected.admission_date).toLocaleDateString(
                        "fr-FR",
                      ),
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3">
                      <span className="text-xs text-slate-500">{label}</span>
                      <strong className="block text-sm text-slate-900">
                        {value}
                      </strong>
                    </div>
                  ))}
                </div>
                {selected.status === "draft" ? (
                  <Message
                    severity="info"
                    text="Contrôlez l’identité, le responsable principal, le niveau et les pièces avant de valider l’inscription."
                  />
                ) : null}
                <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  <Button
                    label="Ouvrir la fiche élève"
                    icon="pi pi-user"
                    outlined
                    onClick={() =>
                      void navigate(`/scolarite/eleves/${selected.student.id}`)
                    }
                  />
                  {selected.status === "draft" ? (
                    <Button
                      label="Valider l’inscription"
                      icon="pi pi-check"
                      onClick={() => openTransition("confirmed")}
                    />
                  ) : null}
                  {selected.status === "draft" ? (
                    <Button
                      label="Refuser"
                      icon="pi pi-times"
                      severity="danger"
                      text
                      onClick={() => openTransition("rejected")}
                    />
                  ) : null}
                  {selected.status === "confirmed" ? (
                    <Button
                      label="Annuler"
                      icon="pi pi-ban"
                      severity="danger"
                      text
                      onClick={() => openTransition("cancelled")}
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid min-h-[420px] place-items-center text-center text-sm text-slate-500">
                Sélectionnez un dossier dans la file de gauche.
              </div>
            )}
          </section>
        </div>
      </div>

      <Dialog
        header={
          target === "confirmed"
            ? "Valider l’inscription"
            : target === "rejected"
              ? "Refuser le dossier"
              : "Annuler l’inscription"
        }
        visible={transitionVisible}
        onHide={() => setTransitionVisible(false)}
        style={{ width: "min(520px, 95vw)" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Fermer"
              text
              severity="secondary"
              onClick={() => setTransitionVisible(false)}
            />
            <Button
              label="Confirmer"
              disabled={
                ["rejected", "cancelled"].includes(target) && !reason.trim()
              }
              onClick={() => void apply()}
            />
          </div>
        }
      >
        <p className="mb-4 text-sm text-slate-600">
          Cette action sera conservée dans l’historique du dossier.
        </p>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">
            Motif{" "}
            {["rejected", "cancelled"].includes(target)
              ? "obligatoire"
              : "facultatif"}
          </span>
          <InputTextarea
            className="w-full"
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      </Dialog>
    </SchoolingPanel>
  );
}
