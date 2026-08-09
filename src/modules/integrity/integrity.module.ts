import { Module } from '@nestjs/common';
import { IntegrityCaptureController } from './integrity-capture.controller';
import { IntegrityCaptureService } from './integrity-capture.service';
import { IntegrityReviewController } from './integrity-review.controller';
import { IntegrityReviewService } from './integrity-review.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [IntegrityCaptureController, IntegrityReviewController],
  providers: [IntegrityCaptureService, IntegrityReviewService],
  exports: [IntegrityReviewService],
})
export class IntegrityModule {}
