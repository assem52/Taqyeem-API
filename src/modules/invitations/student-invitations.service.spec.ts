import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StudentInvitationsService } from './student-invitations.service';

const invitationId = '11111111-2222-3333-4444-555555555555';
const quizId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('StudentInvitationsService', () => {
  let service: StudentInvitationsService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      invitation: {
        findUnique: jest.fn(),
      },
      quiz: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentInvitationsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<StudentInvitationsService>(StudentInvitationsService);
  });

  it('should throw BadRequestException for invalid non-UUID token format', async () => {
    await expect(service.getInvitation('invalid-token')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw NotFoundException if invitation token does not match any record or quiz', async () => {
    prismaMock.invitation.findUnique.mockResolvedValue(null);
    prismaMock.quiz.findUnique.mockResolvedValue(null);

    await expect(service.getInvitation(invitationId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException if quiz is not in PUBLISHED state', async () => {
    prismaMock.invitation.findUnique.mockResolvedValue({
      id: invitationId,
      quiz: {
        id: quizId,
        title: 'Draft Quiz',
        status: 'DRAFT',
        openDate: new Date(),
        closesAt: new Date(Date.now() + 86400000),
      },
    });

    await expect(service.getInvitation(invitationId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException if quiz has closed', async () => {
    prismaMock.invitation.findUnique.mockResolvedValue({
      id: invitationId,
      quiz: {
        id: quizId,
        title: 'Closed Quiz',
        status: 'PUBLISHED',
        openDate: new Date(Date.now() - 172800000),
        closesAt: new Date(Date.now() - 86400000),
      },
    });

    await expect(service.getInvitation(invitationId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should successfully resolve invitation token and return quiz metadata', async () => {
    const openDate = new Date(Date.now() - 3600000);
    const closesAt = new Date(Date.now() + 86400000);

    prismaMock.invitation.findUnique.mockResolvedValue({
      id: invitationId,
      quiz: {
        id: quizId,
        title: 'Midterm Exam',
        description: 'Semester 1 Midterm',
        instructions: 'Answer all questions.',
        duration: 45,
        openDate,
        closesAt,
        status: 'PUBLISHED',
      },
    });

    const res = await service.getInvitation(invitationId);
    expect(res).toEqual({
      quizId,
      title: 'Midterm Exam',
      description: 'Semester 1 Midterm',
      instructions: 'Answer all questions.',
      durationMinutes: 45,
      opensAt: openDate.toISOString(),
      closesAt: closesAt.toISOString(),
    });
  });
});
