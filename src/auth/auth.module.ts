import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
})
class AuthModule {}

export { AuthModule };