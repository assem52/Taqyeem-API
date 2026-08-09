// src/modules/search/search.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchDto } from './search.dto';
import { AdminGuard } from '../../admin-quizzes/guards/admin.guard';

@Controller('search')
@UseGuards(AdminGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async search(@Body() searchDto: SearchDto) {
    const results = await this.searchService.search(searchDto);
    return {
      success: true,
      query: searchDto.query,
      count: results.length,
      results,
    };
  }
}
