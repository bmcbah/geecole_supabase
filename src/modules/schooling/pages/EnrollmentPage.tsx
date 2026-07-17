import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Steps } from "primereact/steps";
import { useAcademicSession } from "../../../features/academic-session/components/academic-session-context";
import { listAnnualAcademicLevels } from "../../../features/settings/services/academic-structure.service";
import { enrollmentSchema } from "../schemas/enrollment.schema";
import {
  getEnrollmentPolicy,
  type EnrollmentPolicy,
} from "../services/enrollment-policy.service";
import {
  createEnrollment,
  findDuplicateCandidates,
  searchGuardians,
} from "../services/schooling.service";
import type { Database } from "../../../shared/lib/supabase/database.types";
import type { DuplicateCandidate, EnrollmentInput } from "../types/schooling";

type Guardian = Database["public"]["Tables"]["guardians"]["Row"];
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
const stepItems = [
  "Recherche",
  "Identité",
  "Responsable",
  "Scolarité",
  "Documents",
  "Frais",
  "Récapitulatif",
].map((label) => ({ label }));
const requiredDocuments = [
  "Extrait de naissance",
  "Photo d’identité",
  "Bulletin précédent",
];

export function EnrollmentPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [active, setActive] = useState(0);
  const [form, setForm] = useState(initial);
  const [levels, setLevels] = useState<
    Awaited<ReturnType<typeof listAnnualAcademicLevels>>
  >([]);
  const [policy, setPolicy] = useState<EnrollmentPolicy | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [guardianQuery, setGuardianQuery] = useState("");
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [documents, setDocuments] = useState<string[]>([]);
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!institutionId || !yearId) return;
    void Promise.all([
      listAnnualAcademicLevels(yearId),
      getEnrollmentPolicy(institutionId),
    ])
      .then(([levelData, policyData]) => {
        setLevels(levelData);
        setPolicy(policyData);
        setForm((current) => ({
          ...current,
          kind: policyData.allow_pre_registration
            ? "pre_registered"
            : "confirmed",
        }));
      })
      .catch(() =>
        setFailure("Impossible de préparer le parcours d’inscription."),
      );
  }, [institutionId, yearId]);
  const levelOptions = useMemo(
    () =>
      levels.map((level) => ({
        label: `${level.cycle_name_snapshot} · ${level.level_name_snapshot}`,
        value: level.id,
      })),
    [levels],
  );
  const set = (key: keyof EnrollmentInput, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const findDuplicates = async () => {
    if (!form.firstName || !form.lastName) {
      setFailure("Saisissez le nom et le prénom pour rechercher l’élève.");
      return false;
    }
    setDuplicates(
      await findDuplicateCandidates(
        institutionId,
        form.firstName,
        form.lastName,
      ),
    );
    return true;
  };
  const next = async () => {
    setFailure("");
    try {
      if (active === 0 && !(await findDuplicates())) return;
      if (active === 1 && (!form.firstName || !form.lastName))
        throw new Error("L’identité est incomplète.");
      if (
        active === 2 &&
        (!form.guardianFirstName ||
          !form.guardianLastName ||
          form.guardianPhone.length < 8)
      )
        throw new Error("Sélectionnez ou créez un responsable principal.");
      if (active === 3 && !form.annualLevelId)
        throw new Error("Sélectionnez le niveau demandé.");
      setActive((value) => Math.min(6, value + 1));
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Étape incomplète.");
    }
  };
  const chooseGuardian = (guardian: Guardian) => {
    set("guardianFirstName", guardian.first_name);
    set("guardianLastName", guardian.last_name);
    set("guardianPhone", guardian.primary_phone);
    setGuardians([]);
    setGuardianQuery(`${guardian.first_name} ${guardian.last_name}`);
  };
  const confirmationBlocked =
    form.kind === "confirmed" &&
    Boolean(
      policy?.require_payment_before_confirmation ||
      (!policy?.allow_missing_documents &&
        documents.length < requiredDocuments.length) ||
      policy?.require_class_assignment,
    );
  const submit = async () => {
    const parsed = enrollmentSchema.safeParse(form);
    if (!parsed.success) {
      setFailure(parsed.error.issues[0]?.message ?? "Dossier incomplet.");
      return;
    }
    if (confirmationBlocked) {
      setFailure(
        "Cette inscription ne peut pas être confirmée tant que les exigences de l’établissement ne sont pas satisfaites.",
      );
      return;
    }
    setSaving(true);
    try {
      await createEnrollment(institutionId, yearId, parsed.data);
      void navigate("/scolarite/eleves");
    } catch {
      setFailure("Impossible d’enregistrer ce dossier.");
    } finally {
      setSaving(false);
    }
  };
  if (!yearId)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  return (
    <section className="enrollment-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Scolarité · {year?.name}</span>
          <h1>Inscrire un élève</h1>
          <p>
            Le dossier peut être enregistré progressivement sans perdre les
            informations.
          </p>
        </div>
        <Button
          label="Quitter"
          icon="pi pi-times"
          severity="secondary"
          text
          onClick={() => void navigate("/scolarite/eleves")}
        />
      </header>
      <Card>
        <Steps model={stepItems} activeIndex={active} readOnly />
        {failure && (
          <Message
            severity="error"
            text={failure}
            className="schooling-message"
          />
        )}
        {active === 0 && (
          <div className="enrollment-step">
            <h2>Rechercher avant de créer</h2>
            <p>Cette vérification évite de recréer un élève déjà connu.</p>
            <div className="schooling-form-grid">
              <label className="field">
                <span>Prénom de l’élève</span>
                <InputText
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                />
              </label>
              <label className="field">
                <span>Nom de l’élève</span>
                <InputText
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                />
              </label>
            </div>
            {duplicates.length > 0 && (
              <Message
                severity="warn"
                text={`${duplicates.length} dossier(s) ressemblant(s) trouvé(s). Ouvrez la fiche existante avant de créer un doublon.`}
              />
            )}
            {duplicates.map((item) => (
              <div className="duplicate-row" key={item.id}>
                <span>
                  <strong>{item.fullName}</strong>
                  <small>
                    {item.matricule} · {item.birthDate || "Date inconnue"}
                  </small>
                </span>
                <Button
                  label="Ouvrir la fiche"
                  text
                  onClick={() => void navigate(`/scolarite/eleves/${item.id}`)}
                />
              </div>
            ))}
          </div>
        )}
        {active === 1 && (
          <div className="enrollment-step">
            <h2>Identité de l’élève</h2>
            <div className="schooling-form-grid">
              <label className="field">
                <span>Prénom *</span>
                <InputText
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                />
              </label>
              <label className="field">
                <span>Nom *</span>
                <InputText
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                />
              </label>
              <label className="field">
                <span>Sexe *</span>
                <Dropdown
                  value={form.gender}
                  options={[
                    { label: "Masculin", value: "male" },
                    { label: "Féminin", value: "female" },
                    { label: "Autre", value: "other" },
                  ]}
                  onChange={(e) => set("gender", String(e.value))}
                />
              </label>
              <label className="field">
                <span>Date de naissance</span>
                <InputText
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => set("birthDate", e.target.value)}
                />
              </label>
              <label className="field">
                <span>Lieu de naissance</span>
                <InputText
                  value={form.birthPlace}
                  onChange={(e) => set("birthPlace", e.target.value)}
                />
              </label>
              <label className="field">
                <span>Adresse</span>
                <InputText
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </label>
            </div>
          </div>
        )}
        {active === 2 && (
          <div className="enrollment-step">
            <h2>Responsable principal</h2>
            <div className="guardian-search">
              <label className="field">
                <span>Rechercher par nom ou téléphone</span>
                <span className="p-inputgroup">
                  <InputText
                    value={guardianQuery}
                    onChange={(e) => setGuardianQuery(e.target.value)}
                    placeholder="Ex. 620 00 00 00"
                  />
                  <Button
                    label="Rechercher"
                    icon="pi pi-search"
                    onClick={() =>
                      void searchGuardians(institutionId, guardianQuery).then(
                        setGuardians,
                      )
                    }
                  />
                </span>
              </label>
              {guardians.map((guardian) => (
                <button
                  type="button"
                  className="guardian-result"
                  key={guardian.id}
                  onClick={() => chooseGuardian(guardian)}
                >
                  <strong>
                    {guardian.first_name} {guardian.last_name}
                  </strong>
                  <span>{guardian.primary_phone}</span>
                </button>
              ))}
            </div>
            <Message
              severity="info"
              text="Si le responsable existe, sélectionnez-le. Sinon, complétez les champs ci-dessous."
            />
            <div className="schooling-form-grid">
              <label className="field">
                <span>Prénom *</span>
                <InputText
                  value={form.guardianFirstName}
                  onChange={(e) => set("guardianFirstName", e.target.value)}
                />
              </label>
              <label className="field">
                <span>Nom *</span>
                <InputText
                  value={form.guardianLastName}
                  onChange={(e) => set("guardianLastName", e.target.value)}
                />
              </label>
              <label className="field">
                <span>Téléphone *</span>
                <InputText
                  value={form.guardianPhone}
                  onChange={(e) => set("guardianPhone", e.target.value)}
                />
              </label>
              <label className="field">
                <span>Lien</span>
                <Dropdown
                  value={form.guardianRelationship}
                  options={[
                    { label: "Père", value: "father" },
                    { label: "Mère", value: "mother" },
                    { label: "Tuteur", value: "guardian" },
                    { label: "Autre", value: "other" },
                  ]}
                  onChange={(e) => set("guardianRelationship", String(e.value))}
                />
              </label>
            </div>
          </div>
        )}
        {active === 3 && (
          <div className="enrollment-step">
            <h2>Scolarité demandée</h2>
            <div className="schooling-form-grid">
              <label className="field">
                <span>Cycle et niveau *</span>
                <Dropdown
                  value={form.annualLevelId}
                  options={levelOptions}
                  filter
                  onChange={(e) => set("annualLevelId", String(e.value))}
                />
              </label>
              <label className="field">
                <span>Type de dossier</span>
                <Dropdown
                  value={form.kind}
                  options={[
                    ...(policy?.allow_pre_registration
                      ? [{ label: "Préinscription", value: "pre_registered" }]
                      : []),
                    ...(policy?.allow_direct_enrollment
                      ? [{ label: "Inscription confirmée", value: "confirmed" }]
                      : []),
                  ]}
                  onChange={(e) => set("kind", String(e.value))}
                />
              </label>
            </div>
            {policy?.require_class_assignment && (
              <Message
                severity="warn"
                text="Cet établissement exige une classe. La confirmation sera disponible après la mise en place des classes."
              />
            )}
          </div>
        )}
        {active === 4 && (
          <div className="enrollment-step">
            <h2>Documents</h2>
            <p>Cochez uniquement les pièces réellement reçues.</p>
            {requiredDocuments.map((document) => (
              <label className="document-row" key={document}>
                <Checkbox
                  checked={documents.includes(document)}
                  onChange={(e) =>
                    setDocuments((current) =>
                      e.checked
                        ? [...current, document]
                        : current.filter((item) => item !== document),
                    )
                  }
                />
                <span>{document}</span>
              </label>
            ))}
            {!policy?.allow_missing_documents && (
              <Message
                severity="warn"
                text="Toutes les pièces sont obligatoires pour confirmer l’inscription."
              />
            )}
          </div>
        )}
        {active === 5 && (
          <div className="enrollment-step">
            <h2>Frais applicables</h2>
            <Message
              severity="info"
              text="Les frais configurés pour le niveau seront générés au moment de la confirmation dans le prochain lot Finance scolaire."
            />
            {policy?.require_payment_before_confirmation && (
              <Message
                severity="warn"
                text="Un paiement est obligatoire avant confirmation selon les règles de l’établissement."
              />
            )}
          </div>
        )}
        {active === 6 && (
          <div className="enrollment-step enrollment-summary">
            <h2>Récapitulatif</h2>
            <dl>
              <div>
                <dt>Élève</dt>
                <dd>
                  {form.firstName} {form.lastName}
                </dd>
              </div>
              <div>
                <dt>Responsable</dt>
                <dd>
                  {form.guardianFirstName} {form.guardianLastName} ·{" "}
                  {form.guardianPhone}
                </dd>
              </div>
              <div>
                <dt>Niveau</dt>
                <dd>
                  {
                    levelOptions.find(
                      (item) => item.value === form.annualLevelId,
                    )?.label
                  }
                </dd>
              </div>
              <div>
                <dt>Documents</dt>
                <dd>
                  {documents.length}/{requiredDocuments.length} reçus
                </dd>
              </div>
              <div>
                <dt>Statut</dt>
                <dd>
                  {form.kind === "confirmed"
                    ? "Inscription confirmée"
                    : "Préinscription"}
                </dd>
              </div>
            </dl>
            {confirmationBlocked && (
              <Message
                severity="warn"
                text="La confirmation est bloquée par une règle de l’établissement. Enregistrez plutôt une préinscription ou complétez les exigences."
              />
            )}
          </div>
        )}
        <footer className="enrollment-actions">
          <Button
            label="Enregistrer le brouillon"
            severity="secondary"
            text
            disabled
          />
          <span className="dialog-spacer" />
          {active > 0 && (
            <Button
              label="Précédent"
              severity="secondary"
              outlined
              onClick={() => setActive((value) => value - 1)}
            />
          )}
          {active < 6 ? (
            <Button
              label="Continuer"
              icon="pi pi-arrow-right"
              iconPos="right"
              onClick={() => void next()}
            />
          ) : (
            <Button
              label={
                form.kind === "confirmed"
                  ? "Confirmer l’inscription"
                  : "Enregistrer la préinscription"
              }
              icon="pi pi-check"
              loading={saving}
              disabled={confirmationBlocked}
              onClick={() => void submit()}
            />
          )}
        </footer>
      </Card>
    </section>
  );
}
