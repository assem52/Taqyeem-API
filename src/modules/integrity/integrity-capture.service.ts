import { Injectable, Logger } from '@nestjs/common';
import { IntegrityEventType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export type CaptureResult = 'accepted' | 'ignored' | 'forbidden';

@Injectable()
export class IntegrityCaptureService {
  private readonly logger = new Logger(IntegrityCaptureService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async recordEvent(
    attemptId: string,
    studentId: string,
    type: IntegrityEventType,
  ): Promise<CaptureResult> {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return 'ignored';
    }

    if (attempt.studentId !== studentId) {
      return 'forbidden';
    }

    try {
      await this.prisma.$executeRaw`
        INSERT INTO "IntegrityEvent" (id, "attemptId", type, "occurred_at")
        SELECT
          gen_random_uuid(),
          ${attemptId}::uuid,
          ${type}::"IntegrityEventType",
          NOW()
        WHERE EXISTS (
          SELECT 1
          FROM "Attempt"
          WHERE id = ${attemptId}::uuid
            AND status = 'IN_PROGRESS'::"AttemptStatus"
            AND "studentId" = ${studentId}::uuid
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "IntegrityEvent"
          WHERE "attemptId" = ${attemptId}::uuid
            AND type = ${type}::"IntegrityEventType"
            AND "occurred_at" > NOW() - INTERVAL '2 seconds'
        )
      `;
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.warn(
        `Failed to record ${type} for attempt ${attemptId}`,
        stack,
      );
    }

    return 'accepted';
  }

  async recordVisibilityLost(
    attemptId: string,
    studentId: string,
  ): Promise<CaptureResult> {
    return this.recordEvent(
      attemptId,
      studentId,
      IntegrityEventType.VISIBILITY_LOST,
    );
  }

  async recordCopy(
    attemptId: string,
    studentId: string,
  ): Promise<CaptureResult> {
    return this.recordEvent(
      attemptId,
      studentId,
      IntegrityEventType.COPY,
    );
  }

  async recordScreenshot(
    attemptId: string,
    studentId: string,
  ): Promise<CaptureResult> {
    return this.recordEvent(
      attemptId,
      studentId,
      IntegrityEventType.SCREENSHOT,
    );
  }
}