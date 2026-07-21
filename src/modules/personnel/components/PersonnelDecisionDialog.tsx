import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";

export function PersonnelDecisionDialog({
  visible,
  title,
  description,
  confirmLabel,
  severity,
  amountLabel,
  initialAmount,
  maxAmount,
  commentLabel = "Motif ou commentaire",
  commentRequired = true,
  onHide,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  severity?: "success" | "danger" | "warning";
  amountLabel?: string;
  initialAmount?: number;
  maxAmount?: number;
  commentLabel?: string;
  commentRequired?: boolean;
  onHide: () => void;
  onConfirm: (value: { amount?: number; comment: string }) => Promise<void>;
}) {
  const [amount, setAmount] = useState<number | null>(initialAmount ?? null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (visible) {
      setAmount(initialAmount ?? null);
      setComment("");
      setError("");
    }
  }, [initialAmount, visible]);
  const submit = async () => {
    if (
      amountLabel &&
      (!amount || amount <= 0 || (maxAmount && amount > maxAmount))
    ) {
      setError(
        `Le montant doit être supérieur à 0${maxAmount ? " et inférieur ou égal au montant demandé" : ""}.`,
      );
      return;
    }
    if (commentRequired && comment.trim().length < 3) {
      setError("Le motif ou commentaire doit contenir au moins 3 caractères.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onConfirm({ amount: amount ?? undefined, comment: comment.trim() });
      onHide();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      header={title}
      visible={visible}
      onHide={onHide}
      className="personnel-form-dialog w-[min(95vw,34rem)]"
    >
      <p className="mt-0 text-sm leading-6 text-slate-600">{description}</p>
      <div className="space-y-4">
        {amountLabel && (
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1.5 block">{amountLabel} *</span>
            <InputNumber
              className="w-full"
              inputClassName="w-full"
              value={amount}
              min={0}
              max={maxAmount}
              mode="currency"
              currency="GNF"
              locale="fr-GN"
              onValueChange={(event) => setAmount(event.value ?? null)}
            />
          </label>
        )}
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1.5 block">
            {commentLabel}
            {commentRequired ? " *" : ""}
          </span>
          <InputTextarea
            className="w-full"
            autoResize
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>
        {error && <Message className="w-full" severity="error" text={error} />}
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button
          label="Annuler"
          severity="secondary"
          text
          disabled={busy}
          onClick={onHide}
        />
        <Button
          label={confirmLabel}
          severity={severity}
          loading={busy}
          onClick={() => void submit()}
        />
      </div>
    </Dialog>
  );
}
