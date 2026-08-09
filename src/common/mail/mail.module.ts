import { Global, Module } from '@nestjs/common';
import { MailTransportService } from './mail-transport.service';

@Global()
@Module({
  providers: [MailTransportService],
  exports: [MailTransportService],
})
export class MailModule {}
