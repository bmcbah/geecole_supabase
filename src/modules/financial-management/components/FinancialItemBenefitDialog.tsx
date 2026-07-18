import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import type { FinancialAccountItem } from "../domain/financial-account";
import {
  financialBenefitCalculationLabels,
  financialBenefitTypeLabels,
  type FinancialBenefitTemplate,
} from "../domain/financial-benefit";
import {
  grantStudentFinancialBenefit,
  listFinancialBenefitTemplates,
} from "../services/financial-benefits.service";

interface Props {
  visible: boolean;
  institutionId: string;
  currencyCode: string;
  item?: FinancialAccountItem;
  onHide: () => void;
  onGranted: () => Promise<void> | void;
}

const formatAmount = (value: number, currencyCode: string) =>
  `${Number(value).toLocaleString("fr-GN")} ${currencyCode}`;

export function FinancialItemBenefitDialog({
  visible,
  institutionId,
  currencyCode,
  item,
  onHide,
  onGranted,
}: Props) {
  const [templates, setTemplates] = useState<FinancialBenefitTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string>();
  const [value, setValue] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(undefined);
    void listFinancialBenefitTemplates(institutionId)
      .then((rows) => setTemplates(rows.filter((template) => template.isActive)))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Impossible de charger les modèles."),
      )
      .finally(() => setLoading(false));
  }, [institutionId, visible]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId),
    [templateId, templates],
  );

  useEffect(() => {
    setValue(selectedTemplate?.defaultValue ?? null);
  }, [selectedTemplate]);

  const options = useMemo(
    () =>
      templates
        .filter(
          (template) =>
            template.feeTypeIds.length === 0 ||
            (item?.feeTypeId ? template.feeTypeIds.includes(item.feeTypeId) : false),
        )
        .map((template) => ({
          value: template.id,
          label: `${template.name} · ${financialBenefitTypeLabels[template.benefitType]}`,
        })),
    [item?.feeTypeId, templates],
  );

  const previewAmount = useMemo(() => {
    if (!item || !selectedTemplate || !value || value <= 0) return 0;
    const calculated =
      selectedTemplate.calculationType === "percentage"
        ? Math.round((item.amount * value) / 100)
        : value;
    return Math.min(calculated, item.amount);
  }, [item, selectedTemplate, value]);

  const netPreview = item ? Math.max(item.netAmount - previewAmount, 0) : 0;

  const reset = () => {
    setTemplateId(undefined);
    setValue(null);
    setReason("");
    setReference("");
    setError(undefined);
  };

  const close = () => {
    reset();
    onHide();
  };

  const submit = async () => {
    if (!item || !templateId || !value || value <= 0) return;
    setSaving(true);
    setError(undefined);
    try {
      await grantStudentFinancialBenefit({
        financialItemId: item.id,
        templateId,
        value,
        reason,
        externalReference: reference,
      });
      await onGranted();
      close();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Attribution impossible.";
      setError(
        message.includes("adjustment_below_paid_amount")
          ? "Cet avantage ferait passer le montant net sous le montant déjà encaissé."
          : message.includes("non_stackable_benefit_already_applied")
            ? "Un avantage non cumulable est déjà actif sur ce frais."
            : message,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      header="Accorder un avantage"
      visible={visible}
      modal
      className="form-dialog form-dialog-wide"
      onHide={close}
    >
      <div className="form-grid">
        {item ? (
          <div className="field-wide rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="font-semibold text-slate-900">{item.label}</div>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
              <div><span className="text-slate-500">Initial</span><div className="font-medium">{formatAmount(item.amount, currencyCode)}</div></div>
              <div><span className="text-slate-500">Avantages actuels</span><div className="font-medium">-{formatAmount(item.adjustmentAmount, currencyCode)}</div></div>
              <div><span className="text-slate-500">Net actuel</span><div className="font-semibold">{formatAmount(item.netAmount, currencyCode)}</div></div>
            </div>
          </div>
        ) : null}

        {error ? <div className="field-wide"><Message severity="error" text={error} /></div> : null}

        <div className="field field-wide">
          <label htmlFor="benefit-template">Modèle d’avantage</label>
          <Dropdown
            inputId="benefit-template"
            value={templateId}
            options={options}
            optionLabel="label"
            optionValue="value"
            loading={loading}
            placeholder="Sélectionner un modèle"
            className="w-full"
            onChange={(event) => setTemplateId(event.value)}
          />
        </div>

        {selectedTemplate ? (
          <>
            <div className="field">
              <label htmlFor="benefit-value">{financialBenefitCalculationLabels[selectedTemplate.calculationType]}</label>
              <InputNumber
                inputId="benefit-value"
                value={value}
                min={0}
                max={selectedTemplate.calculationType === "percentage" ? 100 : undefined}
                suffix={selectedTemplate.calculationType === "percentage" ? " %" : undefined}
                useGrouping
                className="w-full"
                onValueChange={(event) => setValue(event.value ?? null)}
              />
            </div>
            <div className="field">
              <label htmlFor="benefit-reference">Référence</label>
              <InputText
                id="benefit-reference"
                value={reference}
                className="w-full"
                onChange={(event) => setReference(event.target.value)}
              />
            </div>
            <div className="field field-wide">
              <label htmlFor="benefit-reason">Motif</label>
              <InputTextarea
                id="benefit-reason"
                value={reason}
                rows={3}
                className="w-full"
                placeholder="Décision, contexte ou commentaire administratif"
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            <div className="field-wide rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-sm text-emerald-700">Prévisualisation</div>
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                <span>Réduction estimée : <strong>-{formatAmount(previewAmount, currencyCode)}</strong></span>
                <span>Nouveau net : <strong>{formatAmount(netPreview, currencyCode)}</strong></span>
              </div>
              <small className="mt-1 block text-emerald-700">Le backend recalculera définitivement les échéances ouvertes après validation.</small>
            </div>
          </>
        ) : null}

        <div className="dialog-actions field-wide">
          <Button label="Annuler" severity="secondary" outlined onClick={close} />
          <Button
            label="Accorder l’avantage"
            icon="pi pi-check"
            loading={saving}
            disabled={!item || !templateId || !value || value <= 0}
            onClick={() => void submit()}
          />
        </div>
      </div>
    </Dialog>
  );
}
