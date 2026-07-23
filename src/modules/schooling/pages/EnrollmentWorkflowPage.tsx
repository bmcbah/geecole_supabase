import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Steps } from "primereact/steps";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { listAnnualAcademicLevels } from "../../settings/services/academic-structure.service";
import { SchoolingPanel } from "../components/SchoolingPanel";
import { enrollmentSchema } from "../schemas/enrollment.schema";
import { getEnrollmentPolicy, type EnrollmentPolicy } from "../services/enrollment-policy.service";
import {
  createEnrollment,
  findDuplicateCandidates,
  searchGuardians,
} from "../services/schooling.service";
import {
  confirmEnrollment,
  evaluateEnrollment,
  getEnrollmentStudentId,
  hasBlockingValidation,
  listEnrollmentDocumentRequirements,
  saveEnrollmentDocuments,
  type DocumentRequirement,
  type EnrollmentValidationResult,
} from "../services/enrollment-workflow.service";
import type { Database } from "../../../shared/lib/supabase/database.types";
import type { DuplicateCandidate, EnrollmentInput } from "../types/schooling";

type Guardian = Database["public"]["Tables"]["guardians"]["Row"];
type FinalAction = "pre_registered" | "confirmed";

const initial: EnrollmentInput = {
  firstName: "",
  lastName: "",
  gender: "male",
  birthDate: "",
  birthPlace: "",
  address: "",
  guardianFirstName: "",
  guardianLastName: "",
  guardianPhone: "",
  guardianRelationship: "father",
  annualLevelId: "",
  kind: "pre_registered",
};

const relationshipOptions = [
  { label: "Père", value: "father" },
  { label: "Mère", value: "mother" },
  { label: "Tuteur", value: "guardian" },
  { label: "Autre", value: "other" },
];

const steps = [
  "Recherche",
  "Identité",
  "Responsable",
  "Scolarité",
  "Documents",
  "Frais",
  "Récapitulatif",
].map((label) => ({ label }));

function validationSeverity(severity: EnrollmentValidationResult["severity"]) {
  if (severity === "blocking") return "error" as const;
  if (severity === "warning") return "warn" as const;
  if (severity === "success") return "success" as const;
  return "info" as const;
}

