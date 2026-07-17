import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { Message } from "primereact/message";
import { useToast } from "../../../shared/components/toast-context";
import {
  getReenrollmentPolicy,
  saveReenrollmentPolicy,
  type ReenrollmentPolicy,
} from "../services/reenrollment.service";

export function ReenrollmentPolicyPanel({
  institutionId,
}: {
  institutionId: string;
}) {
  const notify = useToast();
  const [policy, setPolicy] = useState<ReenrollmentPolicy | null>(null);
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void getReenrollmentPolicy(institutionId)
      .then(setPolicy)
      .catch(() =>
        setFailure("Impossible de charger les règles de réinscription."),
      );
  }, [institutionId]);
  if (failure) return <Message severity="error" text={failure} />;
  if (!policy) return null;
  const change = (key: keyof ReenrollmentPolicy, value: boolean | string) =>
    setPolicy((current) => (current ? { ...current, [key]: value } : current));
  const switches = [
    [
      "allow_early_preparation",
      "Préparer avant l’ouverture de l’année",
      "Autorise les réinscriptions vers une année en préparation.",
    ],
    [
      "allow_direct_confirmation",
      "Autoriser la confirmation directe",
      "Sinon la réinscription passe d’abord par le statut préinscrit.",
    ],
    [
      "require_academic_decision",
      "Exiger la décision scolaire",
      "Promotion, redoublement ou passage exceptionnel.",
    ],
    [
      "allow_decision_override",
      "Autoriser une dérogation",
      "Un responsable habilité peut corriger la proposition avec un motif.",
    ],
    [
      "auto_generate_fees",
      "Préparer les frais automatiquement",
      "Les frais de réinscription seront générés lors de l’ouverture du module Finances.",
    ],
    [
      "allow_batch",
      "Autoriser les réinscriptions groupées",
      "Permet de préparer plusieurs dossiers en une seule opération.",
    ],
    [
      "require_active_next_cycle",
      "Exiger l’activation du cycle suivant",
      "Bloque une promotion si le prochain cycle n’est pas actif dans l’année cible.",
    ],
  ] as const;
  return (
    <Card
      title="Règles de réinscription"
      subTitle="Définissez comment un élève poursuit son parcours d’une année à l’autre."
      className="settings-section-card policy-card medium-controls"
    >
      <div className="policy-list">
        {switches.map(([key, label, help]) => (
          <div className="policy-row" key={key}>
            <div>
              <strong>{label}</strong>
              <small>{help}</small>
            </div>
            <InputSwitch
              checked={policy[key]}
              onChange={(event) => change(key, Boolean(event.value))}
            />
          </div>
        ))}
      </div>
      <div className="schooling-form-grid">
        <label className="field">
          <span>Impayés antérieurs</span>
          <Dropdown
            value={policy.debt_mode}
            options={[
              { label: "Information", value: "information" },
              { label: "Avertissement", value: "warning" },
              { label: "Blocage", value: "blocking" },
            ]}
            onChange={(event) => change("debt_mode", String(event.value))}
          />
        </label>
        <label className="field">
          <span>Redoublement</span>
          <Dropdown
            value={policy.repeat_mode}
            options={[
              { label: "Autorisé", value: "allowed" },
              { label: "Autorisé avec motif", value: "exception" },
              { label: "Interdit", value: "forbidden" },
            ]}
            onChange={(event) => change("repeat_mode", String(event.value))}
          />
        </label>
        <label className="field">
          <span>Statut des réinscriptions groupées</span>
          <Dropdown
            value={policy.batch_result_status}
            options={[
              { label: "Brouillon", value: "draft" },
              { label: "Préinscrit", value: "pre_registered" },
              { label: "Confirmé", value: "confirmed" },
            ]}
            onChange={(event) =>
              change("batch_result_status", String(event.value))
            }
          />
        </label>
      </div>
      <div className="dialog-actions">
        <Button
          label="Enregistrer les règles"
          icon="pi pi-check"
          loading={saving}
          onClick={() => {
            setSaving(true);
            void saveReenrollmentPolicy(institutionId, policy)
              .then(setPolicy)
              .then(() =>
                notify({ severity: "success", summary: "Règles enregistrées" }),
              )
              .catch(() =>
                notify({
                  severity: "error",
                  summary: "Enregistrement impossible",
                }),
              )
              .finally(() => setSaving(false));
          }}
        />
      </div>
    </Card>
  );
}
