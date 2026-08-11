import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { QuestionType } from '../../questions/dto/create-question.dto';

export enum GenerateQuestionTypePreference {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
  OPEN_ENDED = 'OPEN_ENDED',
  MIXED = 'MIXED',
}

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class GenerateQuestionsDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  topic?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  content?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(15)
  count?: number = 5;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(GenerateQuestionTypePreference)
  typePreference?: GenerateQuestionTypePreference =
    GenerateQuestionTypePreference.MIXED;
}

export { QuestionType };