export function EnrollmentWorkflowPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [active, setActive] = useState(0);
  const [form, setForm] = useState(initial);
  const [action, setAction] = useState<FinalAction>("pre_registered");
  const [levels, setLevels] = useState<Awaited<ReturnType<typeof listAnnualAcademicLevels>>>([]);
  const [policy, setPolicy] = useState<EnrollmentPolicy | null>(null);
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [providedRequirementIds, setProvidedRequirementIds] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [guardianQuery, setGuardianQuery] = useState("");
  const [guardianResults, setGuardianResults] = useState<Guardian[]>([]);
  const [validations, setValidations] = useState<EnrollmentValidationResult[]>([]);
  const [persistedStudentId, setPersistedStudentId] = useState<string | null>(null);
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!institutionId || !yearId) return;
    void Promise.all([
      listAnnualAcademicLevels(yearId),
      getEnrollmentPolicy(institutionId),
      listEnrollmentDocumentRequirements(institutionId),
    ])
      .then(([levelData, policyData, requirementData]) => {
        setLevels(levelData);
        setPolicy(policyData);
        setRequirements(requirementData);
        setAction(policyData.allow_pre_registration ? "pre_registered" : "confirmed");
      })
      .catch(() => setFailure("Impossible de préparer le parcours d’inscription."));
  }, [institutionId, yearId]);

  const levelOptions = useMemo(
    () => levels.map((level) => ({
      label: `${level.cycle_name_snapshot} · ${level.level_name_snapshot}`,
      value: level.id,
    })),
    [levels],
  );

  const actionOptions = useMemo(() => [
    ...(policy?.allow_pre_registration
      ? [{ label: "Enregistrer une préinscription", value: "pre_registered" }]
      : []),
    ...(policy?.allow_direct_enrollment
      ? [{ label: "Contrôler puis confirmer", value: "confirmed" }]
      : []),
  ], [policy]);

  const set = (key: keyof EnrollmentInput, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const next = async () => {
    setFailure("");
    try {
      if (active === 0) {
        if (!form.firstName.trim() || !form.lastName.trim()) {
          throw new Error("Saisissez le nom et le prénom avant la recherche.");
        }
        setDuplicates(await findDuplicateCandidates(institutionId, form.firstName, form.lastName));
      }
      if (active === 1 && (!form.firstName.trim() || !form.lastName.trim())) {
        throw new Error("L’identité est incomplète.");
      }
      if (active === 2 && (
        !form.guardianFirstName.trim() ||
        !form.guardianLastName.trim() ||
        form.guardianPhone.trim().length < 8
      )) {
        throw new Error("Sélectionnez ou créez un responsable principal.");
      }
      if (active === 3 && !form.annualLevelId) {
        throw new Error("Sélectionnez le niveau demandé.");
      }
      setActive((value) => Math.min(6, value + 1));
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Étape incomplète.");
    }
  };

  const chooseGuardian = (guardian: Guardian) => {
    set("guardianFirstName", guardian.first_name);
    set("guardianLastName", guardian.last_name);
    set("guardianPhone", guardian.primary_phone);
    setGuardianQuery(`${guardian.first_name} ${guardian.last_name}`);
    setGuardianResults([]);
  };

  const submit = async () => {
    if (persistedStudentId) {
      void navigate(`/scolarite/eleves/${persistedStudentId}`);
      return;
    }

    const parsed = enrollmentSchema.safeParse({ ...form, kind: "pre_registered" });
    if (!parsed.success) {
      setFailure(parsed.error.issues[0]?.message ?? "Dossier incomplet.");
      return;
    }

    setFailure("");
    setValidations([]);
    setSaving(true);
    try {
      const enrollmentId = await createEnrollment(
        institutionId,
        yearId,
        { ...parsed.data, kind: "pre_registered" },
      );
      const studentId = await getEnrollmentStudentId(enrollmentId);
      setPersistedStudentId(studentId);

      await saveEnrollmentDocuments(
        institutionId,
        studentId,
        enrollmentId,
        providedRequirementIds,
        requirements,
      );

      if (action === "confirmed") {
        const results = await evaluateEnrollment(enrollmentId);
        setValidations(results);
        if (hasBlockingValidation(results)) {
          setFailure(
            "La préinscription est enregistrée, mais la confirmation est bloquée. Corrigez le dossier depuis la fiche élève.",
          );
          return;
        }
        await confirmEnrollment(enrollmentId);
      }

      void navigate(`/scolarite/eleves/${studentId}`);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Impossible d’enregistrer ce dossier.");
    } finally {
      setSaving(false);
    }
  };

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return (
    <SchoolingPanel
      className="enrollment-page medium-controls"
      path={`Scolarité · ${year?.name ?? "Année scolaire"} · Inscription`}
      title="Inscrire un élève"
      description="Le serveur contrôle les règles de l’établissement avant toute confirmation."
      actions={<Button label="Quitter" icon="pi pi-times" severity="secondary" text onClick={() => void navigate("/scolarite/eleves")} />}
    >
      <Card className="overflow-hidden">
        <div className="space-y-5">
          <Steps model={steps} activeIndex={active} readOnly />
          {failure ? <Message severity="error" text={failure} className="schooling-message" /> : null}

          {active === 0 ? (
            <section className="enrollment-step">
              <h2>Rechercher avant de créer</h2>
              <p>Cette vérification réduit les doublons de dossiers élèves.</p>
              <div className="schooling-form-grid">
                <label className="field"><span>Prénom</span><InputText value={form.firstName} onChange={(event) => set("firstName", event.target.value)} /></label>
                <label className="field"><span>Nom</span><InputText value={form.lastName} onChange={(event) => set("lastName", event.target.value)} /></label>
              </div>
              {duplicates.map((item) => (
                <div className="duplicate-row" key={item.id}>
                  <span><strong>{item.fullName}</strong><small>{item.matricule} · {item.birthDate || "Date inconnue"}</small></span>
                  <Button label="Ouvrir la fiche" text onClick={() => void navigate(`/scolarite/eleves/${item.id}`)} />
                </div>
              ))}
            </section>
          ) : null}

          {active === 1 ? (
            <section className="enrollment-step">
              <h2>Identité de l’élève</h2>
              <div className="schooling-form-grid">
                <label className="field"><span>Prénom *</span><InputText value={form.firstName} onChange={(event) => set("firstName", event.target.value)} /></label>
                <label className="field"><span>Nom *</span><InputText value={form.lastName} onChange={(event) => set("lastName", event.target.value)} /></label>
                <label className="field"><span>Sexe *</span><Dropdown value={form.gender} options={[{ label: "Masculin", value: "male" }, { label: "Féminin", value: "female" }, { label: "Autre", value: "other" }]} onChange={(event) => set("gender", String(event.value))} /></label>
                <label className="field"><span>Date de naissance</span><InputText type="date" value={form.birthDate} onChange={(event) => set("birthDate", event.target.value)} /></label>
                <label className="field"><span>Lieu de naissance</span><InputText value={form.birthPlace} onChange={(event) => set("birthPlace", event.target.value)} /></label>
                <label className="field"><span>Adresse</span><InputText value={form.address} onChange={(event) => set("address", event.target.value)} /></label>
              </div>
            </section>
          ) : null}

          {active === 2 ? (
            <section className="enrollment-step space-y-4">
              <h2>Responsable principal</h2>
              <label className="field">
                <span>Rechercher par nom ou téléphone</span>
                <span className="p-inputgroup">
                  <InputText value={guardianQuery} onChange={(event) => setGuardianQuery(event.target.value)} />
                  <Button label="Rechercher" icon="pi pi-search" onClick={() => void searchGuardians(institutionId, guardianQuery).then(setGuardianResults)} />
                </span>
              </label>
              {guardianResults.map((guardian) => (
                <button type="button" className="guardian-result" key={guardian.id} onClick={() => chooseGuardian(guardian)}>
                  <strong>{guardian.first_name} {guardian.last_name}</strong><span>{guardian.primary_phone}</span>
                </button>
              ))}
              <div className="schooling-form-grid">
                <label className="field"><span>Prénom *</span><InputText value={form.guardianFirstName} onChange={(event) => set("guardianFirstName", event.target.value)} /></label>
                <label className="field"><span>Nom *</span><InputText value={form.guardianLastName} onChange={(event) => set("guardianLastName", event.target.value)} /></label>
                <label className="field"><span>Téléphone *</span><InputText value={form.guardianPhone} onChange={(event) => set("guardianPhone", event.target.value)} /></label>
                <label className="field"><span>Lien</span><Dropdown value={form.guardianRelationship} options={relationshipOptions} onChange={(event) => set("guardianRelationship", String(event.value))} /></label>
              </div>
            </section>
          ) : null}

          {active === 3 ? (
            <section className="enrollment-step">
              <h2>Scolarité demandée</h2>
              <div className="schooling-form-grid">
                <label className="field"><span>Cycle et niveau *</span><Dropdown value={form.annualLevelId} options={levelOptions} filter onChange={(event) => set("annualLevelId", String(event.value))} /></label>
                <label className="field"><span>Action finale</span><Dropdown value={action} options={actionOptions} onChange={(event) => setAction(event.value as FinalAction)} /></label>
              </div>
              {policy?.require_class_assignment ? <Message severity="warn" text="Une classe active sera obligatoire pour confirmer l’inscription." /> : null}
            </section>
          ) : null}

          {active === 4 ? (
            <section className="enrollment-step">
              <h2>Documents</h2>
              {requirements.length ? requirements.map((requirement) => (
                <label className="document-row" key={requirement.id}>
                  <Checkbox checked={providedRequirementIds.includes(requirement.id)} onChange={(event) => setProvidedRequirementIds((current) => event.checked ? [...current, requirement.id] : current.filter((id) => id !== requirement.id))} />
                  <span>{requirement.name}</span>
                  {requirement.required_for_confirmation ? <Tag value="Requis pour confirmer" severity="warning" /> : null}
                </label>
              )) : <Message severity="info" text="Aucune pièce obligatoire n’est configurée." />}
            </section>
          ) : null}

          {active === 5 ? (
            <section className="enrollment-step">
              <h2>Frais applicables</h2>
              <Message severity="info" text="La génération des frais reste gérée par le module Finances après confirmation." />
              {policy?.require_payment_before_confirmation ? <Message severity="warn" text="La politique exige un paiement avant confirmation, mais le contrôle financier serveur n’est pas encore raccordé." /> : null}
            </section>
          ) : null}

          {active === 6 ? (
            <section className="enrollment-step enrollment-summary space-y-4">
              <h2>Récapitulatif</h2>
              <dl>
                <div><dt>Élève</dt><dd>{form.firstName} {form.lastName}</dd></div>
                <div><dt>Responsable</dt><dd>{form.guardianFirstName} {form.guardianLastName} · {form.guardianPhone}</dd></div>
                <div><dt>Niveau</dt><dd>{levelOptions.find((item) => item.value === form.annualLevelId)?.label}</dd></div>
                <div><dt>Documents reçus</dt><dd>{providedRequirementIds.length}/{requirements.length}</dd></div>
                <div><dt>Action</dt><dd>{action === "confirmed" ? "Contrôler et confirmer" : "Enregistrer la préinscription"}</dd></div>
              </dl>
              {validations.map((validation) => (
                <Message key={validation.id} severity={validationSeverity(validation.severity)} text={`${validation.domain} · ${validation.message_key}`} />
              ))}
            </section>
          ) : null}

          <footer className="enrollment-actions">
            <span className="dialog-spacer" />
            {active > 0 && !persistedStudentId ? <Button label="Précédent" severity="secondary" outlined onClick={() => setActive((value) => value - 1)} /> : null}
            {active < 6
              ? <Button label="Continuer" icon="pi pi-arrow-right" iconPos="right" onClick={() => void next()} />
              : <Button label={persistedStudentId ? "Ouvrir le dossier enregistré" : action === "confirmed" ? "Contrôler et confirmer" : "Enregistrer la préinscription"} icon="pi pi-check" loading={saving} onClick={() => void submit()} />}
          </footer>
        </div>
      </Card>
    </SchoolingPanel>
  );
}
