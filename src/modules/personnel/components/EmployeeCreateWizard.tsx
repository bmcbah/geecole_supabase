import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Steps } from "primereact/steps";
import type { CompensationMode, Employee } from "../domain/personnel";
import type {
  CatalogItem,
  CreateEmployeeInput,
} from "../services/personnel.service";
import { createEmployee } from "../services/personnel.service";

type Props = {
  visible: boolean;
  institutionId: string;
  catalogs: CatalogItem[];
  onHide: () => void;
  onCreated: (employee: Employee) => void;
  notify: (message: {
    severity: "success" | "error";
    summary: string;
    detail?: string;
  }) => void;
};
const today = () => new Date().toISOString().slice(0, 10);
const initial = {
  first_name: "",
  last_name: "",
  gender: "",
  birth_date: "",
  birth_place: "",
  nationality: "Guinéenne",
  phone: "",
  secondary_phone: "",
  email: "",
  address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  identity_type: "",
  identity_number: "",
  identity_expires_on: "",
  hired_on: today(),
  function_item_id: "",
  responsibility: "",
  contract_type_item_id: "",
  compensation_mode: "" as CompensationMode | "",
  fixed_amount: 0,
  hourly_rate: 0,
  weekly_hours: 0,
  session_rate: 0,
  notes: "",
};
const modeOptions = [
  { value: "fixed", label: "Salaire mensuel fixe" },
  { value: "hourly", label: "Taux horaire" },
  { value: "session", label: "Par séance" },
  { value: "flat_rate", label: "Forfait" },
  { value: "mixed", label: "Fixe + heures" },
  { value: "unpaid", label: "Non rémunéré" },
];

