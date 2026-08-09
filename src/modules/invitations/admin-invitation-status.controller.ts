import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin-quizzes/guards/admin.guard';
import { AdminInvitationStatusService } from './admin-invitation-status.service';
import {
  InvitationStatusListDto,
  InvitationStatusListQueryDto,
} from './dto/invitation-status-list.dto';
import { BulkInviteDto, BulkInviteResponseDto } from './dto/bulk-invite.dto';

@Controller()
@UseGuards(AdminGuard)
export class AdminInvitationStatusController {
  constructor(
    private readonly adminInvitationStatusService: AdminInvitationStatusService,
  ) {}

  @Get('admin/invitations/status')
  getInvitationStatus(
    @Query() query: InvitationStatusListQueryDto,
  ): Promise<InvitationStatusListDto> {
    return this.adminInvitationStatusService.getInvitationStatus(query.quizId);
  }

  @Get('admin/quizzes/:quizId/invitations')
  getQuizInvitations(
    @Param('quizId') quizId: string,
  ): Promise<InvitationStatusListDto> {
    return this.adminInvitationStatusService.getInvitationStatus(quizId);
  }

  @Post('admin/quizzes/:quizId/invitations/bulk')
  bulkInviteStudents(
    @Param('quizId') quizId: string,
    @Body() dto: BulkInviteDto,
  ): Promise<BulkInviteResponseDto> {
    return this.adminInvitationStatusService.bulkInviteStudents(
      quizId,
      dto.emails,
    );
  }

  @Post('admin/quizzes/:quizId/invitations/:invitationId/resend')
  resendInvitation(
    @Param('quizId') quizId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.adminInvitationStatusService.resendInvitation(
      quizId,
      invitationId,
    );
  }
}
