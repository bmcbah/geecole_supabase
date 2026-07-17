import { Tag } from "primereact/tag";
import type { EnrollmentStatus } from "../types/schooling";

const labels: Record<EnrollmentStatus, string> = {
  draft: "Brouillon",
  pre_registered: "Préinscrit",
  confirmed: "Inscrit",
  rejected: "Refusé",
  withdrawn: "Abandonné",
  cancelled: "Annulé",
  transferred: "Transféré",
};
export function EnrollmentStatusTag({ status }: { status: EnrollmentStatus }) {
  const severity =
    status === "confirmed"
      ? "success"
      : status === "pre_registered"
        ? "info"
        : status === "cancelled" || status === "rejected"
          ? "danger"
          : "warning";
  return <Tag value={labels[status]} severity={severity} />;
}
