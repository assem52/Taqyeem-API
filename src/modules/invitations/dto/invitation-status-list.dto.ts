import { IsUUID } from 'class-validator';
import { InvitationStatus } from '../invitation-status.types';

export class InvitationStatusListQueryDto {
  @IsUUID()
  quizId: string;
}

export interface InvitationStatusRowDto {
  email: string;
  studentName: string | null;
  status: InvitationStatus;
  invitationId?: string | null;
  inviteUrl?: string | null;
  emailLogId?: string;
}

export interface InvitationStatusListDto {
  generatedAt: string;
  summary: {
    total: number;
    byStatus: Record<InvitationStatus, number>;
  };
  rows: InvitationStatusRowDto[];
  note: string;
}
