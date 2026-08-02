import { Module } from '@nestjs/common';
import { AdminInvitationStatusController } from './admin-invitation-status.controller';
import { AdminInvitationStatusService } from './admin-invitation-status.service';

@Module({
  controllers: [AdminInvitationStatusController],
  providers: [AdminInvitationStatusService],
})
export class InvitationsModule {}
