import { Module } from '@nestjs/common';
import { AdminInvitationStatusController } from './admin-invitation-status.controller';
import { AdminInvitationStatusService } from './admin-invitation-status.service';
import { StudentInvitationsController } from './student-invitations.controller';
import { StudentInvitationsService } from './student-invitations.service';
import { EmailService } from './email.service';

@Module({
  controllers: [
    AdminInvitationStatusController,
    StudentInvitationsController,
  ],
  providers: [
    AdminInvitationStatusService,
    StudentInvitationsService,
    EmailService,
  ],
  exports: [EmailService, StudentInvitationsService],
})
export class InvitationsModule {}

