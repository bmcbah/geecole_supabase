import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import type { Database } from "../../../shared/lib/supabase/database.types";
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
import type { DuplicateCandidate, EnrollmentInput } from "../types/schooling";

type Guardian = Database["public"]["Tables"]["guardians"]["Row"];
type StepId = "identity" | "guardians" | "schooling" | "review";

type LocalDraft = {
  form: EnrollmentInput;
  additionalGuardians: GuardianLinkInput[];
  documents: string[];
  step: StepId;
  savedAt: string;
};

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

const emptyGuardian: GuardianLinkInput = {
  firstName: "",
  lastName: "",
  phone: "",
  relationship: "guardian",
  primary: false,
  financial: false,
  emergency: false,
};

const relationships = [
  { label: "Père", value: "father" },
  { label: "Mère", value: "mother" },
  { label: "Tuteur", value: "guardian" },
  { label: "Autre", value: "other" },
];

const requiredDocuments = [
  "Extrait de naissance",
  "Photo d’identité",
  "Bulletin précédent",
];

const steps: Array<{ id: StepId; label: string; description: string; icon: string }> = [
  {
    id: "identity",
    label: "Identité",
    description: "Informations de l’élève",
    icon: "pi-user",
  },
  {
    id: "guardians",
    label: "Responsables",
    description: "Contacts et liens familiaux",
    icon: "pi-users",
  },
  {
    id: "schooling",
    label: "Scolarité",
    description: "Niveau, dossier et pièces",
    icon: "pi-graduation-cap",
  },
  {
    id: "review",
    label: "Validation",
    description: "Contrôle avant enregistrement",
    icon: "pi-check-circle",
  },
];

const fieldClass =
  "h-11 w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500";

