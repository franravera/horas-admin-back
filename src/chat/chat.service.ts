import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChatMessage } from './entities/chat-message.entity';
import { ChatUserState } from './entities/chat-user-state.entity';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(ChatUserState)
    private readonly stateRepo: Repository<ChatUserState>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private normalizeText(value?: string | null) {
    const text = String(value ?? '').trim();
    return text ? text : null;
  }

  private mapMessage(msg: ChatMessage) {
    const fullName = `${msg.sender?.first_name ?? ''} ${msg.sender?.last_name ?? ''}`.trim();
    return {
      id: msg.id,
      text: msg.text,
      image: msg.image,
      createdAt: msg.createdAt,
      sender: {
        id: msg.senderId,
        email: msg.sender?.email ?? null,
        first_name: msg.sender?.first_name ?? null,
        last_name: msg.sender?.last_name ?? null,
        fullName: fullName || msg.sender?.email || 'Usuario',
        avatar: msg.sender?.avatar ?? null,
      },
    };
  }

  async createMessage(senderId: string, dto: CreateChatMessageDto) {
    const sender = await this.userRepo.findOne({ where: { id: senderId, is_active: true } });
    if (!sender) throw new NotFoundException('Usuario no encontrado');

    const text = this.normalizeText(dto.text);
    const image = dto.image ? String(dto.image).trim() : null;

    if (!text && !image) {
      throw new BadRequestException('El mensaje está vacío');
    }

    const created = await this.messageRepo.save(
      this.messageRepo.create({
        senderId,
        text,
        image,
      }),
    );

    const full = await this.messageRepo.findOne({ where: { id: created.id } });
    if (!full) throw new NotFoundException('No se pudo crear el mensaje');
    return this.mapMessage(full);
  }

  async findMessages(limit = 100, before?: string) {
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 100));
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 'sender')
      .orderBy('m.createdAt', 'DESC')
      .take(safeLimit);

    if (before) {
      qb.andWhere('m.createdAt < :before', { before });
    }

    const rows = await qb.getMany();
    const data = rows.reverse().map((m) => this.mapMessage(m));
    return { data, total: data.length };
  }

  async markRead(userId: string) {
    const now = new Date();
    let state = await this.stateRepo.findOne({ where: { userId } });

    if (!state) {
      state = this.stateRepo.create({ userId, lastReadAt: now });
    } else {
      state.lastReadAt = now;
    }

    await this.stateRepo.save(state);
    return { ok: true, lastReadAt: now };
  }

  async getUnreadCount(userId: string) {
    const state = await this.stateRepo.findOne({ where: { userId } });

    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where('m.senderId <> :userId', { userId });

    if (state?.lastReadAt) {
      qb.andWhere('m.createdAt > :lastReadAt', { lastReadAt: state.lastReadAt });
    }

    const count = await qb.getCount();
    return { count };
  }

  async getActiveUserIdsForBroadcast(excludeUserId?: string) {
    const rows = await this.userRepo.find({
      where: { is_active: true },
      select: ['id'],
    });

    return rows
      .map((u) => u.id)
      .filter((id) => (excludeUserId ? id !== excludeUserId : true));
  }
}
