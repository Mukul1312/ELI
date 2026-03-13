export interface ImportCurriculumRow {
  subject: string;
  unit: string;
  chapter: string;
  topic: string;
  aliases?: string[];
}

export interface ImportCurriculumCommand {
  instituteId: string;
  examId: string;
  rows: ImportCurriculumRow[];
}
