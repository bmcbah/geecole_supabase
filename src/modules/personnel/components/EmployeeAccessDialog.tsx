import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import {
  createEmployeeAccessInvitation,
  listEmployeeAccessProfiles,
} from "../services/personnel.service";

export function EmployeeAccessDialog({
  employeeId,
  institutionId,
  email,
  visible,
  onHide,
}: {
  employeeId: string;
  institutionId: string;
  email: string | null;
  visible: boolean;
  onHide: () => void;
}) {
  const [accessProfiles, setAccessProfiles] = useState<
    Awaited<ReturnType<typeof listEmployeeAccessProfiles>>
  >([]);
  const [accessProfileId, setAccessProfileId] = useState("");
  const [link, setLink] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!visible) return;
    void listEmployeeAccessProfiles(institutionId).then((profiles) => {
      setAccessProfiles(profiles);
      setAccessProfileId((current) => current || profiles[0]?.id || "");
    });
  }, [institutionId, visible]);
  const create = async () => {
    setBusy(true);
    setFailure("");
    try {
      const token = await createEmployeeAccessInvitation(
        employeeId,
        accessProfileId,
      );
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
      className="personnel-form-dialog w-[min(96vw,38rem)]"
    >
      <p className="mt-0 text-sm text-slate-600">
        L’accès est créé par invitation pour{" "}
        <strong>{email || "adresse e-mail manquante"}</strong>. La fonction RH
        et le profil d’accès restent distincts.
      </p>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        <span>Profil d’accès *</span>
        <Dropdown
          value={accessProfileId}
          options={accessProfiles}
          optionLabel="name"
          optionValue="id"
          onChange={(event) => setAccessProfileId(String(event.value))}
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
          disabled={!email || !accessProfileId}
          onClick={() => void create()}
        />
      </div>
    </Dialog>
  );
}
