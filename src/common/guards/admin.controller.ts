import { Controller, UseGuards, Get } from '@nestjs/common';
import { RolesGuard } from './roles.guard'; 
import { Roles } from './roles.decorator'; 

@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  @Get('dashboard')
  getAdminData() {
    return { message: 'Welcome Admin' };
  }
}