import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Message } from "primereact/message";
import { MultiSelect } from "primereact/multiselect";
import type { AppRole } from "../../../shared/lib/supabase/database.types";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import {
  getPedagogicalSettings,
  savePedagogicalSettings,
} from "../services/pedagogical-settings.service";

const roleOptions: { label: string; value: AppRole }[] = [
  { label: "Propriétaire", value: "owner" },
  { label: "Administrateur", value: "admin" },
  { label: "Secrétariat", value: "secretary" },
  { label: "Enseignant", value: "teacher" },
];

const defaults = {
  appreciations_required: false,
  ranking_displayed: true,
  coefficients_displayed: true,
  average_decimal_places: 2,
  notifications_enabled: true,
  multiple_teachers_enabled: false,
  validation_roles: ["owner", "admin"] as AppRole[],
  publication_roles: ["owner", "admin"] as AppRole[],
  bulletin_title: "Bulletin scolaire",
  bulletin_orientation: "portrait",
  bulletin_show_rank: true,
  bulletin_show_appreciations: true,
  bulletin_teacher_signature_label: "Enseignant principal",
  bulletin_direction_signature_label: "Direction",
  bulletin_footer: "",
};

export function PedagogicalSettingsPanel() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [value, setValue] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const editable = Boolean(
    year && !["closed", "archived"].includes(year.status),
  );
  const load = useCallback(async () => {
    if (!year) return;
    try {
      const stored = await getPedagogicalSettings(institutionId, year.id);
      if (stored) setValue({ ...defaults, ...stored });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Chargement impossible.",
      );
    }
  }, [institutionId, year]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!year)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  async function submit() {
    setSaving(true);
    try {
      await savePedagogicalSettings(institutionId, year!.id, value);
      notify({
        severity: "success",
        summary: "Paramètres pédagogiques enregistrés",
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="space-y-3">
      <PageHeader
        headingAs="h2"
        compact
        title="Paramètres pédagogiques"
        description="Règles transverses appliquées aux notes, moyennes et bulletins."
      />
      {error ? <Message severity="error" text={error} /> : null}
      <Accordion
        multiple
        activeIndex={[0]}
        className="pedagogical-settings-accordion"
      >
        <AccordionTab header="Notes et calculs">
          <div className="px-1 pb-1">
            <Toggle
              label="Appréciations obligatoires"
              checked={value.appreciations_required}
              onChange={(checked) =>
                setValue((current) => ({
                  ...current,
                  appreciations_required: checked,
                }))
              }
            />
            <Toggle
              label="Afficher le classement"
              checked={value.ranking_displayed}
              onChange={(checked) =>
                setValue((current) => ({
                  ...current,
                  ranking_displayed: checked,
                }))
              }
            />
            <Toggle
              label="Afficher les coefficients"
              checked={value.coefficients_displayed}
              onChange={(checked) =>
                setValue((current) => ({
                  ...current,
                  coefficients_displayed: checked,
                }))
              }
            />
            <Toggle
              label="Autoriser plusieurs enseignants par cours"
              checked={value.multiple_teachers_enabled}
              onChange={(checked) =>
                setValue((current) => ({
                  ...current,
                  multiple_teachers_enabled: checked,
                }))
              }
            />
            <label className="field mt-3">
              <span>Décimales des moyennes</span>
              <InputNumber
                value={value.average_decimal_places}
                min={0}
                max={4}
                showButtons
                onValueChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    average_decimal_places: event.value ?? 2,
                  }))
                }
              />
            </label>
          </div>
        </AccordionTab>
        <AccordionTab header="Validation et publication">
          <div className="px-1 pb-1">
            <label className="field">
              <span>Profils autorisés à valider</span>
              <MultiSelect
                value={value.validation_roles}
                options={roleOptions}
                display="chip"
                className="w-full"
                onChange={(event) => {
                  const roles: unknown = event.value;
                  if (Array.isArray(roles))
                    setValue((current) => ({
                      ...current,
                      validation_roles: roles.filter(
                        (role): role is AppRole =>
                          typeof role === "string" &&
                          roleOptions.some((option) => option.value === role),
                      ),
                    }));
                }}
              />
            </label>
            <label className="field mt-3">
              <span>Profils autorisés à publier</span>
              <MultiSelect
                value={value.publication_roles}
                options={roleOptions}
                display="chip"
                className="w-full"
                onChange={(event) => {
                  const roles: unknown = event.value;
                  if (Array.isArray(roles))
                    setValue((current) => ({
                      ...current,
                      publication_roles: roles.filter(
                        (role): role is AppRole =>
                          typeof role === "string" &&
                          roleOptions.some((option) => option.value === role),
                      ),
                    }));
                }}
              />
            </label>
            <Toggle
              label="Notifications pédagogiques"
              checked={value.notifications_enabled}
              onChange={(checked) =>
                setValue((current) => ({
                  ...current,
                  notifications_enabled: checked,
                }))
              }
            />
          </div>
        </AccordionTab>
        <AccordionTab header="Format du bulletin">
          <div className="px-1 pb-1">
            <label className="field">
              <span>Titre</span>
              <InputText
                value={value.bulletin_title}
                onChange={(e) =>
                  setValue((current) => ({
                    ...current,
                    bulletin_title: e.target.value,
                  }))
                }
              />
            </label>
            <label className="field mt-3">
              <span>Orientation</span>
              <Dropdown
                value={value.bulletin_orientation}
                options={[
                  { label: "Portrait", value: "portrait" },
                  { label: "Paysage", value: "landscape" },
                ]}
                onChange={(e) =>
                  setValue((current) => ({
                    ...current,
                    bulletin_orientation: String(e.value),
                  }))
                }
              />
            </label>
            <Toggle
              label="Afficher le classement"
              checked={value.bulletin_show_rank}
              onChange={(checked) =>
                setValue((current) => ({
                  ...current,
                  bulletin_show_rank: checked,
                }))
              }
            />
            <Toggle
              label="Afficher les appréciations"
              checked={value.bulletin_show_appreciations}
              onChange={(checked) =>
                setValue((current) => ({
                  ...current,
                  bulletin_show_appreciations: checked,
                }))
              }
            />
            <label className="field mt-3">
              <span>Signature enseignant</span>
              <InputText
                value={value.bulletin_teacher_signature_label}
                onChange={(e) =>
                  setValue((current) => ({
                    ...current,
                    bulletin_teacher_signature_label: e.target.value,
                  }))
                }
              />
            </label>
            <label className="field mt-3">
              <span>Signature direction</span>
              <InputText
                value={value.bulletin_direction_signature_label}
                onChange={(e) =>
                  setValue((current) => ({
                    ...current,
                    bulletin_direction_signature_label: e.target.value,
                  }))
                }
              />
            </label>
            <label className="field mt-3">
              <span>Pied de page</span>
              <InputText
                value={value.bulletin_footer}
                onChange={(e) =>
                  setValue((current) => ({
                    ...current,
                    bulletin_footer: e.target.value,
                  }))
                }
              />
            </label>
          </div>
        </AccordionTab>
      </Accordion>
      <div className="flex justify-end">
        <Button
          label="Enregistrer"
          icon="pi pi-check"
          loading={saving}
          disabled={!editable}
          onClick={() => void submit()}
        />
      </div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 text-sm text-slate-700">
      <span>{label}</span>
      <InputSwitch
        checked={checked}
        onChange={(event) => onChange(Boolean(event.value))}
      />
    </label>
  );
}
