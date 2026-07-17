import { useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Steps } from "primereact/steps";
import { Message } from "primereact/message";
import { enrollmentSchema } from "../schemas/enrollment.schema";
import {
  createEnrollment,
  findDuplicateCandidates,
} from "../services/schooling.service";
import type { DuplicateCandidate, EnrollmentInput } from "../types/schooling";

interface Props {
  visible: boolean;
  institutionId: string;
  yearId: string;
  levels: {
    id: string;
    level_name_snapshot: string;
    cycle_name_snapshot: string;
  }[];
  onHide: () => void;
  onSaved: () => void;
}
const empty: EnrollmentInput = {
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
const steps = [
  { label: "Élève" },
  { label: "Responsable" },
  { label: "Scolarité" },
  { label: "Récapitulatif" },
];

export function EnrollmentDialog({
  visible,
  institutionId,
  yearId,
  levels,
  onHide,
  onSaved,
}: Props) {
  const [active, setActive] = useState(0);
  const [form, setForm] = useState<EnrollmentInput>(empty);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  const levelOptions = useMemo(
    () =>
      levels.map((level) => ({
        label: `${level.cycle_name_snapshot} · ${level.level_name_snapshot}`,
        value: level.id,
      })),
    [levels],
  );
  const selectedLevel = levelOptions.find(
    (item) => item.value === form.annualLevelId,
  )?.label;
  const set = (field: keyof EnrollmentInput, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const close = () => {
    setActive(0);
    setForm(empty);
    setDuplicates([]);
    setFailure("");
    onHide();
  };
  const next = async () => {
    setFailure("");
    if (active === 0) {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setFailure("Le nom et le prénom sont obligatoires.");
        return;
      }
      try {
        setDuplicates(
          await findDuplicateCandidates(
            institutionId,
            form.firstName,
            form.lastName,
          ),
        );
      } catch {
        setFailure("La recherche de doublons a échoué.");
        return;
      }
    }
    if (
      active === 1 &&
      (!form.guardianFirstName ||
        !form.guardianLastName ||
        form.guardianPhone.length < 8)
    ) {
      setFailure("Renseignez le responsable principal et son téléphone.");
      return;
    }
    if (active === 2 && !form.annualLevelId) {
      setFailure("Sélectionnez le niveau demandé.");
      return;
    }
    setActive((value) => Math.min(3, value + 1));
  };
  const save = async () => {
    const parsed = enrollmentSchema.safeParse(form);
    if (!parsed.success) {
      setFailure(parsed.error.issues[0]?.message ?? "Dossier incomplet");
      return;
    }
    setSaving(true);
    setFailure("");
    try {
      await createEnrollment(institutionId, yearId, parsed.data);
      close();
      onSaved();
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer l'inscription.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      header="Nouvelle inscription"
      visible={visible}
      onHide={close}
      className="enrollment-dialog"
      dismissableMask={false}
    >
      <Steps model={steps} activeIndex={active} readOnly />
      {failure && (
        <Message
          severity="error"
          text={failure}
          className="schooling-message"
        />
      )}
      {active === 0 && (
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
          <label className="field field-wide">
            <span>Adresse</span>
            <InputText
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </label>
        </div>
      )}
      {active === 1 && (
        <div className="schooling-form-grid">
          {duplicates.length > 0 && (
            <Message
              severity="warn"
              text={`${duplicates.length} dossier(s) ressemblant(s) trouvé(s). Vérifiez avant de continuer.`}
              className="field-wide"
            />
          )}
          <label className="field">
            <span>Prénom du responsable *</span>
            <InputText
              value={form.guardianFirstName}
              onChange={(e) => set("guardianFirstName", e.target.value)}
            />
          </label>
          <label className="field">
            <span>Nom du responsable *</span>
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
            <span>Lien avec l’élève</span>
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
      )}
      {active === 2 && (
        <div className="schooling-form-grid">
          <label className="field field-wide">
            <span>Cycle et niveau *</span>
            <Dropdown
              value={form.annualLevelId}
              options={levelOptions}
              placeholder="Sélectionner"
              filter
              onChange={(e) => set("annualLevelId", String(e.value))}
            />
          </label>
          <label className="field field-wide">
            <span>Type d’enregistrement</span>
            <Dropdown
              value={form.kind}
              options={[
                { label: "Préinscription", value: "pre_registered" },
                { label: "Inscription confirmée", value: "confirmed" },
              ]}
              onChange={(e) => set("kind", String(e.value))}
            />
          </label>
        </div>
      )}
      {active === 3 && (
        <div className="enrollment-summary">
          <h3>Vérifiez avant de confirmer</h3>
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
              <dt>Scolarité</dt>
              <dd>{selectedLevel}</dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>
                {form.kind === "confirmed"
                  ? "Confirmer l’inscription"
                  : "Enregistrer la préinscription"}
              </dd>
            </div>
          </dl>
        </div>
      )}
      <div className="dialog-actions">
        <Button label="Annuler" severity="secondary" text onClick={close} />
        <span className="dialog-spacer" />
        {active > 0 && (
          <Button
            label="Précédent"
            severity="secondary"
            outlined
            onClick={() => setActive((value) => value - 1)}
          />
        )}
        {active < 3 ? (
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
            onClick={() => void save()}
          />
        )}
      </div>
    </Dialog>
  );
}
