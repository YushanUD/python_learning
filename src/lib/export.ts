import * as XLSX from "xlsx";

export type StudentExportRow = {
  name: string;
  studentId: string;
  nickname: string;
  email: string;
  averageScore: number | string;
};

export function downloadStudentScores(rows: StudentExportRow[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ["name", "studentId", "nickname", "email", "averageScore"],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Student Scores");
  XLSX.writeFile(workbook, "python-learning-student-scores.xlsx");
}
