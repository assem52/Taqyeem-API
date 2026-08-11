import { Test, TestingModule } from '@nestjs/testing';
import { IntegrityCaptureService } from './integrity-capture.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('IntegrityCaptureService', () => {
  let service: IntegrityCaptureService;

  const mockPrismaService = {
    attempt: { findUnique: jest.fn() },
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
    jest.clearAllMocks();
  });

  describe('recordVisibilityLost', () => {
    it('SECURITY: returns "forbidden" when the claimed studentId does not own the attempt, and does not write a row', async () => {
      mockPrismaService.attempt.findUnique.mockResolvedValue({
        id: 'victim-attempt',
        studentId: 'victim-student',
        status: 'IN_PROGRESS',
      });

      const result = await service.recordVisibilityLost(
        'victim-attempt',
        'attacker-claims-this-id',
      );

      expect(result).toBe('forbidden');
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('returns "ignored" (not "forbidden") for a submitted attempt, regardless of who claims it', async () => {
      mockPrismaService.attempt.findUnique.mockResolvedValue({
        id: 'attempt-1',
        studentId: 'student-1',
        status: 'SUBMITTED',
      });

      const result = await service.recordVisibilityLost(
        'attempt-1',
        'student-1',
      );

      expect(result).toBe('ignored');
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('returns "ignored" for a nonexistent attempt', async () => {
      mockPrismaService.attempt.findUnique.mockResolvedValue(null);

      const result = await service.recordVisibilityLost(
        'does-not-exist',
        'student-1',
      );

      expect(result).toBe('ignored');
    });

    it('returns "accepted" and invokes the atomic insert when ownership matches', async () => {
      mockPrismaService.attempt.findUnique.mockResolvedValue({
        id: 'attempt-1',
        studentId: 'student-1',
        status: 'IN_PROGRESS',
      });

      mockPrismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.recordVisibilityLost(
        'attempt-1',
        'student-1',
      );

      expect(result).toBe('accepted');
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);

      const [sqlParts] = mockPrismaService.$executeRaw.mock.calls[0];
      const sql = Array.isArray(sqlParts)
        ? sqlParts.join('')
        : String(sqlParts);

      expect(sql).toContain('IN_PROGRESS');
      expect(sql).toContain('"studentId" =');
      expect(sql).toContain('NOT EXISTS');
      expect(sql).toContain("INTERVAL '2 seconds'");
    });

    it('returns "accepted" even when the DB insert fails and is swallowed — same label as a real write, by design', async () => {
      mockPrismaService.attempt.findUnique.mockResolvedValue({
        id: 'attempt-1',
        studentId: 'student-1',
        status: 'IN_PROGRESS',
      });

      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => undefined);

      const dbError = new Error('Database error during raw execute');
      mockPrismaService.$executeRaw.mockRejectedValue(dbError);

      const result = await service.recordVisibilityLost(
        'attempt-1',
        'student-1',
      );

      expect(result).toBe('accepted');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempt-1'),
        dbError.stack,
      );
    });
  });

  describe('additional integrity events', () => {
    it('records COPY for an active owned attempt', async () => {
      mockPrismaService.attempt.findUnique.mockResolvedValue({
        id: 'attempt-1',
        studentId: 'student-1',
        status: 'IN_PROGRESS',
      });

      mockPrismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.recordCopy(
        'attempt-1',
        'student-1',
      );

      expect(result).toBe('accepted');
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);

      const callArgs = mockPrismaService.$executeRaw.mock.calls[0];
      expect(callArgs).toContain('COPY');
    });

    it('records SCREENSHOT for an active owned attempt', async () => {
      mockPrismaService.attempt.findUnique.mockResolvedValue({
        id: 'attempt-1',
        studentId: 'student-1',
        status: 'IN_PROGRESS',
      });

      mockPrismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.recordScreenshot(
        'attempt-1',
        'student-1',
      );

      expect(result).toBe('accepted');
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);

      const callArgs = mockPrismaService.$executeRaw.mock.calls[0];
      expect(callArgs).toContain('SCREENSHOT');
    });
  });
});