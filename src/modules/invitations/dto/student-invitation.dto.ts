export class StudentInvitationDto {
  quizId: string;
  title: string;
  description: string;
  instructions?: string | null;
  durationMinutes: number;
  opensAt: string;
  closesAt: string;
}
