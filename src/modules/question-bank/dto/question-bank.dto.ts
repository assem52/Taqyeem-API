import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { CreateQuestionDto } from '../../questions/dto/create-question.dto';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

export class CreateBankQuestionDto extends CreateQuestionDto {
  @IsUUID()
  categoryId!: string;
}

export class UpdateBankQuestionDto extends PartialType(CreateBankQuestionDto) {}

export class QueryBankQuestionsDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  q?: string;
}

export class AddBankQuestionsToQuizDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  bankQuestionIds!: string[];
}
