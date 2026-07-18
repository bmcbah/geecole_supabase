import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { listAnnualAcademicLevels } from "../../settings/services/academic-structure.service";
import { useToast } from "../../../shared/components/toast-context";
import { SchoolingPanel } from "../components/SchoolingPanel";
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
  const [status, setStatus] = useState<"draft" | "pre_registered" | "confirmed">("pre_registered");
  const [reason, setReason] = useState("");
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);

  const targetYears = useMemo(
    () => years.filter((item) => item.id !== yearId && ["preparation", "open"].includes(item.status)),
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
        const firstYear = targetYears.find((item) => item.status === "preparation") ?? targetYears[0];
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
          (item) => item.level_name_snapshot === detail?.enrollment?.level_name_snapshot,
        );
        const suggested = currentIndex >= 0 ? (items[currentIndex + 1] ?? items[currentIndex]) : items[0];
        setTargetLevelId(suggested?.id ?? "");
      })
      .catch(() => setFailure("Impossible de charger les niveaux de l’année cible."));
  }, [detail?.enrollment?.level_name_snapshot, targetYearId]);

  if (failure) return <Message severity="error" text={failure} />;
  if (!detail || !policy) {
    return (
      <div className="content-state">
        <ProgressSpinner />
      </div>
    );
  }

  const { student, enrollment } = detail;
  if (!enrollment || enrollment.status !== "confirmed") {
    return <Message severity="warn" text="Seule une inscription confirmée peut être renouvelée." />;
  }

  const needsReason = decision !== "promotion";
  const targetYear = years.find((item) => item.id === targetYearId);
  const targetLevel = levels.find((item) => item.id === targetLevelId);

  return (
    <SchoolingPanel
      path="Scolarité · Élèves · Réinscription"
      title={`${student.first_name} ${student.last_name}`}
      description="Comparez le parcours actuel et la proposition avant validation."
      backLabel="Retour à la fiche"
      onBack={() => void navigate(`/scolarite/eleves/${studentId}`)}
      alert={
        !targetYears.length ? (
          <Message
            severity="warn"
            text="Créez ou ouvrez d’abord l’année scolaire cible et sa structure pédagogique."
          />
        ) : undefined
      }
    >
      <div className="reenrollment-comparison">
        <section className="reenrollment-side current">
          <span className="step-label">Situation actuelle</span>
          <h2>{enrollment.level_name_snapshot}</h2>
          <dl className="profile-dl">
            <div><dt>Année</dt><dd>{years.find((item) => item.id === yearId)?.name}</dd></div>
            <div><dt>Cycle</dt><dd>{enrollment.cycle_name_snapshot}</dd></div>
            <div><dt>Statut</dt><dd>Inscription confirmée</dd></div>
          </dl>
        </section>

        <i className="pi pi-arrow-right reenrollment-arrow" />

        <section className="reenrollment-side target">
          <span className="step-label">Nouvelle année</span>
          <div className="schooling-form-grid single-column">
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
      </div>

      <section className="reenrollment-decision">
        <header>
          <div>
            <h2>Décision et validation</h2>
            <p>La proposition reste modifiable selon les règles de l’établissement.</p>
          </div>
        </header>

        <div className="schooling-form-grid">
          <label className="field">
            <span>Décision scolaire</span>
            <Dropdown
              value={decision}
              options={[
                { label: "Promotion", value: "promotion" },
                { label: "Redoublement", value: "repeat", disabled: policy.repeat_mode === "forbidden" },
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
                ...(policy.allow_direct_confirmation ? [{ label: "Confirmé", value: "confirmed" }] : []),
              ]}
              onChange={(event) => setStatus(event.value as typeof status)}
            />
          </label>

          {needsReason ? (
            <label className="field field-span">
              <span>Motif obligatoire</span>
              <InputTextarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
          ) : null}
        </div>

        <div className="reenrollment-summary">
          <strong>Récapitulatif</strong>
          <span>
            {targetYear?.name || "Année à choisir"} · {targetLevel?.level_name_snapshot || "Niveau à choisir"} · {decision === "promotion" ? "Promotion" : "Décision particulière"}
          </span>
        </div>

        <div className="dialog-actions">
          <Button
            label="Créer la réinscription"
            icon="pi pi-check"
            disabled={!targetYearId || !targetLevelId || (needsReason && !reason.trim())}
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
      </section>
    </SchoolingPanel>
  );
}
