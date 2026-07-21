import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import type { DropdownChangeEvent } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { createEmployeeAccessInvitation } from "../services/personnel.service";

export function EmployeeAccessDialog({
  employeeId,
  email,
  visible,
  onHide,
}: {
  employeeId: string;
  email: string | null;
  visible: boolean;
  onHide: () => void;
}) {
  const [role, setRole] = useState<
    "teacher" | "admin" | "secretary" | "finance"
  >("teacher");
  const [link, setLink] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    setFailure("");
    try {
      const token = await createEmployeeAccessInvitation(employeeId, role);
      setLink(`${window.location.origin}/invitation?token=${token}`);
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Invitation impossible",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      header="Créer l’accès GeEcole"
      visible={visible}
      onHide={onHide}
      className="w-[min(96vw,38rem)]"
    >
      <p className="mt-0 text-sm text-slate-600">
        L’accès est créé par invitation pour{" "}
        <strong>{email || "adresse e-mail manquante"}</strong>. La fonction RH
        et le rôle applicatif restent distincts.
      </p>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        <span>Rôle applicatif *</span>
        <Dropdown
          value={role}
          options={[
            { label: "Enseignant", value: "teacher" },
            { label: "Administrateur", value: "admin" },
            { label: "Secrétariat", value: "secretary" },
            { label: "Finance", value: "finance" },
          ]}
          onChange={(e: DropdownChangeEvent) =>
            setRole(e.value as "teacher" | "admin" | "secretary" | "finance")
          }
        />
      </label>
      {link && (
        <div className="mt-4">
          <Message
            severity="success"
            text="Invitation créée. Copiez ce lien et transmettez-le à la personne."
            className="mb-2 w-full"
          />
          <div className="flex gap-2">
            <InputText value={link} readOnly className="w-full" />
            <Button
              icon="pi pi-copy"
              aria-label="Copier"
              onClick={() => void navigator.clipboard.writeText(link)}
            />
          </div>
        </div>
      )}
      {failure && (
        <Message severity="error" text={failure} className="mt-4 w-full" />
      )}
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button label="Fermer" text severity="secondary" onClick={onHide} />
        <Button
          label="Créer l’invitation"
          icon="pi pi-send"
          loading={busy}
          disabled={!email}
          onClick={() => void create()}
        />
      </div>
    </Dialog>
  );
}
