// src/modules/search/search.module.ts
import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { EmbeddingsModule } from '../../../modules/embeddings/embeddings.module';
import { AuthModule } from '../../../auth/auth.module';

@Module({
  imports: [EmbeddingsModule, AuthModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
