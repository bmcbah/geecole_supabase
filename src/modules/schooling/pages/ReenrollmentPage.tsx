import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { useAcademicSession } from "../../../features/academic-session/components/academic-session-context";
import { listAnnualAcademicLevels } from "../../../features/settings/services/academic-structure.service";
import { useToast } from "../../../shared/components/toast-context";
import { getStudent } from "../services/schooling.service";
import {
  getReenrollmentPolicy,
  reenrollStudent,
  type ReenrollmentPolicy,
} from "../services/reenrollment.service";

type Detail = Awaited<ReturnType<typeof getStudent>>;
type AnnualLevel = Awaited<ReturnType<typeof listAnnualAcademicLevels>>[number];

export function ReenrollmentPage() {
  const { studentId = "" } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const { institutionId, yearId, years } = useAcademicSession();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [policy, setPolicy] = useState<ReenrollmentPolicy | null>(null);
  const [levels, setLevels] = useState<AnnualLevel[]>([]);
  const [targetYearId, setTargetYearId] = useState("");
  const [targetLevelId, setTargetLevelId] = useState("");
  const [decision, setDecision] = useState("promotion");
  const [status, setStatus] = useState<
    "draft" | "pre_registered" | "confirmed"
  >("pre_registered");
  const [reason, setReason] = useState("");
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  const targetYears = useMemo(
    () =>
      years.filter(
        (item) =>
          item.id !== yearId && ["preparation", "open"].includes(item.status),
      ),
    [yearId, years],
  );

  useEffect(() => {
    if (!studentId || !yearId || !institutionId) return;
    void Promise.all([
      getStudent(studentId, yearId),
      getReenrollmentPolicy(institutionId),
    ])
      .then(([studentDetail, rules]) => {
        setDetail(studentDetail);
        setPolicy(rules);
        const firstYear =
          targetYears.find((item) => item.status === "preparation") ??
          targetYears[0];
        setTargetYearId(firstYear?.id ?? "");
      })
      .catch(() => setFailure("Impossible de préparer la réinscription."));
  }, [institutionId, studentId, targetYears, yearId]);

  useEffect(() => {
    if (!targetYearId) {
      setLevels([]);
      setTargetLevelId("");
      return;
    }
    void listAnnualAcademicLevels(targetYearId)
      .then((items) => {
        setLevels(items);
        const currentIndex = items.findIndex(
          (item) =>
            item.level_name_snapshot ===
            detail?.enrollment?.level_name_snapshot,
        );
        const suggested =
          currentIndex >= 0
            ? (items[currentIndex + 1] ?? items[currentIndex])
            : items[0];
        setTargetLevelId(suggested?.id ?? "");
      })
      .catch(() =>
        setFailure("Impossible de charger les niveaux de l’année cible."),
      );
  }, [detail?.enrollment?.level_name_snapshot, targetYearId]);

  if (failure) return <Message severity="error" text={failure} />;
  if (!detail || !policy)
    return (
      <div className="content-state">
        <ProgressSpinner />
      </div>
    );
  const { student, enrollment } = detail;
  if (!enrollment || enrollment.status !== "confirmed")
    return (
      <Message
        severity="warn"
        text="Seule une inscription confirmée peut être renouvelée."
      />
    );
  const needsReason = decision !== "promotion";
  const targetYear = years.find((item) => item.id === targetYearId);
  const targetLevel = levels.find((item) => item.id === targetLevelId);
  return (
    <section className="reenrollment-page medium-controls">
      <Button
        label="Retour à la fiche"
        icon="pi pi-arrow-left"
        text
        onClick={() => void navigate(`/scolarite/eleves/${studentId}`)}
      />
      <div className="page-heading">
        <div>
          <span className="eyebrow">Scolarité · Réinscription</span>
          <h1>
            {student.first_name} {student.last_name}
          </h1>
          <p>Comparez le parcours actuel et la proposition avant validation.</p>
        </div>
      </div>
      {!targetYears.length && (
        <Message
          severity="warn"
          text="Créez ou ouvrez d’abord l’année scolaire cible et sa structure pédagogique."
        />
      )}
      <div className="console-workbench">
        <div className="console-workbench-main">
          <section className="console-panel reenrollment-target-panel">
            <header className="console-panel-heading">
              <div>
                <span className="console-section-index">01</span>
                <h2>Destination scolaire</h2>
                <p>Sélectionnez l’année et le niveau d’accueil.</p>
              </div>
            </header>
            <div className="schooling-form-grid">
              <label className="field">
                <span>Année scolaire</span>
                <Dropdown
                  value={targetYearId}
                  options={targetYears}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Choisir l’année"
                  onChange={(event) => setTargetYearId(String(event.value))}
                />
              </label>
              <label className="field">
                <span>Niveau proposé</span>
                <Dropdown
                  value={targetLevelId}
                  options={levels}
                  optionLabel="level_name_snapshot"
                  optionValue="id"
                  placeholder="Choisir le niveau"
                  onChange={(event) => setTargetLevelId(String(event.value))}
                />
              </label>
            </div>
          </section>
          <section className="console-panel reenrollment-decision">
            <header className="console-panel-heading">
              <div>
                <span className="console-section-index">02</span>
                <h2>Décision et statut</h2>
                <p>Validez la progression et l’état initial du dossier.</p>
              </div>
            </header>
            <div className="schooling-form-grid">
              <label className="field">
                <span>Décision scolaire</span>
                <Dropdown
                  value={decision}
                  options={[
                    { label: "Promotion", value: "promotion" },
                    {
                      label: "Redoublement",
                      value: "repeat",
                      disabled: policy.repeat_mode === "forbidden",
                    },
                    { label: "Saut de niveau", value: "skip" },
                    { label: "Décision exceptionnelle", value: "exceptional" },
                  ]}
                  optionDisabled="disabled"
                  onChange={(event) => setDecision(String(event.value))}
                />
              </label>
              <label className="field">
                <span>Statut créé</span>
                <Dropdown
                  value={status}
                  options={[
                    { label: "Brouillon", value: "draft" },
                    { label: "Préinscrit", value: "pre_registered" },
                    ...(policy.allow_direct_confirmation
                      ? [{ label: "Confirmé", value: "confirmed" }]
                      : []),
                  ]}
                  onChange={(event) => setStatus(event.value as typeof status)}
                />
              </label>
              {needsReason && (
                <label className="field field-span">
                  <span>Motif obligatoire</span>
                  <InputTextarea
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
              )}
            </div>
          </section>
        </div>
        <aside className="console-summary-panel">
          <header>
            <span className="step-label">Récapitulatif</span>
            <h2>Nouvelle inscription</h2>
          </header>
          <dl className="console-summary-list">
            <div>
              <dt>Élève</dt>
              <dd>
                {student.first_name} {student.last_name}
              </dd>
            </div>
            <div>
              <dt>Situation actuelle</dt>
              <dd>
                {years.find((item) => item.id === yearId)?.name}
                <small>
                  {enrollment.cycle_name_snapshot} ·{" "}
                  {enrollment.level_name_snapshot}
                </small>
              </dd>
            </div>
            <div>
              <dt>Année cible</dt>
              <dd>{targetYear?.name || "À sélectionner"}</dd>
            </div>
            <div>
              <dt>Niveau cible</dt>
              <dd>{targetLevel?.level_name_snapshot || "À sélectionner"}</dd>
            </div>
            <div>
              <dt>Décision</dt>
              <dd>
                {decision === "promotion"
                  ? "Promotion"
                  : "Décision particulière"}
              </dd>
            </div>
          </dl>
          <Message
            severity="info"
            text="Aucune donnée de l’année actuelle ne sera modifiée."
          />
          <div className="console-summary-action">
            <Button
              label="Créer la réinscription"
              icon="pi pi-check"
              disabled={
                !targetYearId ||
                !targetLevelId ||
                (needsReason && !reason.trim())
              }
              loading={saving}
              onClick={() => {
                setSaving(true);
                void reenrollStudent({
                  sourceEnrollmentId: enrollment.id,
                  academicYearId: targetYearId,
                  annualLevelId: targetLevelId,
                  decision,
                  status,
                  reason,
                })
                  .then(() => {
                    notify({
                      severity: "success",
                      summary: "Réinscription créée",
                      detail: `${student.first_name} est ${status === "confirmed" ? "réinscrit" : "préinscrit"}.`,
                    });
                    void navigate("/scolarite/eleves");
                  })
                  .catch((error: { message?: string }) =>
                    notify({
                      severity: "error",
                      summary: "Réinscription impossible",
                      detail: error.message,
                    }),
                  )
                  .finally(() => setSaving(false));
              }}
            />
          </div>
        </aside>
      </div>
    </section>
  );
}
