import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { StudentAuthGuard } from './guards/student-auth.guard';
import { AdminGuard } from '../modules/admin-quizzes/guards/admin.guard';
import { PrismaModule } from '../common/prisma/prisma.module';
import { requireJwtSecret } from './jwt.config';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: requireJwtSecret(),
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, JwtStrategy, StudentAuthGuard, AdminGuard],
  controllers: [AuthController],
  // Export guards + Jwt so feature modules can dual-auth without re-registering secrets.
  exports: [JwtModule, PassportModule, StudentAuthGuard, AdminGuard],
})
export class AuthModule {}
