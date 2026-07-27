import { PartialType } from '@nestjs/mapped-types';
import { CreateAdminFollowUpDto } from './create-admin-follow-up.dto';

export class UpdateAdminFollowUpDto extends PartialType(CreateAdminFollowUpDto) {}
