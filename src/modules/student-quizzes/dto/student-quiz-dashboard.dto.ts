import { StudentQuizState } from '../student-quiz-state';

export type { StudentQuizState };

export class StudentQuizDashboardDtoItem {
  quizId!: string;
  title!: string;
  description!: string;
  instructions?: string | null;
  durationMinutes!: number;
  opensAt!: string;
  closesAt!: string;
  studentState!: StudentQuizState;
  score?: number | null;
  passScore?: number | null;
  passed?: boolean | null;
  resultsPolicy?: string;
  canStart!: boolean;
  blockedReason?: string;
}

export class StudentQuizDashboardDto {
  quizzes!: StudentQuizDashboardDtoItem[];
  message?: string;
}
