import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ResultsPolicy } from '@prisma/client';

/**
 * PATCH /admin/quizzes/:id body.
 * When attempts exist, structure fields are locked (enforced in service).
 * Soft settings (title, description, instructions, integrity, results policy) stay editable.
 */
export class UpdateAdminQuizDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsString()
  openDate?: string;

  @IsOptional()
  @IsString()
  closesAt?: string;

  @IsOptional()
  @IsNumber()
  passScore?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  integrityThreshold?: number;

  @IsOptional()
  @IsEnum(ResultsPolicy)
  resultsPolicy?: ResultsPolicy;
}

export const ATTEMPT_LOCK_MESSAGE =
  'This quiz has student attempts. Duplicate the quiz to make structural changes.';
