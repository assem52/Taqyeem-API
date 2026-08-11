import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class OverrideEssayGradeDto {
  @IsNumber()
  @Min(0)
  awardedPoints!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
