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
    it('should invoke $executeRaw with atomic SQL query', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      await service.recordVisibilityLost('attempt-1');

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should silently catch and swallow database errors without throwing', async () => {
      mockPrismaService.$executeRaw.mockRejectedValue(
        new Error('Database error during raw execute'),
      );

      // Asserts that the promise resolves cleanly without throwing an exception
      await expect(
        service.recordVisibilityLost('attempt-1'),
      ).resolves.not.toThrow();
    });
  });
});
