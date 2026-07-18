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
import {
  getEnrollmentPolicy,
  type EnrollmentPolicy,
} from "../services/enrollment-policy.service";
import {
  createEnrollment,
  findDuplicateCandidates,
  searchGuardians,
  type GuardianLinkInput,
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

const emptyAdditionalGuardian: GuardianLinkInput = {
  firstName: "",
  lastName: "",
  phone: "",
  relationship: "guardian",
  primary: false,
  financial: false,
  emergency: false,
};

const relationshipOptions = [
  { label: "Père", value: "father" },
  { label: "Mère", value: "mother" },
  { label: "Tuteur / Tutrice", value: "guardian" },
  { label: "Autre", value: "other" },
];

const stepItems = ["Élève", "Responsables", "Scolarité", "Récapitulatif"].map(
  (label) => ({ label }),
);

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
  const [additionalGuardians, setAdditionalGuardians] = useState<GuardianLinkInput[]>([]);
  const [guardianDraft, setGuardianDraft] = useState<GuardianLinkInput>(
    emptyAdditionalGuardian,
  );
  const [guardianQuery, setGuardianQuery] = useState("");
  const [guardianResults, setGuardianResults] = useState<Guardian[]>([]);
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
      .catch(() => setFailure("Impossible de préparer le parcours d’inscription."));
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

  const searchExistingGuardians = async () => {
    try {
      setGuardianResults(await searchGuardians(institutionId, guardianQuery));
    } catch {
      setFailure("Impossible de rechercher les responsables.");
    }
  };

  const selectAdditionalGuardian = (guardian: Guardian) => {
    setGuardianDraft({
      ...emptyAdditionalGuardian,
      guardianId: guardian.id,
      firstName: guardian.first_name,
      lastName: guardian.last_name,
      phone: guardian.primary_phone,
    });
    setGuardianResults([]);
    setGuardianQuery(`${guardian.first_name} ${guardian.last_name}`);
  };

  const addAdditionalGuardian = () => {
    if (
      !guardianDraft.firstName.trim() ||
      !guardianDraft.lastName.trim() ||
      guardianDraft.phone.trim().length < 8
    ) {
      setFailure("Complétez le nom, le prénom et le téléphone du responsable.");
      return;
    }
    const duplicate = additionalGuardians.some(
      (item) =>
        (guardianDraft.guardianId && item.guardianId === guardianDraft.guardianId) ||
        item.phone.trim() === guardianDraft.phone.trim(),
    );
    if (duplicate) {
      setFailure("Ce responsable a déjà été ajouté.");
      return;
    }
    setAdditionalGuardians((current) => [...current, guardianDraft]);
    setGuardianDraft(emptyAdditionalGuardian);
    setGuardianQuery("");
    setFailure("");
  };

  const next = async () => {
    setFailure("");
    try {
      if (active === 0) {
        if (!form.firstName.trim() || !form.lastName.trim()) {
          throw new Error("Le nom et le prénom de l’élève sont obligatoires.");
        }
        setDuplicates(
          await findDuplicateCandidates(
            institutionId,
            form.firstName,
            form.lastName,
          ),
        );
      }
      if (
        active === 1 &&
        (!form.guardianFirstName.trim() ||
          !form.guardianLastName.trim() ||
          form.guardianPhone.trim().length < 8)
      ) {
        throw new Error("Renseignez au moins un responsable principal.");
      }
      if (active === 2 && !form.annualLevelId) {
        throw new Error("Sélectionnez le niveau demandé.");
      }
      setActive((value) => Math.min(3, value + 1));
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Étape incomplète.");
    }
  };

  const confirmationBlocked =
    form.kind === "confirmed" &&
    Boolean(
      policy?.require_payment_before_confirmation ||
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
    setFailure("");
    try {
      const enrollmentId = await createEnrollment(
        institutionId,
        yearId,
        parsed.data,
        additionalGuardians,
      );
      const student = await import("../../../shared/lib/supabase/client").then(
        async ({ supabase }) => {
          const { data, error } = await supabase
            .from("enrollments")
            .select("student_id")
            .eq("id", enrollmentId)
            .single();
          if (error) throw error;
          return data;
        },
      );
      void navigate(`/scolarite/eleves/${student.student_id}`);
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer ce dossier.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!yearId) {
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  }

  return (
    <SchoolingPanel
      className="enrollment-page medium-controls"
      path={`Scolarité · ${year?.name ?? "Année scolaire"} · Inscription`}
      title="Inscrire un élève"
      description="Créez l’élève, rattachez plusieurs responsables et choisissez sa scolarité."
      actions={
        <Button
          label="Quitter"
          icon="pi pi-times"
          severity="secondary"
          text
          onClick={() => void navigate("/scolarite/eleves")}
        />
      }
    >
      <Card className="overflow-hidden">
        <div className="space-y-5">
          <Steps model={stepItems} activeIndex={active} readOnly />
          {failure ? <Message severity="error" text={failure} /> : null}

          {active === 0 ? (
            <div className="enrollment-step">
              <h2>Identité de l’élève</h2>
              <div className="schooling-form-grid">
                <label className="field"><span>Prénom *</span><InputText value={form.firstName} onChange={(event) => set("firstName", event.target.value)} /></label>
                <label className="field"><span>Nom *</span><InputText value={form.lastName} onChange={(event) => set("lastName", event.target.value)} /></label>
                <label className="field"><span>Sexe *</span><Dropdown value={form.gender} options={[{ label: "Masculin", value: "male" }, { label: "Féminin", value: "female" }, { label: "Autre", value: "other" }]} onChange={(event) => set("gender", String(event.value))} /></label>
                <label className="field"><span>Date de naissance</span><InputText type="date" value={form.birthDate} onChange={(event) => set("birthDate", event.target.value)} /></label>
                <label className="field"><span>Lieu de naissance</span><InputText value={form.birthPlace} onChange={(event) => set("birthPlace", event.target.value)} /></label>
                <label className="field"><span>Adresse</span><InputText value={form.address} onChange={(event) => set("address", event.target.value)} /></label>
              </div>
              {duplicates.map((item) => (
                <div className="duplicate-row" key={item.id}>
                  <span><strong>{item.fullName}</strong><small>{item.matricule} · {item.birthDate || "Date inconnue"}</small></span>
                  <Button label="Ouvrir la fiche" text onClick={() => void navigate(`/scolarite/eleves/${item.id}`)} />
                </div>
              ))}
            </div>
          ) : null}

          {active === 1 ? (
            <div className="enrollment-step space-y-5">
              <div>
                <h2>Responsable principal</h2>
                <p>Ce responsable est créé avec l’inscription et peut être modifié ensuite.</p>
                <div className="schooling-form-grid">
                  <label className="field"><span>Prénom *</span><InputText value={form.guardianFirstName} onChange={(event) => set("guardianFirstName", event.target.value)} /></label>
                  <label className="field"><span>Nom *</span><InputText value={form.guardianLastName} onChange={(event) => set("guardianLastName", event.target.value)} /></label>
                  <label className="field"><span>Téléphone *</span><InputText value={form.guardianPhone} onChange={(event) => set("guardianPhone", event.target.value)} /></label>
                  <label className="field"><span>Lien</span><Dropdown value={form.guardianRelationship} options={relationshipOptions} onChange={(event) => set("guardianRelationship", String(event.value))} /></label>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div><h3 className="font-semibold text-slate-900">Autres responsables</h3><p className="text-sm text-slate-600">Ajoutez la mère, le père, un tuteur ou un contact d’urgence.</p></div>
                  <Tag value={`${additionalGuardians.length} ajouté${additionalGuardians.length > 1 ? "s" : ""}`} severity="info" />
                </div>
                <div className="guardian-search mb-3">
                  <label className="field"><span>Rechercher un responsable existant</span><span className="p-inputgroup"><InputText value={guardianQuery} onChange={(event) => setGuardianQuery(event.target.value)} placeholder="Nom ou téléphone" /><Button icon="pi pi-search" label="Rechercher" onClick={() => void searchExistingGuardians()} /></span></label>
                  {guardianResults.map((guardian) => <button type="button" className="guardian-result" key={guardian.id} onClick={() => selectAdditionalGuardian(guardian)}><strong>{guardian.first_name} {guardian.last_name}</strong><span>{guardian.primary_phone}</span></button>)}
                </div>
                <div className="schooling-form-grid">
                  <label className="field"><span>Prénom</span><InputText value={guardianDraft.firstName} disabled={Boolean(guardianDraft.guardianId)} onChange={(event) => setGuardianDraft((value) => ({ ...value, firstName: event.target.value }))} /></label>
                  <label className="field"><span>Nom</span><InputText value={guardianDraft.lastName} disabled={Boolean(guardianDraft.guardianId)} onChange={(event) => setGuardianDraft((value) => ({ ...value, lastName: event.target.value }))} /></label>
                  <label className="field"><span>Téléphone</span><InputText value={guardianDraft.phone} disabled={Boolean(guardianDraft.guardianId)} onChange={(event) => setGuardianDraft((value) => ({ ...value, phone: event.target.value }))} /></label>
                  <label className="field"><span>Lien</span><Dropdown value={guardianDraft.relationship} options={relationshipOptions} onChange={(event) => setGuardianDraft((value) => ({ ...value, relationship: String(event.value) }))} /></label>
                </div>
                <div className="guardian-permissions mt-3">
                  {([ ["financial", "Responsable financier"], ["emergency", "Contact d’urgence"] ] as const).map(([key, label]) => <label key={key}><Checkbox checked={guardianDraft[key]} onChange={(event) => setGuardianDraft((value) => ({ ...value, [key]: Boolean(event.checked) }))} /><span>{label}</span></label>)}
                </div>
                <div className="mt-3 flex justify-end"><Button label="Ajouter à l’inscription" icon="pi pi-user-plus" outlined onClick={addAdditionalGuardian} /></div>
                <div className="mt-4 space-y-2">
                  {additionalGuardians.map((guardian, index) => <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3" key={`${guardian.guardianId ?? guardian.phone}-${index}`}><span><strong className="block text-sm">{guardian.firstName} {guardian.lastName}</strong><small>{guardian.phone} · {relationshipOptions.find((item) => item.value === guardian.relationship)?.label}</small></span><Button icon="pi pi-trash" text rounded severity="danger" aria-label="Retirer" onClick={() => setAdditionalGuardians((current) => current.filter((_, currentIndex) => currentIndex !== index))} /></div>)}
                </div>
              </div>
            </div>
          ) : null}

          {active === 2 ? (
            <div className="enrollment-step">
              <h2>Scolarité demandée</h2>
              <div className="schooling-form-grid">
                <label className="field"><span>Cycle et niveau *</span><Dropdown value={form.annualLevelId} options={levelOptions} filter onChange={(event) => set("annualLevelId", String(event.value))} /></label>
                <label className="field"><span>Type de dossier</span><Dropdown value={form.kind} options={[...(policy?.allow_pre_registration ? [{ label: "Préinscription", value: "pre_registered" }] : []), ...(policy?.allow_direct_enrollment ? [{ label: "Inscription confirmée", value: "confirmed" }] : [])]} onChange={(event) => set("kind", String(event.value))} /></label>
              </div>
              {confirmationBlocked ? <Message severity="warn" text="La confirmation directe est bloquée par une règle de l’établissement." /> : null}
            </div>
          ) : null}

          {active === 3 ? (
            <div className="enrollment-step enrollment-summary">
              <h2>Récapitulatif</h2>
              <dl>
                <div><dt>Élève</dt><dd>{form.firstName} {form.lastName}</dd></div>
                <div><dt>Responsables</dt><dd>{1 + additionalGuardians.length}</dd></div>
                <div><dt>Principal</dt><dd>{form.guardianFirstName} {form.guardianLastName} · {form.guardianPhone}</dd></div>
                <div><dt>Niveau</dt><dd>{levelOptions.find((item) => item.value === form.annualLevelId)?.label}</dd></div>
                <div><dt>Statut</dt><dd>{form.kind === "confirmed" ? "Inscription confirmée" : "Préinscription"}</dd></div>
              </dl>
            </div>
          ) : null}

          <footer className="enrollment-actions">
            <span className="dialog-spacer" />
            {active > 0 ? <Button label="Précédent" severity="secondary" outlined onClick={() => setActive((value) => value - 1)} /> : null}
            {active < 3 ? <Button label="Continuer" icon="pi pi-arrow-right" iconPos="right" onClick={() => void next()} /> : <Button label={form.kind === "confirmed" ? "Confirmer l’inscription" : "Enregistrer la préinscription"} icon="pi pi-check" loading={saving} disabled={confirmationBlocked} onClick={() => void submit()} />}
          </footer>
        </div>
      </Card>
    </SchoolingPanel>
  );
}
