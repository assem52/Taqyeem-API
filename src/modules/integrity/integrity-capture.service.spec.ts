import { Test, TestingModule } from '@nestjs/testing';
import { IntegrityCaptureService } from './integrity-capture.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('IntegrityCaptureService', () => {
  let service: IntegrityCaptureService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $executeRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrityCaptureService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<IntegrityCaptureService>(IntegrityCaptureService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('recordVisibilityLost', () => {
    it('should invoke $executeRaw once with the IN_PROGRESS eligibility guard and the 2-second dedupe window', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.recordVisibilityLost('attempt-1');

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
      const [sqlParts] = mockPrismaService.$executeRaw.mock.calls[0];
      const sql = Array.isArray(sqlParts) ? sqlParts.join('') : String(sqlParts);
      expect(sql).toContain('IN_PROGRESS');
      expect(sql).toContain('NOT EXISTS');
      expect(sql).toContain("INTERVAL '2 seconds'");
    });

    it('should silently catch database errors, log a warning, and never throw', async () => {
      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => undefined);

      const dbError = new Error('Database error during raw execute');
      mockPrismaService.$executeRaw.mockRejectedValue(dbError);

      await expect(
        service.recordVisibilityLost('attempt-1'),
      ).resolves.not.toThrow();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempt-1'),
        dbError.stack,
      );
    });
  });
});
