import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import { IntegrityCaptureService } from './integrity-capture.service';

@Controller('attempts')
export class IntegrityCaptureController {
  constructor(private readonly captureService: IntegrityCaptureService) {}
  @Post(':attemptId/integrity-events/visibility-lost')
  @HttpCode(200)
  async recordVisibilityLost(@Param('attemptId') attemptId: string) {
    await this.captureService.recordVisibilityLost(attemptId);
    return { received: true };
  }
}
