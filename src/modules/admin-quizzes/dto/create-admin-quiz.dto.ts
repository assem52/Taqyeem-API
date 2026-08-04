import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateAdminQuizDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

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
}
