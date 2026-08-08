import {
  Controller,
  ForbiddenException,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IntegrityCaptureService } from './integrity-capture.service';
import { StudentAuthGuard } from '../../auth/guards/student-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('attempts')
@UseGuards(StudentAuthGuard)
export class IntegrityCaptureController {
  constructor(private readonly captureService: IntegrityCaptureService) {}

  @Post(':attemptId/integrity-events/visibility-lost')
  @HttpCode(200)
  async recordVisibilityLost(
    @Param('attemptId') attemptId: string,
    @CurrentUser('studentId') studentId: string,
  ) {
    const result = await this.captureService.recordVisibilityLost(
      attemptId,
      studentId,
    );

    if (result === 'forbidden') {
      throw new ForbiddenException('This attempt does not belong to you.');
    }

    return { received: true };
  }
}
