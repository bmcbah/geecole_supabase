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
  { label: "Tuteur", value: "guardian" },
  { label: "Autre", value: "other" },
];

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

const controlClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white text-sm shadow-sm transition-colors hover:border-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const fieldClass = "grid min-w-0 gap-1.5";
const labelClass = "text-xs font-semibold text-slate-600";
const sectionClass = "space-y-4";
const sectionTitleClass = "m-0 text-lg font-semibold text-slate-900";
const sectionDescriptionClass = "m-0 text-sm leading-6 text-slate-500";
const formGridClass = "grid gap-4 md:grid-cols-2";

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
  const [additionalGuardians, setAdditionalGuardians] = useState<GuardianLinkInput[]>([]);
  const [additionalQuery, setAdditionalQuery] = useState("");
  const [additionalResults, setAdditionalResults] = useState<Guardian[]>([]);
  const [guardianDraft, setGuardianDraft] = useState<GuardianLinkInput>(
    emptyAdditionalGuardian,
  );
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
      if (active === 1 && (!form.firstName || !form.lastName)) {
        throw new Error("L’identité est incomplète.");
      }
      if (
        active === 2 &&
        (!form.guardianFirstName ||
          !form.guardianLastName ||
          form.guardianPhone.length < 8)
      ) {
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
    setGuardians([]);
    setGuardianQuery(`${guardian.first_name} ${guardian.last_name}`);
  };

  const chooseAdditionalGuardian = (guardian: Guardian) => {
    setGuardianDraft({
      ...emptyAdditionalGuardian,
      guardianId: guardian.id,
      firstName: guardian.first_name,
      lastName: guardian.last_name,
      phone: guardian.primary_phone,
    });
    setAdditionalResults([]);
    setAdditionalQuery(`${guardian.first_name} ${guardian.last_name}`);
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
    const alreadyAdded = additionalGuardians.some(
      (item) =>
        (guardianDraft.guardianId && item.guardianId === guardianDraft.guardianId) ||
        item.phone.trim() === guardianDraft.phone.trim(),
    );
    const sameAsPrimary = guardianDraft.phone.trim() === form.guardianPhone.trim();
    if (alreadyAdded || sameAsPrimary) {
      setFailure("Ce responsable a déjà été ajouté.");
      return;
    }
    setAdditionalGuardians((current) => [...current, guardianDraft]);
    setGuardianDraft(emptyAdditionalGuardian);
    setAdditionalQuery("");
    setFailure("");
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
      await createEnrollment(
        institutionId,
        yearId,
        parsed.data,
        additionalGuardians,
      );
      void navigate("/scolarite/eleves");
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
      path={`Scolarité · ${year?.name ?? "Année scolaire"} · Inscription`}
      title="Inscrire un élève"
      description="Suivez les étapes dans l’ordre pour constituer un dossier complet."
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
      <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-6">
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[760px]">
              <Steps model={stepItems} activeIndex={active} readOnly />
            </div>
          </div>

          {failure ? <Message severity="error" text={failure} /> : null}

          {active === 0 ? (
            <section className={sectionClass}>
              <div>
                <h2 className={sectionTitleClass}>Rechercher avant de créer</h2>
                <p className={sectionDescriptionClass}>
                  Cette vérification évite de recréer un élève déjà connu.
                </p>
              </div>
              <div className={formGridClass}>
                <label className={fieldClass}>
                  <span className={labelClass}>Prénom de l’élève</span>
                  <InputText className={controlClass} value={form.firstName} onChange={(event) => set("firstName", event.target.value)} />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>Nom de l’élève</span>
                  <InputText className={controlClass} value={form.lastName} onChange={(event) => set("lastName", event.target.value)} />
                </label>
              </div>
              {duplicates.length > 0 ? <Message severity="warn" text={`${duplicates.length} dossier(s) ressemblant(s) trouvé(s). Ouvrez la fiche existante avant de créer un doublon.`} /> : null}
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {duplicates.map((item) => (
                  <div className="flex items-center justify-between gap-4 p-3" key={item.id}>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm font-semibold text-slate-900">{item.fullName}</strong>
                      <small className="mt-0.5 block truncate text-xs text-slate-500">{item.matricule} · {item.birthDate || "Date inconnue"}</small>
                    </span>
                    <Button label="Ouvrir la fiche" text onClick={() => void navigate(`/scolarite/eleves/${item.id}`)} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {active === 1 ? (
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>Identité de l’élève</h2>
              <div className={formGridClass}>
                <label className={fieldClass}><span className={labelClass}>Prénom *</span><InputText className={controlClass} value={form.firstName} onChange={(event) => set("firstName", event.target.value)} /></label>
                <label className={fieldClass}><span className={labelClass}>Nom *</span><InputText className={controlClass} value={form.lastName} onChange={(event) => set("lastName", event.target.value)} /></label>
                <label className={fieldClass}><span className={labelClass}>Sexe *</span><Dropdown className={controlClass} value={form.gender} options={[{ label: "Masculin", value: "male" }, { label: "Féminin", value: "female" }, { label: "Autre", value: "other" }]} onChange={(event) => set("gender", String(event.value))} /></label>
                <label className={fieldClass}><span className={labelClass}>Date de naissance</span><InputText className={controlClass} type="date" value={form.birthDate} onChange={(event) => set("birthDate", event.target.value)} /></label>
                <label className={fieldClass}><span className={labelClass}>Lieu de naissance</span><InputText className={controlClass} value={form.birthPlace} onChange={(event) => set("birthPlace", event.target.value)} /></label>
                <label className={fieldClass}><span className={labelClass}>Adresse</span><InputText className={controlClass} value={form.address} onChange={(event) => set("address", event.target.value)} /></label>
              </div>
            </section>
          ) : null}

          {active === 2 ? (
            <section className="space-y-5">
              <div className={sectionClass}>
                <h2 className={sectionTitleClass}>Responsable principal</h2>
                <label className={fieldClass}>
                  <span className={labelClass}>Rechercher par nom ou téléphone</span>
                  <span className="flex min-w-0 flex-col gap-2 sm:flex-row">
                    <InputText className={controlClass} value={guardianQuery} onChange={(event) => setGuardianQuery(event.target.value)} placeholder="Ex. 620 00 00 00" />
                    <Button className="shrink-0" label="Rechercher" icon="pi pi-search" onClick={() => void searchGuardians(institutionId, guardianQuery).then(setGuardians)} />
                  </span>
                </label>
                <div className="grid gap-2">
                  {guardians.map((guardian) => (
                    <button type="button" className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40" key={guardian.id} onClick={() => chooseGuardian(guardian)}>
                      <strong className="text-sm font-semibold text-slate-900">{guardian.first_name} {guardian.last_name}</strong>
                      <span className="text-xs text-slate-500">{guardian.primary_phone}</span>
                    </button>
                  ))}
                </div>
                <Message severity="info" text="Si le responsable existe, sélectionnez-le. Sinon, complétez les champs ci-dessous." />
                <div className={formGridClass}>
                  <label className={fieldClass}><span className={labelClass}>Prénom *</span><InputText className={controlClass} value={form.guardianFirstName} onChange={(event) => set("guardianFirstName", event.target.value)} /></label>
                  <label className={fieldClass}><span className={labelClass}>Nom *</span><InputText className={controlClass} value={form.guardianLastName} onChange={(event) => set("guardianLastName", event.target.value)} /></label>
                  <label className={fieldClass}><span className={labelClass}>Téléphone *</span><InputText className={controlClass} value={form.guardianPhone} onChange={(event) => set("guardianPhone", event.target.value)} /></label>
                  <label className={fieldClass}><span className={labelClass}>Lien avec l’élève</span><Dropdown className={controlClass} value={form.guardianRelationship} options={relationshipOptions} onChange={(event) => set("guardianRelationship", String(event.value))} /></label>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="m-0 text-sm font-semibold text-slate-900">Autres responsables</h3>
                    <p className="mt-1 text-sm text-slate-600">Ajoutez un autre parent, tuteur ou contact.</p>
                  </div>
                  <Tag value={`${additionalGuardians.length} ajouté${additionalGuardians.length > 1 ? "s" : ""}`} severity="info" />
                </div>
                <label className={fieldClass}>
                  <span className={labelClass}>Rechercher par nom ou téléphone</span>
                  <span className="flex min-w-0 flex-col gap-2 sm:flex-row">
                    <InputText className={controlClass} value={additionalQuery} onChange={(event) => setAdditionalQuery(event.target.value)} placeholder="Nom ou téléphone" />
                    <Button className="shrink-0" label="Rechercher" icon="pi pi-search" onClick={() => void searchGuardians(institutionId, additionalQuery).then(setAdditionalResults)} />
                  </span>
                </label>
                <div className="grid gap-2">
                  {additionalResults.map((guardian) => (
                    <button type="button" className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40" key={guardian.id} onClick={() => chooseAdditionalGuardian(guardian)}>
                      <strong className="text-sm font-semibold text-slate-900">{guardian.first_name} {guardian.last_name}</strong>
                      <span className="text-xs text-slate-500">{guardian.primary_phone}</span>
                    </button>
                  ))}
                </div>
                <div className={formGridClass}>
                  <label className={fieldClass}><span className={labelClass}>Prénom</span><InputText className={controlClass} value={guardianDraft.firstName} disabled={Boolean(guardianDraft.guardianId)} onChange={(event) => setGuardianDraft((value) => ({ ...value, firstName: event.target.value }))} /></label>
                  <label className={fieldClass}><span className={labelClass}>Nom</span><InputText className={controlClass} value={guardianDraft.lastName} disabled={Boolean(guardianDraft.guardianId)} onChange={(event) => setGuardianDraft((value) => ({ ...value, lastName: event.target.value }))} /></label>
                  <label className={fieldClass}><span className={labelClass}>Téléphone</span><InputText className={controlClass} value={guardianDraft.phone} disabled={Boolean(guardianDraft.guardianId)} onChange={(event) => setGuardianDraft((value) => ({ ...value, phone: event.target.value }))} /></label>
                  <label className={fieldClass}><span className={labelClass}>Lien avec l’élève</span><Dropdown className={controlClass} value={guardianDraft.relationship} options={relationshipOptions} onChange={(event) => setGuardianDraft((value) => ({ ...value, relationship: String(event.value) }))} /></label>
                </div>
                <div className="flex flex-wrap gap-4">
                  {([["financial", "Responsable financier"], ["emergency", "Contact d’urgence"]] as const).map(([key, label]) => (
                    <label className="flex items-center gap-2 text-sm text-slate-700" key={key}><Checkbox checked={guardianDraft[key]} onChange={(event) => setGuardianDraft((value) => ({ ...value, [key]: Boolean(event.checked) }))} /><span>{label}</span></label>
                  ))}
                </div>
                <div className="flex justify-end"><Button label="Ajouter ce responsable" icon="pi pi-user-plus" outlined onClick={addAdditionalGuardian} /></div>
                <div className="space-y-2">
                  {additionalGuardians.map((guardian, index) => (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3" key={`${guardian.guardianId ?? guardian.phone}-${index}`}>
                      <span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{guardian.firstName} {guardian.lastName}</strong><small className="block truncate text-xs text-slate-500">{guardian.phone} · {relationshipOptions.find((item) => item.value === guardian.relationship)?.label}</small></span>
                      <Button icon="pi pi-trash" text rounded severity="danger" aria-label="Retirer" onClick={() => setAdditionalGuardians((current) => current.filter((_, currentIndex) => currentIndex !== index))} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {active === 3 ? (
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>Scolarité demandée</h2>
              <div className={formGridClass}>
                <label className={fieldClass}><span className={labelClass}>Cycle et niveau *</span><Dropdown className={controlClass} value={form.annualLevelId} options={levelOptions} filter onChange={(event) => set("annualLevelId", String(event.value))} /></label>
                <label className={fieldClass}><span className={labelClass}>Type de dossier</span><Dropdown className={controlClass} value={form.kind} options={[...(policy?.allow_pre_registration ? [{ label: "Préinscription", value: "pre_registered" }] : []), ...(policy?.allow_direct_enrollment ? [{ label: "Inscription confirmée", value: "confirmed" }] : [])]} onChange={(event) => set("kind", String(event.value))} /></label>
              </div>
              {policy?.require_class_assignment ? <Message severity="warn" text="Cet établissement exige une classe. La confirmation sera disponible après la mise en place des classes." /> : null}
            </section>
          ) : null}

          {active === 4 ? (
            <section className={sectionClass}>
              <div><h2 className={sectionTitleClass}>Documents</h2><p className={sectionDescriptionClass}>Cochez uniquement les pièces réellement reçues.</p></div>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {requiredDocuments.map((document) => (
                  <label className="flex items-center gap-3 p-3 text-sm text-slate-700" key={document}><Checkbox checked={documents.includes(document)} onChange={(event) => setDocuments((current) => event.checked ? [...current, document] : current.filter((item) => item !== document))} /><span>{document}</span></label>
                ))}
              </div>
              {!policy?.allow_missing_documents ? <Message severity="warn" text="Toutes les pièces sont obligatoires pour confirmer l’inscription." /> : null}
            </section>
          ) : null}

          {active === 5 ? (
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>Frais applicables</h2>
              <Message severity="info" text="Les frais configurés pour le niveau seront générés au moment de la confirmation dans le prochain lot Finance scolaire." />
              {policy?.require_payment_before_confirmation ? <Message severity="warn" text="Un paiement est obligatoire avant confirmation selon les règles de l’établissement." /> : null}
            </section>
          ) : null}

          {active === 6 ? (
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>Récapitulatif</h2>
              <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {[
                  ["Élève", `${form.firstName} ${form.lastName}`],
                  ["Responsable principal", `${form.guardianFirstName} ${form.guardianLastName} · ${form.guardianPhone}`],
                  ["Autres responsables", String(additionalGuardians.length)],
                  ["Niveau", levelOptions.find((item) => item.value === form.annualLevelId)?.label ?? "—"],
                  ["Documents", `${documents.length}/${requiredDocuments.length} reçus`],
                  ["Statut", form.kind === "confirmed" ? "Inscription confirmée" : "Préinscription"],
                ].map(([label, value]) => (
                  <div className="grid gap-1 p-3 sm:grid-cols-[180px_1fr]" key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="m-0 text-sm font-medium text-slate-900">{value}</dd></div>
                ))}
              </dl>
              {confirmationBlocked ? <Message severity="warn" text="La confirmation est bloquée par une règle de l’établissement. Enregistrez plutôt une préinscription ou complétez les exigences." /> : null}
            </section>
          ) : null}

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
            <Button label="Enregistrer le brouillon" severity="secondary" text disabled />
            <span className="hidden flex-1 sm:block" />
            {active > 0 ? <Button label="Précédent" severity="secondary" outlined onClick={() => setActive((value) => value - 1)} /> : null}
            {active < 6 ? <Button label="Continuer" icon="pi pi-arrow-right" iconPos="right" onClick={() => void next()} /> : <Button label={form.kind === "confirmed" ? "Confirmer l’inscription" : "Enregistrer la préinscription"} icon="pi pi-check" loading={saving} disabled={confirmationBlocked} onClick={() => void submit()} />}
          </footer>
        </div>
      </Card>
    </SchoolingPanel>
  );
}
