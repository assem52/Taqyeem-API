import { Test, TestingModule } from '@nestjs/testing';
import { IntegrityCaptureService } from './integrity-capture.service';
import { PrismaService } from '../../prisma/prisma.service';
describe('IntegrityCaptureService', () => {
  let service: IntegrityCaptureService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $executeRaw: jest.fn(),
    attempt: {
      findUnique: jest.fn(),
    },
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
    it('should skip recording if the attempt is already SUBMITTED', async () => {
      mockPrismaService.attempt.findUnique.mockResolvedValue({
        id: 'attempt-1',
        status: 'SUBMITTED',
      });

      await service.recordVisibilityLost('attempt-1');

      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('should execute atomic insert query for an IN_PROGRESS attempt', async () => {
      mockPrismaService.attempt.findUnique.mockResolvedValue({
        id: 'attempt-1',
        status: 'IN_PROGRESS',
      });
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.recordVisibilityLost('attempt-1');

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should swallow database errors and never crash', async () => {
      mockPrismaService.attempt.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      // Asserts that the promise resolves without throwing an error
      await expect(
        service.recordVisibilityLost('attempt-1'),
      ).resolves.not.toThrow();
    });
  });
});
