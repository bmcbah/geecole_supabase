import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
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

const scopeLabels: Record<FinancialBenefitTemplate["scope"], string> = {
  institution: "Tout l’établissement",
  cycle: "Cycle de l’élève",
  level: "Niveau de l’élève",
};

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
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Impossible de charger les modèles."))
      .finally(() => setLoading(false));
  }, [institutionId, visible]);

  const applicableTemplates = useMemo(
    () => templates.filter(
      (template) => template.feeTypeIds.length === 0 || (item?.feeTypeId ? template.feeTypeIds.includes(item.feeTypeId) : false),
    ),
    [item?.feeTypeId, templates],
  );

  const selectedTemplate = useMemo(
    () => applicableTemplates.find((template) => template.id === templateId),
    [applicableTemplates, templateId],
  );

  useEffect(() => {
    setValue(selectedTemplate?.defaultValue ?? null);
  }, [selectedTemplate]);

  const options = applicableTemplates.map((template) => ({
    value: template.id,
    label: `${template.name} · ${financialBenefitTypeLabels[template.benefitType]}`,
  }));

  const previewAmount = useMemo(() => {
    if (!item || !selectedTemplate || !value || value <= 0) return 0;
    const calculated = selectedTemplate.calculationType === "percentage"
      ? Math.round((item.amount * value) / 100)
      : value;
    return Math.min(calculated, item.netAmount);
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

  const translateError = (message: string) => {
    if (message.includes("adjustment_below_paid_amount")) return "Cette remise ferait passer le montant net sous le montant déjà encaissé.";
    if (message.includes("financial_benefit_not_stackable")) return "Cette remise ne peut pas être cumulée avec un avantage déjà actif sur ce frais.";
    if (message.includes("financial_benefit_template_already_applied")) return "Ce modèle est déjà actif sur ce frais.";
    if (message.includes("financial_benefit_not_applicable_to_cycle")) return "Ce modèle n’est pas prévu pour le cycle de cet élève.";
    if (message.includes("financial_benefit_not_applicable_to_level")) return "Ce modèle n’est pas prévu pour le niveau de cet élève.";
    if (message.includes("financial_benefit_not_applicable_to_fee")) return "Ce modèle ne s’applique pas à cette catégorie de frais.";
    if (message.includes("no_open_installments_for_recalculation")) return "Le nouvel échéancier ne peut pas être réparti. Vérifiez les échéances déjà soldées.";
    if (message.includes("permission_denied")) return "Seuls un administrateur ou le propriétaire de l’établissement peut accorder une remise.";
    return message;
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
      setError(translateError(message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog header="Accorder un avantage financier" visible={visible} modal className="form-dialog form-dialog-wide" onHide={close}>
      <div className="form-grid">
        {item ? (
          <div className="field-wide overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-950">{item.label}</div>
                  <div className="text-sm text-slate-500">{item.paymentPlanName ?? "Paiement unique"}</div>
                </div>
                <Tag value={item.balanceAmount > 0 ? "À payer" : "Soldé"} severity={item.balanceAmount > 0 ? "warning" : "success"} />
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm sm:grid-cols-4">
              <div><span className="text-xs text-slate-500">Montant initial</span><div className="mt-1 font-semibold">{formatAmount(item.amount, currencyCode)}</div></div>
              <div><span className="text-xs text-slate-500">Avantages actuels</span><div className="mt-1 font-semibold text-amber-700">-{formatAmount(item.adjustmentAmount, currencyCode)}</div></div>
              <div><span className="text-xs text-slate-500">Montant net</span><div className="mt-1 font-semibold text-blue-700">{formatAmount(item.netAmount, currencyCode)}</div></div>
              <div><span className="text-xs text-slate-500">Déjà payé</span><div className="mt-1 font-semibold text-emerald-700">{formatAmount(item.paidAmount, currencyCode)}</div></div>
            </div>
          </div>
        ) : null}

        {error ? <div className="field-wide"><Message severity="error" text={error} /></div> : null}

        {!loading && applicableTemplates.length === 0 ? (
          <div className="field-wide">
            <Message severity="warn" text="Aucun modèle actif n’est applicable à cette catégorie de frais. Vérifiez la portée et les catégories dans Configuration financière > Modèles d’avantages." />
          </div>
        ) : null}

        <div className="field field-wide">
          <label htmlFor="benefit-template">Modèle d’avantage</label>
          <Dropdown
            inputId="benefit-template"
            value={templateId}
            options={options}
            optionLabel="label"
            optionValue="value"
            loading={loading}
            disabled={!loading && options.length === 0}
            placeholder="Sélectionner une remise, une bourse ou une exonération"
            className="w-full"
            onChange={(event) => setTemplateId(event.value)}
          />
        </div>

        {selectedTemplate ? (
          <>
            <div className="field-wide rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <div className="flex flex-wrap items-center gap-2">
                <Tag value={financialBenefitTypeLabels[selectedTemplate.benefitType]} severity="info" />
                <Tag value={scopeLabels[selectedTemplate.scope]} severity="secondary" />
                <Tag value={selectedTemplate.isStackable ? "Cumulable" : "Non cumulable"} severity={selectedTemplate.isStackable ? "success" : "warning"} />
              </div>
              {selectedTemplate.description ? <p className="mt-2 leading-6 text-blue-800">{selectedTemplate.description}</p> : null}
            </div>

            <div className="field">
              <label htmlFor="benefit-value">{financialBenefitCalculationLabels[selectedTemplate.calculationType]}</label>
              <InputNumber
                inputId="benefit-value"
                value={value}
                min={0}
                max={selectedTemplate.calculationType === "percentage" ? 100 : item?.netAmount}
                suffix={selectedTemplate.calculationType === "percentage" ? " %" : undefined}
                useGrouping
                className="w-full"
                onValueChange={(event) => setValue(event.value ?? null)}
              />
            </div>
            <div className="field">
              <label htmlFor="benefit-reference">Référence administrative</label>
              <InputText id="benefit-reference" value={reference} className="w-full" placeholder="Décision, dossier, convention…" onChange={(event) => setReference(event.target.value)} />
            </div>
            <div className="field field-wide">
              <label htmlFor="benefit-reason">Motif</label>
              <InputTextarea id="benefit-reason" value={reason} rows={3} className="w-full" placeholder="Expliquez pourquoi cet avantage est accordé" onChange={(event) => setReason(event.target.value)} />
            </div>
            <div className="field-wide rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">Résultat après validation</div>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <div><span className="text-sm text-emerald-700">Réduction</span><strong className="block text-lg text-emerald-950">-{formatAmount(previewAmount, currencyCode)}</strong></div>
                <div><span className="text-sm text-emerald-700">Nouveau net</span><strong className="block text-lg text-emerald-950">{formatAmount(netPreview, currencyCode)}</strong></div>
                <div><span className="text-sm text-emerald-700">Déjà encaissé</span><strong className="block text-lg text-emerald-950">{formatAmount(item?.paidAmount ?? 0, currencyCode)}</strong></div>
              </div>
              <small className="mt-2 block text-emerald-700">Les paiements existants restent inchangés. Le reste est redistribué automatiquement sur les échéances encore ouvertes.</small>
            </div>
          </>
        ) : null}

        <div className="dialog-actions field-wide">
          <Button label="Annuler" severity="secondary" outlined onClick={close} />
          <Button label="Accorder et recalculer" icon="pi pi-check" loading={saving} disabled={!item || !templateId || !value || value <= 0} onClick={() => void submit()} />
        </div>
      </div>
    </Dialog>
  );
}
