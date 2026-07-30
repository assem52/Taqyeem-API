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

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}