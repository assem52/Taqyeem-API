import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { StudentInvitationsService } from './student-invitations.service';
import { StudentInvitationDto } from './dto/student-invitation.dto';
import { StudentAuthGuard } from '../../auth/guards/student-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('student/invitations')
export class StudentInvitationsController {
  constructor(
    private readonly studentInvitationsService: StudentInvitationsService,
  ) {}

  /** Public preview — anyone with the link can see quiz metadata. */
  @Get(':token')
  async getInvitation(
    @Param('token') token: string,
  ): Promise<StudentInvitationDto> {
    return this.studentInvitationsService.getInvitation(token);
  }

  /** Requires student identity; creates Enrollment when emails match. */
  @Post(':token/accept')
  @UseGuards(StudentAuthGuard)
  async acceptInvitation(
    @Param('token') token: string,
    @CurrentUser('studentId') studentId: string,
  ) {
    return this.studentInvitationsService.acceptInvitation(token, studentId);
  }
}
