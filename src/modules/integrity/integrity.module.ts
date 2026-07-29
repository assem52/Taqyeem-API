import { Module } from '@nestjs/common';
import { IntegrityCaptureController } from './integrity-capture.controller';
import { IntegrityCaptureService } from './integrity-capture.service';
import { IntegrityReviewController } from './integrity-review.controller';
import { IntegrityReviewService } from './integrity-review.service';

@Module({
  controllers: [IntegrityCaptureController, IntegrityReviewController],
  providers: [IntegrityCaptureService, IntegrityReviewService],
})
export class IntegrityModule {}
