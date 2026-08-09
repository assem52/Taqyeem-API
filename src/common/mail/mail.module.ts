import { Global, Module } from '@nestjs/common';
import { MailTransportService } from './mail-transport.service';
import { LearnerMailService } from './learner-mail.service';

@Global()
@Module({
  providers: [MailTransportService, LearnerMailService],
  exports: [MailTransportService, LearnerMailService],
})
export class MailModule {}
