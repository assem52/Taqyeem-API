import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin-quizzes/guards/admin.guard';
import { AdminInvitationStatusService } from './admin-invitation-status.service';
import {
  InvitationStatusListDto,
  InvitationStatusListQueryDto,
} from './dto/invitation-status-list.dto';

@Controller('admin/invitations/status')
@UseGuards(AdminGuard)
export class AdminInvitationStatusController {
  constructor(
    private readonly adminInvitationStatusService: AdminInvitationStatusService,
  ) {}

  @Get()
  getInvitationStatus(
    @Query() query: InvitationStatusListQueryDto,
  ): Promise<InvitationStatusListDto> {
    return this.adminInvitationStatusService.getInvitationStatus(query.quizId);
  }
}
