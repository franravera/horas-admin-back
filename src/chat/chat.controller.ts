import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators';
import { ApiFile } from '../system/files-manager/decorators/api-file.decorator';
import { ValidMymeTypes } from '../system/files-manager/interfaces';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@Auth()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('messages')
  list(
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatService.findMessages(Number(limit) || 100, before);
  }

  @Get('stickers/search')
  async stickersSearch(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.chatService.searchStickers(q, Number(limit) || 12);
    return { data, total: data.length };
  }

  @Post('messages')
  async create(@Req() req: any, @Body() dto: CreateChatMessageDto) {
    const message = await this.chatService.createMessage(req.user.id, dto);
    this.chatGateway.emitNewMessage(message);

    await this.chatGateway.emitUnreadToAll(req.user.id);
    await this.chatGateway.emitUnreadToUser(req.user.id);

    return message;
  }

  @Post('messages/upload')
  @ApiFile('image', [...ValidMymeTypes.image], true)
  uploadImage(@UploadedFile() image: Express.Multer.File) {
    if (!image?.filename) {
      throw new BadRequestException('Imagen inválida');
    }

    return {
      filename: image.filename,
      url: `/uploads/${image.filename}`,
      mimeType: image.mimetype,
      size: image.size,
    };
  }

  @Get('unread-count')
  unread(@Req() req: any) {
    return this.chatService.getUnreadCount(req.user.id);
  }

  @Post('read')
  async markRead(@Req() req: any) {
    const data = await this.chatService.markRead(req.user.id);
    await this.chatGateway.emitUnreadToUser(req.user.id);
    return data;
  }
}
