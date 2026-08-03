import { Module } from '@nestjs/common';
import { AdminInvitationStatusController } from './admin-invitation-status.controller';
import { AdminInvitationStatusService } from './admin-invitation-status.service';
import { EmailService } from './email.service';

@Module({
  controllers: [AdminInvitationStatusController],
  providers: [AdminInvitationStatusService, EmailService],
  exports: [EmailService],
})
export class InvitationsModule {}
