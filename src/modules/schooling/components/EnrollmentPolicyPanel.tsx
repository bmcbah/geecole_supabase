import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import {
  getEnrollmentPolicy,
  saveEnrollmentPolicy,
  type EnrollmentPolicy,
} from "../services/enrollment-policy.service";

export function EnrollmentPolicyPanel({
  institutionId,
}: {
  institutionId: string;
}) {
  const [policy, setPolicy] = useState<EnrollmentPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    getEnrollmentPolicy(institutionId)
      .then(setPolicy)
      .catch(() =>
        setFeedback("Impossible de charger les règles d’inscription."),
      );
  }, [institutionId]);
  if (!policy)
    return feedback ? <Message severity="error" text={feedback} /> : null;
  const toggle = (key: keyof EnrollmentPolicy, value: boolean | string) =>
    setPolicy((current) => (current ? { ...current, [key]: value } : current));
  const switches: {
    key: keyof EnrollmentPolicy;
    label: string;
    help: string;
  }[] = [
    {
      key: "allow_pre_registration",
      label: "Autoriser les préinscriptions",
      help: "Permet d’enregistrer un candidat avant confirmation.",
    },
    {
      key: "allow_direct_enrollment",
      label: "Autoriser l’inscription directe",
      help: "Permet de confirmer sans passer par une préinscription.",
    },
    {
      key: "require_payment_before_confirmation",
      label: "Exiger un paiement avant confirmation",
      help: "L’inscription reste en attente tant qu’aucun paiement n’est enregistré.",
    },
    {
      key: "require_class_assignment",
      label: "Exiger une classe",
      help: "Sinon, seul le niveau est obligatoire lors de l’inscription.",
    },
    {
      key: "count_pre_registration_in_capacity",
      label: "Compter les préinscriptions dans la capacité",
      help: "Les places prévisionnelles apparaissent dans les effectifs.",
    },
    {
      key: "allow_missing_documents",
      label: "Autoriser les pièces manquantes",
      help: "La confirmation reste possible avec un dossier incomplet.",
    },
  ];
  return (
    <Card
      title="Règles d’inscription"
      subTitle="Ces choix pilotent le parcours Scolarité de cet établissement."
      className="settings-section-card policy-card medium-controls"
    >
      <div className="policy-list">
        {switches.map((item) => (
          <div className="policy-row" key={item.key}>
            <div>
              <strong>{item.label}</strong>
              <small>{item.help}</small>
            </div>
            <InputSwitch
              checked={Boolean(policy[item.key])}
              onChange={(e) => toggle(item.key, Boolean(e.value))}
            />
          </div>
        ))}
      </div>
      <div className="schooling-form-grid">
        <label className="field">
          <span>Gestion de la capacité</span>
          <Dropdown
            value={policy.capacity_mode}
            options={[
              { label: "Information", value: "information" },
              { label: "Avertissement", value: "warning" },
              { label: "Blocage", value: "blocking" },
            ]}
            onChange={(e) => toggle("capacity_mode", String(e.value))}
          />
        </label>
        <label className="field">
          <span>Format du matricule</span>
          <InputText
            value={policy.student_number_pattern}
            onChange={(e) => toggle("student_number_pattern", e.target.value)}
          />
          <small>
            Variables : {"{YYYY}"} et {"{SEQ}"}
          </small>
        </label>
      </div>
      {feedback && <Message severity="success" text={feedback} />}
      <div className="dialog-actions">
        <Button
          label="Enregistrer les règles"
          icon="pi pi-check"
          loading={saving}
          onClick={() => {
            setSaving(true);
            setFeedback("");
            void saveEnrollmentPolicy(institutionId, policy)
              .then(setPolicy)
              .then(() => setFeedback("Règles enregistrées."))
              .finally(() => setSaving(false));
          }}
        />
      </div>
    </Card>
  );
}
