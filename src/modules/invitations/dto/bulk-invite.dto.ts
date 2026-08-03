import { ArrayNotEmpty, IsArray, IsEmail, IsString } from 'class-validator';

export class BulkInviteDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  emails: string[];
}

export type BulkInviteResultStatus = 'SENT' | 'FAILED' | 'DUPLICATE' | 'INVALID';

export class BulkInviteItemResult {
  email: string;
  status: BulkInviteResultStatus;
  reason?: string;
}

export class BulkInviteResponseDto {
  quizId: string;
  total: number;
  sent: number;
  failed: number;
  duplicates: number;
  invalid: number;
  results: BulkInviteItemResult[];
}
