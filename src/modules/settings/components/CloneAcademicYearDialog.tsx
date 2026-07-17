import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import {
  cloneAcademicYearConfiguration,
  getAcademicYearConfigurationCounts,
  type CloneOptions,
} from "../services/settings.service";
import type { AcademicYear } from "../types/settings";

interface Props {
  visible: boolean;
  target: AcademicYear | null;
  years: AcademicYear[];
  onHide: () => void;
  onCloned: () => Promise<void>;
}
const initial: CloneOptions = {
  structure: true,
  subjects: true,
  assessments: true,
  finance: true,
  users: true,
};
const labels: Record<keyof CloneOptions, string> = {
  structure: "Cycles et niveaux",
  subjects: "Matières, coefficients et volumes horaires",
  assessments: "Types d’évaluation et formules",
  finance: "Règles financières",
  users: "Affectations des utilisateurs existants",
};

export function CloneAcademicYearDialog({
  visible,
  target,
  years,
  onHide,
  onCloned,
}: Props) {
  const [sourceId, setSourceId] = useState("");
  const [options, setOptions] = useState(initial);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const sources = useMemo(
    () => years.filter((year) => year.id !== target?.id),
    [target, years],
  );
  useEffect(() => {
    if (!visible) return;
    setSourceId(sources[0]?.id ?? "");
    setOptions(initial);
    setResult(null);
  }, [sources, visible]);
  useEffect(() => {
    if (!sourceId) return;
    void getAcademicYearConfigurationCounts(sourceId).then(setCounts);
  }, [sourceId]);
  const submit = async () => {
    if (!sourceId || !target) return;
    setLoading(true);
    try {
      const data = await cloneAcademicYearConfiguration(
        sourceId,
        target.id,
        options,
      );
      setResult(data as Record<string, number>);
      await onCloned();
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog
      header={`Cloner vers ${target?.name ?? "l’année"}`}
      visible={visible}
      modal
      className="clone-dialog"
      onHide={onHide}
    >
      {result ? (
        <div className="form-stack">
          <Message severity="success" text="Clonage terminé" />
          <div className="clone-summary">
            {Object.entries(result).map(([key, count]) => (
              <div key={key}>
                <span>{key}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          <div className="dialog-actions">
            <Button label="Fermer" onClick={onHide} />
          </div>
        </div>
      ) : (
        <div className="form-stack">
          <div className="field">
            <label htmlFor="clone-source">Année source</label>
            <Dropdown
              inputId="clone-source"
              value={sourceId}
              options={sources}
              optionLabel="name"
              optionValue="id"
              onChange={(event) => {
                const value = event.value as unknown;
                if (typeof value === "string") setSourceId(value);
              }}
            />
          </div>
          <div className="clone-options">
            {(Object.keys(labels) as (keyof CloneOptions)[]).map((key) => (
              <label key={key} className="clone-option">
                <Checkbox
                  checked={options[key]}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      [key]: Boolean(event.checked),
                    }))
                  }
                />
                <span>{labels[key]}</span>
                <strong>{counts[key] ?? 0}</strong>
              </label>
            ))}
          </div>
          <Message
            severity="info"
            text="Le clonage complète la cible sans écraser les éléments déjà configurés. Les élèves, notes et paiements ne sont jamais copiés."
          />
          <div className="dialog-actions">
            <Button
              label="Annuler"
              severity="secondary"
              outlined
              onClick={onHide}
            />
            <Button
              label="Cloner la sélection"
              icon="pi pi-copy"
              loading={loading}
              disabled={!sourceId || !Object.values(options).some(Boolean)}
              onClick={() => void submit()}
            />
          </div>
        </div>
      )}
    </Dialog>
  );
}