export function EmployeeCreateWizard({
  visible,
  institutionId,
  catalogs,
  onHide,
  onCreated,
  notify,
}: Props) {
  const [active, setActive] = useState(0);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const catalogOptions = (category: string) =>
    catalogs
      .filter((x) => x.category === category && x.is_active)
      .map((x) => ({ value: x.id, label: x.local_label || x.default_label }));
  const canContinue = useMemo(
    () =>
      active === 0
        ? Boolean(
            form.first_name.trim() && form.last_name.trim() && form.hired_on,
          )
        : active === 1
          ? Boolean(form.phone.trim() || form.email.trim())
          : active === 2
            ? Boolean(form.function_item_id)
            : true,
    [active, form],
  );
  const close = () => {
    setActive(0);
    setForm({ ...initial, hired_on: today() });
    setFailure("");
    onHide();
  };
  const submit = async () => {
    setSaving(true);
    setFailure("");
    try {
      if (
        ["hourly", "mixed"].includes(form.compensation_mode) &&
        (form.hourly_rate <= 0 || form.weekly_hours <= 0)
      ) {
        throw new Error(
          "Le taux horaire de base et les heures prévues sont obligatoires.",
        );
      }
      const payload: CreateEmployeeInput = {
        ...form,
        institution_id: institutionId,
        gender: form.gender || null,
        birth_date: form.birth_date || null,
        identity_expires_on: form.identity_expires_on || null,
        function_item_id: form.function_item_id || undefined,
        contract_type_item_id: form.contract_type_item_id || undefined,
        compensation_mode: form.compensation_mode || undefined,
      };
      const employee = await createEmployee(payload);
      notify({
        severity: "success",
        summary: "Personnel ajouté",
        detail: `Le matricule ${employee.employee_number} a été généré automatiquement.`,
      });
      onCreated(employee);
      close();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erreur inconnue";
      setFailure(detail);
      notify({ severity: "error", summary: "Création impossible", detail });
    } finally {
      setSaving(false);
    }
  };
  const moneyField =
    form.compensation_mode === "hourly"
      ? (["hourly_rate", "Taux horaire propre à l’employé"] as const)
      : form.compensation_mode === "session"
        ? (["session_rate", "Taux par séance"] as const)
        : ([
            "fixed_amount",
            form.compensation_mode === "mixed"
              ? "Salaire fixe"
              : "Montant fixe",
          ] as const);
  return (
    <Dialog
      header="Ajouter un membre du personnel"
      visible={visible}
      modal
      className="personnel-form-dialog w-[min(96vw,58rem)]"
      onHide={close}
      contentClassName="pt-2"
    >
      <Steps
        model={[
          { label: "Identité" },
          { label: "Contacts" },
          { label: "Emploi" },
          { label: "Vérification" },
        ]}
        activeIndex={active}
        readOnly
        className="mb-6"
      />
      {failure && (
        <Message severity="error" text={failure} className="mb-4 w-full" />
      )}
      {active === 0 && (
        <section className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900">
              Identité administrative
            </h3>
            <p className="text-sm text-slate-500">
              Le matricule sera généré automatiquement à l’enregistrement.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Prénoms *">
              <InputText
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
              />
            </Field>
            <Field label="Nom *">
              <InputText
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
              />
            </Field>
            <Field label="Sexe">
              <Dropdown
                value={form.gender}
                options={[
                  { value: "male", label: "Masculin" },
                  { value: "female", label: "Féminin" },
                  { value: "other", label: "Autre" },
                ]}
                showClear
                onChange={(e) => set("gender", e.value || "")}
              />
            </Field>
            <Field label="Date de naissance">
              <InputText
                type="date"
                value={form.birth_date}
                onChange={(e) => set("birth_date", e.target.value)}
              />
            </Field>
            <Field label="Lieu de naissance">
              <InputText
                value={form.birth_place}
                onChange={(e) => set("birth_place", e.target.value)}
              />
            </Field>
            <Field label="Nationalité">
              <InputText
                value={form.nationality}
                onChange={(e) => set("nationality", e.target.value)}
              />
            </Field>
          </div>
        </section>
      )}
      {active === 1 && (
        <section className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900">
              Coordonnées et sécurité
            </h3>
            <p className="text-sm text-slate-500">
              Un téléphone ou un e-mail est requis. La création d’un accès
              restera une action séparée.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Téléphone principal *">
              <InputText
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
            <Field label="Téléphone secondaire">
              <InputText
                value={form.secondary_phone}
                onChange={(e) => set("secondary_phone", e.target.value)}
              />
            </Field>
            <Field label="E-mail">
              <InputText
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="Adresse">
              <InputText
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </Field>
            <Field label="Contact d’urgence">
              <InputText
                value={form.emergency_contact_name}
                onChange={(e) => set("emergency_contact_name", e.target.value)}
              />
            </Field>
            <Field label="Téléphone d’urgence">
              <InputText
                value={form.emergency_contact_phone}
                onChange={(e) => set("emergency_contact_phone", e.target.value)}
              />
            </Field>
            <Field label="Type de pièce">
              <InputText
                value={form.identity_type}
                onChange={(e) => set("identity_type", e.target.value)}
              />
            </Field>
            <Field label="Numéro de pièce">
              <InputText
                value={form.identity_number}
                onChange={(e) => set("identity_number", e.target.value)}
              />
            </Field>
          </div>
        </section>
      )}
      {active === 2 && (
        <section className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900">
              Fonction et rémunération initiales
            </h3>
            <p className="text-sm text-slate-500">
              Le contrat est facultatif et pourra être complété depuis la fiche.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Date d’entrée *">
              <InputText
                type="date"
                value={form.hired_on}
                onChange={(e) => set("hired_on", e.target.value)}
              />
            </Field>
            <Field label="Fonction principale *">
              <Dropdown
                value={form.function_item_id}
                options={catalogOptions("function")}
                placeholder="Choisir une fonction"
                onChange={(e) => set("function_item_id", e.value)}
              />
            </Field>
            <Field label="Responsabilité">
              <InputText
                value={form.responsibility}
                onChange={(e) => set("responsibility", e.target.value)}
              />
            </Field>
            <Field label="Type de contrat">
              <Dropdown
                value={form.contract_type_item_id}
                options={catalogOptions("contract_type")}
                showClear
                placeholder="À compléter plus tard"
                onChange={(e) => set("contract_type_item_id", e.value || "")}
              />
            </Field>
            <Field label="Mode de rémunération">
              <Dropdown
                value={form.compensation_mode}
                options={modeOptions}
                showClear
                placeholder="Aucun contrat pour l’instant"
                onChange={(e) => set("compensation_mode", e.value || "")}
              />
            </Field>
            {form.compensation_mode && form.compensation_mode !== "unpaid" && (
              <Field label={moneyField[1]}>
                <InputNumber
                  value={form[moneyField[0]]}
                  min={0}
                  mode="currency"
                  currency="GNF"
                  locale="fr-GN"
                  onValueChange={(e) => set(moneyField[0], e.value || 0)}
                />
              </Field>
            )}
            {form.compensation_mode === "mixed" && (
              <Field label="Taux horaire de base">
                <InputNumber
                  value={form.hourly_rate}
                  min={0}
                  mode="currency"
                  currency="GNF"
                  locale="fr-GN"
                  onValueChange={(e) => set("hourly_rate", e.value || 0)}
                />
              </Field>
            )}
            {["hourly", "mixed"].includes(form.compensation_mode) && (
              <Field label="Heures hebdomadaires prévues">
                <InputNumber
                  value={form.weekly_hours}
                  min={0.5}
                  max={168}
                  maxFractionDigits={2}
                  onValueChange={(e) => set("weekly_hours", e.value || 0)}
                />
              </Field>
            )}
          </div>
        </section>
      )}
      {active === 3 && (
        <section className="space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900">
              Vérifier avant d’enregistrer
            </h3>
            <p className="text-sm text-slate-500">
              La fiche pourra être enrichie après sa création.
            </p>
          </div>
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
            <Summary
              label="Personnel"
              value={`${form.first_name} ${form.last_name}`}
            />
            <Summary label="Contact" value={form.phone || form.email} />
            <Summary
              label="Fonction"
              value={
                catalogOptions("function").find(
                  (x) => x.value === form.function_item_id,
                )?.label || "—"
              }
            />
            <Summary
              label="Rémunération"
              value={
                modeOptions.find((x) => x.value === form.compensation_mode)
                  ?.label || "À définir"
              }
            />
          </div>
          <Message
            severity="info"
            text="Aucun compte d’accès ne sera créé automatiquement."
          />
        </section>
      )}
      <div className="mt-7 flex items-center justify-between border-t border-slate-200 pt-4">
        <Button label="Annuler" severity="secondary" text onClick={close} />
        <div className="flex gap-2">
          {active > 0 && (
            <Button
              label="Précédent"
              icon="pi pi-arrow-left"
              severity="secondary"
              outlined
              onClick={() => setActive((x) => x - 1)}
            />
          )}
          {active < 3 ? (
            <Button
              label="Continuer"
              icon="pi pi-arrow-right"
              iconPos="right"
              disabled={!canContinue}
              onClick={() => setActive((x) => x + 1)}
            />
          ) : (
            <Button
              label="Créer la fiche"
              icon="pi pi-check"
              loading={saving}
              onClick={() => void submit()}
            />
          )}
        </div>
      </div>
    </Dialog>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <span className="[&>*]:w-full">{children}</span>
    </label>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <strong className="text-sm text-slate-900">{value || "—"}</strong>
    </div>
  );
}
