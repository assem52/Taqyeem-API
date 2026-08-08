import { Module } from '@nestjs/common';
import { AdminFollowUpService } from './admin-follow-up.service';
import { AdminFollowUpController } from './admin-follow-up.controller';
import { INTEGRITY_FLAG_READER } from './adapters/integrity-flag.reader';
import { SeedIntegrityFlagAdapter } from './adapters/seed-integrity-flag.adapter';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminFollowUpController],
  providers: [
    AdminFollowUpService,
    {
      provide: INTEGRITY_FLAG_READER,
      useClass: SeedIntegrityFlagAdapter,
    },
  ],
})
export class AdminFollowUpModule {}
