import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AdminFollowUpService } from './admin-follow-up.service';
import { CreateAdminFollowUpDto } from './dto/create-admin-follow-up.dto';
import { UpdateAdminFollowUpDto } from './dto/update-admin-follow-up.dto';

@Controller('admin-follow-up')
export class AdminFollowUpController {
  constructor(private readonly adminFollowUpService: AdminFollowUpService) {}

  @Get()
  findAll() {
    return this.adminFollowUpService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminFollowUpService.findOne(+id);
  }

}
