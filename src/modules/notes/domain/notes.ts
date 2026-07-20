export type NoteResultStatus = "absent" | "exempt" | "postponed";

export const noteResultStatusLabels: Record<NoteResultStatus, string> = {
  absent: "Absent",
  exempt: "Dispensé",
  postponed: "Reporté",
};

export type CourseSummary = {
  assignmentId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  coefficient: number;
};

export type GradebookStudent = {
  studentId: string;
  matricule: string;
  name: string;
};
