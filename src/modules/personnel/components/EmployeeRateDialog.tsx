import { useState } from "react";
import type { ChangeEvent } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import type { InputNumberValueChangeEvent } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { setEmployeeHourlyRate } from "../services/personnel.service";

export function EmployeeRateDialog({
  employeeId,
  visible,
  onHide,
  onSaved,
}: {
  employeeId: string;
  visible: boolean;
  onHide: () => void;
  onSaved: () => Promise<void>;
}) {
  const [rate, setRate] = useState(0);
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const save = async () => {
    setBusy(true);
    setFailure("");
    try {
      if (rate <= 0)
        throw new Error("Le taux horaire doit être supérieur à zéro.");
      await setEmployeeHourlyRate({
        employeeId,
        hourlyRate: rate,
        effectiveFrom,
        notes,
      });
      await onSaved();
      onHide();
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Enregistrement impossible",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      header="Définir le taux horaire"
      visible={visible}
      onHide={onHide}
      className="w-[min(96vw,34rem)]"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span>Taux horaire (GNF) *</span>
          <InputNumber
            value={rate}
            min={0}
            onValueChange={(e: InputNumberValueChangeEvent) =>
              setRate(Number(e.value) || 0)
            }
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span>Applicable à partir du *</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3"
            type="date"
            value={effectiveFrom}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setEffectiveFrom(e.target.value)
            }
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
          <span>Motif ou commentaire</span>
          <InputTextarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>
      {failure && (
        <Message severity="error" text={failure} className="mt-4 w-full" />
      )}
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button label="Annuler" text severity="secondary" onClick={onHide} />
        <Button
          label="Enregistrer le taux"
          icon="pi pi-check"
          loading={busy}
          onClick={() => void save()}
        />
      </div>
    </Dialog>
  );
}
