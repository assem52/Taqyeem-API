import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StudentInvitationDto } from './dto/student-invitation.dto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class StudentInvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getInvitation(token: string): Promise<StudentInvitationDto> {
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
}
