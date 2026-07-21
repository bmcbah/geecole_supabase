import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { createPayrollPayment } from "../services/personnel.service";
export function PayrollPaymentDialog({
  visible,
  onHide,
  onSaved,
  institutionId,
  entryId,
  balance,
}: {
  visible: boolean;
  onHide: () => void;
  onSaved: () => Promise<void>;
  institutionId: string;
  entryId: string;
  balance: number;
}) {
  const [amount, setAmount] = useState(balance);
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("espèces");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    if (visible) {
      setAmount(balance);
      setFailure("");
    }
  }, [balance, visible]);
  const save = async () => {
    setBusy(true);
    setFailure("");
    try {
      if (amount <= 0 || amount > balance)
        throw new Error("Le montant doit être compris dans le reste à payer.");
      await createPayrollPayment({
        institution_id: institutionId,
        payroll_entry_id: entryId,
        amount,
        paid_on: day,
        method,
        reference,
      });
      await onSaved();
      onHide();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      header="Enregistrer un paiement"
      visible={visible}
      onHide={onHide}
      className="personnel-form-dialog w-[min(94vw,38rem)]"
    >
      <Message
        severity="info"
        text={`Reste à payer : ${balance.toLocaleString("fr-GN")} GNF`}
        className="mb-4 w-full"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Montant (GNF) *">
          <InputNumber
            value={amount}
            min={1}
            max={balance}
            onValueChange={(e) => setAmount(e.value || 0)}
          />
        </Field>
        <Field label="Date du paiement">
          <InputText
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </Field>
        <Field label="Mode de paiement">
          <Dropdown
            value={method}
            options={[
              "Espèces",
              "Virement bancaire",
              "Chèque",
              "Mobile money",
              "Autre",
            ].map((x) => ({ label: x, value: x.toLowerCase() }))}
            onChange={(e) => setMethod(e.value)}
          />
        </Field>
        <Field label="Référence / numéro">
          <InputText
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </Field>
      </div>
      {failure && (
        <Message severity="error" text={failure} className="mt-4 w-full" />
      )}
      <Actions onHide={onHide} busy={busy} save={save} />
    </Dialog>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Actions({
  onHide,
  busy,
  save,
}: {
  onHide: () => void;
  busy: boolean;
  save: () => Promise<void>;
}) {
  return (
    <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
      <Button label="Annuler" text severity="secondary" onClick={onHide} />
      <Button
        label="Enregistrer le paiement"
        icon="pi pi-check"
        loading={busy}
        onClick={() => void save()}
      />
    </div>
  );
}
