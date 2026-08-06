import { Controller, Get, Param } from '@nestjs/common';
import { StudentInvitationsService } from './student-invitations.service';
import { StudentInvitationDto } from './dto/student-invitation.dto';

@Controller('student/invitations')
export class StudentInvitationsController {
  constructor(
    private readonly studentInvitationsService: StudentInvitationsService,
  ) {}

  @Get(':token')
  async getInvitation(
    @Param('token') token: string,
  ): Promise<StudentInvitationDto> {
    return this.studentInvitationsService.getInvitation(token);
  }
}
