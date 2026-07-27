import { Injectable } from '@nestjs/common';
import { CreateAdminFollowUpDto } from './dto/create-admin-follow-up.dto';
import { UpdateAdminFollowUpDto } from './dto/update-admin-follow-up.dto';

@Injectable()
export class AdminFollowUpService {
  create(createAdminFollowUpDto: CreateAdminFollowUpDto) {
    return 'This action adds a new adminFollowUp';
  }

  findAll() {
    return `This action returns all adminFollowUp`;
  }

  findOne(id: number) {
    return `This action returns a #${id} adminFollowUp`;
  }

  update(id: number, updateAdminFollowUpDto: UpdateAdminFollowUpDto) {
    return `This action updates a #${id} adminFollowUp`;
  }

  remove(id: number) {
    return `This action removes a #${id} adminFollowUp`;
  }
}
