import {
  BadRequestException,
  Controller,
  ForbiddenException,
  HttpCode,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { IntegrityCaptureService } from './integrity-capture.service';

@Controller('attempts')
export class IntegrityCaptureController {
  constructor(private readonly captureService: IntegrityCaptureService) {}

  @Post(':attemptId/integrity-events/visibility-lost')
  @HttpCode(200)
  async recordVisibilityLost(
    @Param('attemptId') attemptId: string,
    @Headers('x-student-id') studentId?: string,
  ) {
    const resolvedStudentId = studentId ?? process.env.MOCK_STUDENT_ID;

    if (!resolvedStudentId) {
      throw new BadRequestException('Student identity is required.');
    }

    const result = await this.captureService.recordVisibilityLost(
      attemptId,
      resolvedStudentId,
    );

    if (result === 'forbidden') {
      throw new ForbiddenException('This attempt does not belong to you.');
    }

    return { received: true };
  }
}
