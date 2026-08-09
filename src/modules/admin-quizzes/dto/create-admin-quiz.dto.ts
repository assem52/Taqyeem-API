import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ResultsPolicy } from '@prisma/client';

export class CreateAdminQuizDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number = 60; // duration in minutes, default 60

  @IsNotEmpty()
  @IsString()
  openDate: string;

  @IsNotEmpty()
  @IsString()
  closesAt: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
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
