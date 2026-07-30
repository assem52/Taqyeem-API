import { IsUUID } from 'class-validator';
import { InvitationStatus } from '../invitation-status.types';

export class InvitationStatusListQueryDto {
  @IsUUID()
  quizId: string;
}

export interface InvitationStatusRowDto {
  personKey: string;
  studentName: string | null;
  status: InvitationStatus;
  /** Present only on FAILED rows — link to Slot 6's email log to resend. */
  emailLogId?: string;
}

export interface InvitationStatusListDto {
  generatedAt: string;
  summary: {
    total: number;
    byStatus: Record<InvitationStatus, number>;
  };
  rows: InvitationStatusRowDto[];
  /** Static disclaimer for the not-started bucket — render this on screen. */
  note: string;
}
