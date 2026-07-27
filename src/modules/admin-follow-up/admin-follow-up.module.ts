import { Module } from '@nestjs/common';
import { AdminFollowUpService } from './admin-follow-up.service';
import { AdminFollowUpController } from './admin-follow-up.controller';

@Module({
  controllers: [AdminFollowUpController],
  providers: [AdminFollowUpService],
})
export class AdminFollowUpModule {}
