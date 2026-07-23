import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { FileUpload, type FileUploadHandlerEvent } from "primereact/fileupload";
import {
  deleteStudentAvatar,
  getSchoolFileUrl,
  updateStudentAvatar,
  uploadSchoolFile,
} from "../services/documents.service";

export function StudentAvatarUpload({
  institutionId,
  studentId,
  firstName,
  lastName,
  path,
  onSaved,
}: {
  institutionId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  path: string | null;
  onSaved: () => Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (path) void getSchoolFileUrl(path).then(setUrl);
    else setUrl("");
  }, [path]);

  const upload = async (event: FileUploadHandlerEvent) => {
    const file = event.files[0];
    if (!file) return;
    const extension = file.name.split(".").pop() ?? "jpg";
    const stored = await uploadSchoolFile(
      `${institutionId}/students/${studentId}/avatar.${extension}`,
      file,
    );
    await updateStudentAvatar(studentId, stored);
    await onSaved();
  };

  const remove = async () => {
    if (!path) return;
    setRemoving(true);
    try {
      await deleteStudentAvatar(studentId, path);
      setUrl("");
      await onSaved();
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      {url ? (
        <img
          src={url}
          alt={`${firstName} ${lastName}`}
          className="block size-20 shrink-0 rounded-full border border-slate-200 object-cover object-center shadow-sm"
        />
      ) : (
        <span className="grid size-20 shrink-0 place-items-center rounded-full border border-emerald-100 bg-emerald-50 text-lg font-semibold leading-none text-emerald-700">
          {firstName[0]}
          {lastName[0]}
        </span>
      )}
      <div className="flex items-center gap-1">
        <FileUpload
          mode="basic"
          name="avatar"
          accept="image/png,image/jpeg,image/webp"
          maxFileSize={5_000_000}
          chooseLabel={url ? "Modifier" : "Ajouter"}
          chooseOptions={{
            icon: "pi pi-camera",
            className: "p-button-sm p-button-text",
          }}
          customUpload
          auto
          uploadHandler={(event) => void upload(event)}
        />
        {path ? (
          <Button
            label="Supprimer"
            icon="pi pi-trash"
            severity="danger"
            text
            size="small"
            loading={removing}
            onClick={() => void remove()}
          />
        ) : null}
      </div>
    </div>
  );
}
