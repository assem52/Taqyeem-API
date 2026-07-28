import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin-quizzes/guards/admin.guard';
import { AdminFollowUpService } from './admin-follow-up.service';
import {
  FollowUpListDto,
  FollowUpListQueryDto,
} from './dto/follow-up-list.dto';

@Controller('admin/follow-up')
@UseGuards(AdminGuard)
export class AdminFollowUpController {
  constructor(private readonly adminFollowUpService: AdminFollowUpService) {}

  @Get()
  getFollowUpList(
    @Query() query: FollowUpListQueryDto,
  ): Promise<FollowUpListDto> {
    return this.adminFollowUpService.getFollowUpList(query.quizId);
  }
}