export function EnrollmentPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [step, setStep] = useState<StepId>("identity");
  const [form, setForm] = useState<EnrollmentInput>(initial);
  const [levels, setLevels] = useState<
    Awaited<ReturnType<typeof listAnnualAcademicLevels>>
  >([]);
  const [policy, setPolicy] = useState<EnrollmentPolicy | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [guardianQuery, setGuardianQuery] = useState("");
  const [guardianResults, setGuardianResults] = useState<Guardian[]>([]);
  const [additionalGuardians, setAdditionalGuardians] = useState<GuardianLinkInput[]>([]);
  const [guardianDraft, setGuardianDraft] = useState<GuardianLinkInput>(emptyGuardian);
  const [documents, setDocuments] = useState<string[]>([]);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const draftKey = useMemo(
    () => `geecole.enrollment-draft.${institutionId}.${yearId}`,
    [institutionId, yearId],
  );

  useEffect(() => {
    if (!institutionId || !yearId) return;

    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try {
        const draft = JSON.parse(raw) as LocalDraft;
        setForm(draft.form);
        setAdditionalGuardians(draft.additionalGuardians ?? []);
        setDocuments(draft.documents ?? []);
        setStep(draft.step ?? "identity");
        setNotice(
          `Brouillon restauré · ${new Intl.DateTimeFormat("fr-FR", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(draft.savedAt))}`,
        );
      } catch {
        localStorage.removeItem(draftKey);
      }
    }

    void Promise.all([
      listAnnualAcademicLevels(yearId),
      getEnrollmentPolicy(institutionId),
    ])
      .then(([levelData, policyData]) => {
        setLevels(levelData);
        setPolicy(policyData);
        setForm((current) => ({
          ...current,
          kind:
            current.kind ||
            (policyData.allow_pre_registration ? "pre_registered" : "confirmed"),
        }));
      })
      .catch(() => setFailure("Impossible de préparer le parcours d’inscription."));
  }, [draftKey, institutionId, yearId]);

  const levelOptions = useMemo(
    () =>
      levels.map((level) => ({
        label: `${level.cycle_name_snapshot} · ${level.level_name_snapshot}`,
        value: level.id,
      })),
    [levels],
  );

  const selectedLevel = levelOptions.find((item) => item.value === form.annualLevelId);
  const currentIndex = steps.findIndex((item) => item.id === step);

  const set = (key: keyof EnrollmentInput, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice("");
  };

  const saveDraft = () => {
    if (!institutionId || !yearId) return;
    const draft: LocalDraft = {
      form,
      additionalGuardians,
      documents,
      step,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
    setFailure("");
    setNotice("Brouillon enregistré sur cet appareil.");
  };

  const clearDraft = () => {
    localStorage.removeItem(draftKey);
    setNotice("");
  };

  const searchDuplicates = async () => {
    if (form.firstName.trim().length < 2 || form.lastName.trim().length < 2) {
      setFailure("Saisissez au moins le prénom et le nom de l’élève.");
      return;
    }
    setFailure("");
    setDuplicates(
      await findDuplicateCandidates(
        institutionId,
        form.firstName,
        form.lastName,
      ),
    );
  };

  const searchExistingGuardians = async () => {
    setGuardianResults(await searchGuardians(institutionId, guardianQuery));
  };

  const chooseGuardian = (guardian: Guardian) => {
    setForm((current) => ({
      ...current,
      guardianFirstName: guardian.first_name,
      guardianLastName: guardian.last_name,
      guardianPhone: guardian.primary_phone,
    }));
    setGuardianQuery(`${guardian.first_name} ${guardian.last_name}`);
    setGuardianResults([]);
  };

  const addGuardian = () => {
    if (
      !guardianDraft.firstName.trim() ||
      !guardianDraft.lastName.trim() ||
      guardianDraft.phone.trim().length < 8
    ) {
      setFailure("Complétez le prénom, le nom et le téléphone du responsable.");
      return;
    }
    if (
      additionalGuardians.some(
        (item) => item.phone.trim() === guardianDraft.phone.trim(),
      ) ||
      guardianDraft.phone.trim() === form.guardianPhone.trim()
    ) {
      setFailure("Ce responsable est déjà lié au dossier.");
      return;
    }
    setAdditionalGuardians((current) => [...current, guardianDraft]);
    setGuardianDraft(emptyGuardian);
    setFailure("");
  };

  const validateStep = () => {
    if (step === "identity") {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        throw new Error("Le prénom et le nom de l’élève sont obligatoires.");
      }
    }
    if (step === "guardians") {
      if (
        !form.guardianFirstName.trim() ||
        !form.guardianLastName.trim() ||
        form.guardianPhone.trim().length < 8
      ) {
        throw new Error("Le responsable principal est incomplet.");
      }
    }
    if (step === "schooling" && !form.annualLevelId) {
      throw new Error("Sélectionnez un niveau.");
    }
  };

  const next = () => {
    setFailure("");
    try {
      validateStep();
      setStep(steps[Math.min(currentIndex + 1, steps.length - 1)].id);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Étape incomplète.");
    }
  };

  const previous = () => {
    setFailure("");
    setStep(steps[Math.max(currentIndex - 1, 0)].id);
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
        "La confirmation est bloquée par une règle de l’établissement. Enregistrez une préinscription ou complétez les exigences.",
      );
      return;
    }

    setSaving(true);
    setFailure("");
    try {
      await createEnrollment(
        institutionId,
        yearId,
        parsed.data,
        additionalGuardians,
      );
      clearDraft();
      void navigate("/scolarite/inscriptions");
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
      className="w-full"
      path={`Scolarité · ${year?.name ?? "Année scolaire"} · Inscription`}
      title="Nouvelle inscription"
      description="Créez le dossier dans un parcours compact. Le brouillon reste disponible sur cet appareil jusqu’à la validation."
      actions={
        <Button
          label="Quitter"
          icon="pi pi-times"
          severity="secondary"
          text
          onClick={() => void navigate("/scolarite/inscriptions")}
        />
      }
    >
      <div className="grid min-h-[680px] overflow-hidden border border-slate-200 bg-white lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50/70 p-5 lg:border-b-0 lg:border-r">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Dossier d’inscription
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Les informations sont organisées par mission, sans multiplier les écrans.
            </p>
          </div>

          <nav className="space-y-1" aria-label="Étapes de l’inscription">
            {steps.map((item, index) => {
              const active = item.id === step;
              const completed = index < currentIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition ${
                    active
                      ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-950"
                  }`}
                  onClick={() => setStep(item.id)}
                >
                  <span
                    className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-md text-xs ${
                      active || completed
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-300 bg-white text-slate-500"
                    }`}
                  >
                    <i className={`pi ${completed ? "pi-check" : item.icon}`} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm font-semibold">{item.label}</strong>
                    <small className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {item.description}
                    </small>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Progression</span>
              <strong className="text-slate-900">
                {currentIndex + 1}/{steps.length}
              </strong>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col">
          <div className="min-h-0 flex-1 p-5 sm:p-7 lg:p-8">
            {failure ? <Message severity="error" text={failure} className="mb-5 w-full" /> : null}
            {notice ? <Message severity="success" text={notice} className="mb-5 w-full" /> : null}

            {step === "identity" ? (
              <section className="max-w-5xl">
                <div className="border-b border-slate-200 pb-5">
                  <h2 className="text-lg font-semibold text-slate-950">Identité de l’élève</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Commencez par vérifier qu’aucun dossier similaire n’existe déjà.
                  </p>
                </div>

                <div className="mt-6 grid gap-x-6 gap-y-5 md:grid-cols-2">
                  <Field label="Prénom *">
                    <InputText className={fieldClass} value={form.firstName} onChange={(event) => set("firstName", event.target.value)} />
                  </Field>
                  <Field label="Nom *">
                    <InputText className={fieldClass} value={form.lastName} onChange={(event) => set("lastName", event.target.value)} />
                  </Field>
                  <Field label="Sexe *">
                    <Dropdown className={fieldClass} value={form.gender} options={[{ label: "Masculin", value: "male" }, { label: "Féminin", value: "female" }, { label: "Autre", value: "other" }]} onChange={(event) => set("gender", String(event.value))} />
                  </Field>
                  <Field label="Date de naissance">
                    <InputText className={fieldClass} type="date" value={form.birthDate} onChange={(event) => set("birthDate", event.target.value)} />
                  </Field>
                  <Field label="Lieu de naissance">
                    <InputText className={fieldClass} value={form.birthPlace} onChange={(event) => set("birthPlace", event.target.value)} />
                  </Field>
                  <Field label="Adresse">
                    <InputText className={fieldClass} value={form.address} onChange={(event) => set("address", event.target.value)} />
                  </Field>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
                  <Button label="Rechercher les doublons" icon="pi pi-search" outlined onClick={() => void searchDuplicates()} />
                  <span className="text-sm text-slate-500">Recherche par prénom et nom dans l’établissement.</span>
                </div>

                {duplicates.length ? (
                  <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
                    {duplicates.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                        <div>
                          <strong className="block text-sm text-slate-900">{item.fullName}</strong>
                          <span className="text-xs text-slate-500">{item.matricule} · {item.birthDate || "Date inconnue"}</span>
                        </div>
                        <Button label="Ouvrir" icon="pi pi-arrow-right" text onClick={() => void navigate(`/scolarite/eleves/${item.id}`)} />
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {step === "guardians" ? (
              <section className="max-w-5xl space-y-8">
                <div className="border-b border-slate-200 pb-5">
                  <h2 className="text-lg font-semibold text-slate-950">Responsables de l’élève</h2>
                  <p className="mt-1 text-sm text-slate-500">Recherchez d’abord un contact existant avant d’en créer un nouveau.</p>
                </div>

                <div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <InputText className={fieldClass} value={guardianQuery} placeholder="Nom ou téléphone" onChange={(event) => setGuardianQuery(event.target.value)} />
                    <Button label="Rechercher" icon="pi pi-search" onClick={() => void searchExistingGuardians()} />
                  </div>
                  {guardianResults.length ? (
                    <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
                      {guardianResults.map((guardian) => (
                        <button key={guardian.id} type="button" className="flex w-full items-center justify-between py-3 text-left hover:bg-slate-50" onClick={() => chooseGuardian(guardian)}>
                          <span><strong className="block text-sm text-slate-900">{guardian.first_name} {guardian.last_name}</strong><small className="text-xs text-slate-500">{guardian.primary_phone}</small></span>
                          <i className="pi pi-chevron-right text-xs text-slate-400" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                  <Field label="Prénom du responsable *"><InputText className={fieldClass} value={form.guardianFirstName} onChange={(event) => set("guardianFirstName", event.target.value)} /></Field>
                  <Field label="Nom du responsable *"><InputText className={fieldClass} value={form.guardianLastName} onChange={(event) => set("guardianLastName", event.target.value)} /></Field>
                  <Field label="Téléphone *"><InputText className={fieldClass} value={form.guardianPhone} onChange={(event) => set("guardianPhone", event.target.value)} /></Field>
                  <Field label="Lien avec l’élève"><Dropdown className={fieldClass} value={form.guardianRelationship} options={relationships} onChange={(event) => set("guardianRelationship", String(event.value))} /></Field>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><h3 className="text-base font-semibold text-slate-950">Autres responsables</h3><p className="mt-1 text-sm text-slate-500">Ajoutez les autres parents ou contacts utiles.</p></div>
                    <Tag value={`${additionalGuardians.length} ajouté(s)`} severity="secondary" />
                  </div>
                  <div className="mt-5 grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Prénom"><InputText className={fieldClass} value={guardianDraft.firstName} onChange={(event) => setGuardianDraft((current) => ({ ...current, firstName: event.target.value }))} /></Field>
                    <Field label="Nom"><InputText className={fieldClass} value={guardianDraft.lastName} onChange={(event) => setGuardianDraft((current) => ({ ...current, lastName: event.target.value }))} /></Field>
                    <Field label="Téléphone"><InputText className={fieldClass} value={guardianDraft.phone} onChange={(event) => setGuardianDraft((current) => ({ ...current, phone: event.target.value }))} /></Field>
                    <Field label="Lien"><Dropdown className={fieldClass} value={guardianDraft.relationship} options={relationships} onChange={(event) => setGuardianDraft((current) => ({ ...current, relationship: String(event.value) }))} /></Field>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-5">
                    <ToggleLabel label="Responsable financier" checked={guardianDraft.financial} onChange={(checked) => setGuardianDraft((current) => ({ ...current, financial: checked }))} />
                    <ToggleLabel label="Contact d’urgence" checked={guardianDraft.emergency} onChange={(checked) => setGuardianDraft((current) => ({ ...current, emergency: checked }))} />
                    <Button label="Ajouter" icon="pi pi-user-plus" outlined onClick={addGuardian} />
                  </div>
                  {additionalGuardians.length ? (
                    <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
                      {additionalGuardians.map((guardian, index) => (
                        <div key={`${guardian.phone}-${index}`} className="flex items-center justify-between gap-4 py-3">
                          <div><strong className="block text-sm text-slate-900">{guardian.firstName} {guardian.lastName}</strong><span className="text-xs text-slate-500">{guardian.phone} · {relationships.find((item) => item.value === guardian.relationship)?.label}</span></div>
                          <Button icon="pi pi-trash" text rounded severity="danger" aria-label="Retirer" onClick={() => setAdditionalGuardians((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {step === "schooling" ? (
              <section className="max-w-5xl">
                <div className="border-b border-slate-200 pb-5"><h2 className="text-lg font-semibold text-slate-950">Scolarité demandée</h2><p className="mt-1 text-sm text-slate-500">Définissez le niveau et l’état initial du dossier.</p></div>
                <div className="mt-6 grid gap-x-6 gap-y-5 md:grid-cols-2">
                  <Field label="Cycle et niveau *"><Dropdown className={fieldClass} value={form.annualLevelId} options={levelOptions} filter placeholder="Sélectionner un niveau" onChange={(event) => set("annualLevelId", String(event.value ?? ""))} /></Field>
                  <Field label="Type de dossier"><Dropdown className={fieldClass} value={form.kind} options={[...(policy?.allow_pre_registration ? [{ label: "Préinscription", value: "pre_registered" }] : []), ...(policy?.allow_direct_enrollment ? [{ label: "Inscription confirmée", value: "confirmed" }] : [])]} onChange={(event) => set("kind", String(event.value))} /></Field>
                </div>
                <div className="mt-8 border-t border-slate-200 pt-6"><div className="flex items-center justify-between"><div><h3 className="text-base font-semibold text-slate-950">Documents reçus</h3><p className="mt-1 text-sm text-slate-500">Cochez uniquement les pièces réellement remises.</p></div><Tag value={`${documents.length}/${requiredDocuments.length}`} severity="secondary" /></div><div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">{requiredDocuments.map((document) => <label key={document} className="flex cursor-pointer items-center justify-between gap-4 py-3"><span className="text-sm font-medium text-slate-800">{document}</span><Checkbox checked={documents.includes(document)} onChange={(event) => setDocuments((current) => event.checked ? [...current, document] : current.filter((item) => item !== document))} /></label>)}</div></div>
              </section>
            ) : null}

            {step === "review" ? (
              <section className="max-w-5xl">
                <div className="border-b border-slate-200 pb-5"><h2 className="text-lg font-semibold text-slate-950">Vérification du dossier</h2><p className="mt-1 text-sm text-slate-500">Contrôlez les informations avant l’enregistrement dans Supabase.</p></div>
                <dl className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
                  <Summary label="Élève" value={`${form.firstName || "—"} ${form.lastName || ""}`} />
                  <Summary label="Responsable principal" value={form.guardianFirstName ? `${form.guardianFirstName} ${form.guardianLastName} · ${form.guardianPhone}` : "Non renseigné"} />
                  <Summary label="Niveau" value={selectedLevel?.label ?? "Non sélectionné"} />
                  <Summary label="Documents" value={`${documents.length}/${requiredDocuments.length} reçu(s)`} />
                  <Summary label="État initial" value={form.kind === "confirmed" ? "Inscription confirmée" : "Préinscription"} />
                </dl>
                {confirmationBlocked ? <Message className="mt-5 w-full" severity="warn" text="La confirmation directe est bloquée par une règle de l’établissement. Choisissez la préinscription ou complétez les exigences." /> : null}
              </section>
            ) : null}
          </div>

          <footer className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7 lg:px-8">
            <Button label="Enregistrer le brouillon" icon="pi pi-save" severity="secondary" outlined onClick={saveDraft} />
            <span className="flex-1" />
            {currentIndex > 0 ? <Button label="Précédent" severity="secondary" text onClick={previous} /> : null}
            {step !== "review" ? <Button label="Continuer" icon="pi pi-arrow-right" iconPos="right" onClick={next} /> : <Button label={form.kind === "confirmed" ? "Confirmer l’inscription" : "Enregistrer la préinscription"} icon="pi pi-check" loading={saving} disabled={confirmationBlocked} onClick={() => void submit()} />}
          </footer>
        </main>
      </div>
    </SchoolingPanel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}

function ToggleLabel({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"><Checkbox checked={checked} onChange={(event) => onChange(Boolean(event.checked))} /><span>{label}</span></label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-2 py-4 sm:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm font-medium text-slate-500">{label}</dt><dd className="m-0 text-sm font-semibold text-slate-900">{value}</dd></div>;
}
