import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StudentInvitationDto } from './dto/student-invitation.dto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class StudentInvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getInvitation(token: string): Promise<StudentInvitationDto> {
    const { quiz } = await this.loadOpenInvitation(token);

    return {
      quizId: quiz.id,
      title: quiz.title,
      description: quiz.description ?? '',
      instructions: quiz.instructions ?? null,
      durationMinutes: quiz.duration,
      opensAt: quiz.openDate.toISOString(),
      closesAt: quiz.closesAt.toISOString(),
    };
  }

  /**
   * Turns an invitation into an Enrollment for the logged-in student.
   * Email on the invite must match the student's email (case-insensitive).
   */
  async acceptInvitation(token: string, studentId: string) {
    const { invitation, quiz } = await this.loadOpenInvitation(token);

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found.');
    }

    if (normalizeEmail(student.email) !== normalizeEmail(invitation.email)) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address.',
      );
    }

    await this.prisma.enrollment.upsert({
      where: {
        quizId_studentId: { quizId: quiz.id, studentId: student.id },
      },
      create: { quizId: quiz.id, studentId: student.id },
      update: {},
    });

    return {
      quizId: quiz.id,
      enrolled: true,
      message: 'Invitation accepted. You are enrolled in this quiz.',
    };
  }

  private async loadOpenInvitation(token: string) {
    if (!token || !UUID_RE.test(token)) {
      throw new BadRequestException('Invalid invitation token format.');
    }

    const invitation = await this.prisma.invitation.findUnique({
      where: { id: token },
      include: { quiz: true },
    });

    if (!invitation || !invitation.quiz) {
      throw new NotFoundException('Invitation token is invalid or expired.');
    }

    const quiz = invitation.quiz;

    if (quiz.status !== 'PUBLISHED') {
      throw new NotFoundException('This quiz link is invalid or unavailable.');
    }

    const now = new Date();
    if (now > quiz.closesAt) {
      throw new BadRequestException('This quiz has closed.');
    }

    return { invitation, quiz };
  }
}
