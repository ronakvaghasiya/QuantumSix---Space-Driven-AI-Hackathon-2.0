import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import {
  SaveEmbeddingProviderDto,
  SaveHuggingFaceKeyDto,
  SaveOpenAiKeyDto,
} from './dto/settings.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('embedding')
  @ApiOperation({ summary: 'Get embedding provider and API key status' })
  getEmbeddingStatus() {
    return this.settingsService.getEmbeddingStatus();
  }

  @Post('embedding/provider')
  @ApiOperation({ summary: 'Set active embedding provider (openai | huggingface)' })
  saveEmbeddingProvider(@Body() dto: SaveEmbeddingProviderDto) {
    return this.settingsService.saveEmbeddingProvider(dto.provider);
  }

  @Get('openai')
  @ApiOperation({ summary: 'Get OpenAI API key configuration status' })
  getOpenAiStatus() {
    return this.settingsService.getOpenAiStatus();
  }

  @Post('openai')
  @ApiOperation({ summary: 'Save OpenAI API key' })
  saveOpenAiKey(@Body() dto: SaveOpenAiKeyDto) {
    return this.settingsService.saveOpenAiKey(dto.apiKey);
  }

  @Delete('openai')
  @ApiOperation({ summary: 'Remove saved OpenAI API key from database' })
  async clearOpenAiKey() {
    await this.settingsService.clearOpenAiKey();
    return { cleared: true };
  }

  @Get('huggingface')
  @ApiOperation({ summary: 'Get Hugging Face token configuration status' })
  getHuggingFaceStatus() {
    return this.settingsService.getHuggingFaceStatus();
  }

  @Post('huggingface')
  @ApiOperation({ summary: 'Save Hugging Face token for embeddings' })
  saveHuggingFaceKey(@Body() dto: SaveHuggingFaceKeyDto) {
    return this.settingsService.saveHuggingFaceKey(dto.apiKey, dto.model);
  }

  @Delete('huggingface')
  @ApiOperation({ summary: 'Remove saved Hugging Face token from database' })
  async clearHuggingFaceKey() {
    await this.settingsService.clearHuggingFaceKey();
    return { cleared: true };
  }
}
