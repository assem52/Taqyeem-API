import { IsEnum, IsOptional, IsString } from 'class-validator';
import { QuizStatus } from '@prisma/client';

export class QueryAdminQuizDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(QuizStatus)
  status?: QuizStatus;
}
