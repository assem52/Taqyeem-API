import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class IntegrityCaptureService {
  private readonly logger = new Logger(IntegrityCaptureService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordVisibilityLost(attemptId: string): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO "IntegrityEvent" (id, "attemptId", type, "occurred_at")
        SELECT gen_random_uuid(), ${attemptId}::uuid, 'VISIBILITY_LOST', NOW()
        WHERE EXISTS (
          SELECT 1 FROM "Attempt"
          WHERE id = ${attemptId}::uuid AND status = 'IN_PROGRESS'::"AttemptStatus"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "IntegrityEvent"
          WHERE "attemptId" = ${attemptId}::uuid
            AND type = 'VISIBILITY_LOST'
            AND "occurred_at" > NOW() - INTERVAL '2 seconds'
        )
      `;
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.warn(
        `Failed to record visibility loss for attempt ${attemptId}`,
        stack,
      );
    }
  }
}
