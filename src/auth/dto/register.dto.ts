import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

enum Role {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
}

export class RegisterDto {
  @IsEmail()
  email = '';

  @IsString()
  @MinLength(6)
  password = '';

  @IsString()
  name = '';

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}