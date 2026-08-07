import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class BulkInviteDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500, { message: 'Maximum 500 recipients per batch.' })
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
  deliveryMode: 'live' | 'simulated';
  results: BulkInviteItemResult[];
}
