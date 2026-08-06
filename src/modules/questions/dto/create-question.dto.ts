import { IsString, IsEnum, IsArray, ValidateNested, IsBoolean, ArrayMinSize, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export enum QuestionType {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
  OPEN_ENDED = 'OPEN_ENDED',
}

export class QuizOptionDto {
  @IsString()
  @IsNotEmpty()
  option!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  @ArrayMinSize(2, { message: 'MCQ questions must have at least two options.' })
  options!: QuizOptionDto[];
}