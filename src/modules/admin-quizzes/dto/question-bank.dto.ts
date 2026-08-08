import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';
import { CreateQuestionDto } from '../../questions/dto/create-question.dto';

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}

export class ReorderQuestionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  questionIds!: string[];
}

export class SetQuestionVisibilityDto {
  @IsBoolean()
  isHidden!: boolean;
}

export class DuplicateQuizDto {
  @IsOptional()
  @IsString()
  title?: string;
}
