import { useEffect, useState } from "react";
import { FileUpload, type FileUploadHandlerEvent } from "primereact/fileupload";
import {
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
  return (
    <div className="student-avatar-editor">
      {url ? (
        <img
          src={url}
          alt={`${firstName} ${lastName}`}
          className="student-avatar student-avatar-large"
        />
      ) : (
        <span className="student-avatar student-avatar-large">
          {firstName[0]}
          {lastName[0]}
        </span>
      )}
      <FileUpload
        mode="basic"
        name="avatar"
        accept="image/png,image/jpeg,image/webp"
        maxFileSize={5_000_000}
        chooseLabel="Modifier"
        chooseOptions={{
          icon: "pi pi-camera",
          className: "p-button-sm p-button-text",
        }}
        customUpload
        auto
        uploadHandler={(event) => void upload(event)}
      />
    </div>
  );
}
