import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { BulletinRow } from "../services/bulletins.service";

type SubjectLine = {
  name: string;
  coefficient: number;
  average: number | null;
  appreciation: string;
};

function safeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "");
}
function snapshot(row: BulletinRow) {
  return row.snapshot &&
    typeof row.snapshot === "object" &&
    !Array.isArray(row.snapshot)
    ? (row.snapshot as Record<string, unknown>)
    : {};
}

function createBulletinPdf(row: BulletinRow) {
  const data = snapshot(row);
  const display =
    data.display &&
    typeof data.display === "object" &&
    !Array.isArray(data.display)
      ? (data.display as Record<string, unknown>)
      : {};
  const subjects = Array.isArray(data.subjects)
    ? (data.subjects as SubjectLine[])
    : [];
  const landscape = display.bulletin_orientation === "landscape";
  const pdf = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });
  const width = pdf.internal.pageSize.getWidth();
  let y = 18;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  const title =
    typeof display.bulletin_title === "string"
      ? display.bulletin_title
      : "Bulletin scolaire";
  pdf.text(title, width / 2, y, { align: "center" });
  y += 9;
  pdf.setFontSize(13);
  pdf.text(row.periodName, width / 2, y, { align: "center" });
  y += 12;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Élève : ${row.studentName}`, 15, y);
  pdf.text(`Matricule : ${row.matricule}`, width / 2, y);
  y += 6;
  pdf.text(`Classe : ${row.className}`, 15, y);
  pdf.text(`Version : v${row.version}`, width / 2, y);
  y += 10;
  if (display.bulletin_show_rank !== false) {
    const rank = typeof data.rank === "number" ? data.rank : null;
    const classSize =
      typeof data.class_size === "number" ? data.class_size : null;
    pdf.text(
      `Classement : ${rank === null ? "Non calculé" : `${rank}${rank === 1 ? "er" : "e"}${classSize ? ` sur ${classSize}` : ""}`}`,
      15,
      y,
    );
    y += 8;
  }
  pdf.setFont("helvetica", "bold");
  pdf.text("Matière", 15, y);
  pdf.text("Coef.", 86, y);
  pdf.text("Moyenne /20", 108, y);
  pdf.text("Appréciation", 142, y);
  y += 3;
  pdf.line(15, y, width - 15, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  subjects.forEach((subject) => {
    if (y > pdf.internal.pageSize.getHeight() - 24) {
      pdf.addPage();
      y = 18;
    }
    pdf.text(String(subject.name ?? "Matière").slice(0, 38), 15, y);
    pdf.text(String(subject.coefficient ?? 1), 90, y, { align: "center" });
    pdf.text(
      subject.average == null ? "—" : subject.average.toFixed(2),
      119,
      y,
      { align: "center" },
    );
    const appreciation =
      typeof subject.appreciation === "string" ? subject.appreciation : "—";
    pdf.text(
      appreciation.length > 54 ? `${appreciation.slice(0, 51)}…` : appreciation,
      142,
      y,
    );
    y += 9;
  });
  y += 3;
  pdf.line(15, y, width - 15, y);
  y += 8;
  pdf.setFont("helvetica", "bold");
  const average =
    typeof data.general_average === "number"
      ? data.general_average.toFixed(2)
      : "—";
  pdf.text(`Moyenne générale : ${average} / 20`, 15, y);
  const footer =
    typeof display.bulletin_footer === "string" ? display.bulletin_footer : "";
  if (footer) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(footer, width / 2, pdf.internal.pageSize.getHeight() - 10, {
      align: "center",
    });
  }
  return pdf.output("arraybuffer");
}

export async function downloadBulletinsZip(rows: BulletinRow[], label: string) {
  const zip = new JSZip();
  rows.forEach((row) =>
    zip.file(
      `${safeName(row.matricule)}-${safeName(row.periodName)}-v${row.version}.pdf`,
      createBulletinPdf(row),
    ),
  );
  zip.file(
    "rapport.txt",
    [
      `Export : ${label}`,
      `Date : ${new Date().toLocaleString("fr-FR")}`,
      `Bulletins : ${rows.length}`,
      "",
      ...rows.map(
        (row) =>
          `${row.matricule} · ${row.studentName} · ${row.className} · ${row.periodName} · v${row.version}`,
      ),
    ].join("\n"),
  );
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName(label)}.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}
