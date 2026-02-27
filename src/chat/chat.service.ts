import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChatMessage } from './entities/chat-message.entity';
import { ChatUserState } from './entities/chat-user-state.entity';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private tenorDisabled = false;
  private giphyDisabled = false;

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

  async searchStickers(query?: string, limit = 12) {
    const safeLimit = Math.max(1, Math.min(20, Number(limit) || 12));
    const q = String(query || '').trim();
    const normalizedQ = q.toLowerCase();

    const fallbackStickers = [
      { id: 'fb-1', description: 'hola hi wave', fullUrl: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif' },
      { id: 'fb-2', description: 'ok perfecto yes', fullUrl: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
      { id: 'fb-3', description: 'gracias thanks', fullUrl: 'https://media.giphy.com/media/3oEdva9BUHPIs2SkGk/giphy.gif' },
      { id: 'fb-4', description: 'feliz happy', fullUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
      { id: 'fb-5', description: 'meme lol', fullUrl: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif' },
      { id: 'fb-6', description: 'wow', fullUrl: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif' },
      { id: 'fb-7', description: 'no fail', fullUrl: 'https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif' },
      { id: 'fb-8', description: 'si yes', fullUrl: 'https://media.giphy.com/media/3o6UB3VhArvomJHtdK/giphy.gif' },
      { id: 'fb-9', description: 'aplausos clap', fullUrl: 'https://media.giphy.com/media/nbvFVPiEiJH6JOGIok/giphy.gif' },
      { id: 'fb-10', description: 'fuego fire', fullUrl: 'https://media.giphy.com/media/5nsiFjdgylfK3csZ5T/giphy.gif' },
      { id: 'fb-11', description: 'amor love', fullUrl: 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif' },
      { id: 'fb-12', description: 'triste sad', fullUrl: 'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif' },
      { id: 'fb-13', description: 'bravo nice', fullUrl: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
      { id: 'fb-14', description: 'what que', fullUrl: 'https://media.giphy.com/media/l3q2SaisWTeZnV9wk/giphy.gif' },
      { id: 'fb-15', description: 'vamos go', fullUrl: 'https://media.giphy.com/media/2RGhmKXcl0ViM/giphy.gif' },
    ];

    const pickFallback = () => {
      const base = normalizedQ
        ? fallbackStickers.filter((s) => s.description.includes(normalizedQ))
        : fallbackStickers;
      return (base.length ? base : normalizedQ ? [] : fallbackStickers)
        .slice(0, safeLimit)
        .map((s) => ({
          id: s.id,
          previewUrl: s.fullUrl,
          fullUrl: s.fullUrl,
          description: s.description,
        }));
    };

    const scrapeTenorWeb = async () => {
      try {
        const url = q
          ? `https://tenor.com/search/${encodeURIComponent(q)}-gifs`
          : 'https://tenor.com/featured';
        const { data } = await axios.get<string>(url, {
          timeout: 10000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36',
          },
        });

        const html = String(data || '');
        const found = html.match(/https:\/\/media\.tenor\.com\/[^"'\\s]+?\.gif/gi) || [];
        const unique = Array.from(new Set(found)).slice(0, safeLimit);

        return unique.map((gifUrl, i) => ({
          id: `tenor-web-${i}-${gifUrl.slice(-16)}`,
          previewUrl: gifUrl,
          fullUrl: gifUrl,
          description: q || 'featured',
        }));
      } catch {
        return [];
      }
    };

    const key = process.env.TENOR_API_KEY;
    const endpoint = q
      ? 'https://tenor.googleapis.com/v2/search'
      : 'https://tenor.googleapis.com/v2/featured';

    if (!this.tenorDisabled && key) {
      try {
        const params: Record<string, any> = {
          key,
          client_key: 'horas_admin_chat',
          locale: 'es',
          contentfilter: 'medium',
          media_filter: 'minimal',
          limit: safeLimit,
        };
        if (q) params.q = q;

        const { data } = await axios.get(endpoint, {
          params,
          timeout: 10000,
        });

        const rows = (data?.results || [])
          .map((r: any) => ({
            id: String(r?.id || ''),
            previewUrl:
              r?.media_formats?.tinygif?.url ||
              r?.media_formats?.gifpreview?.url ||
              r?.media_formats?.gif?.url ||
              '',
            fullUrl: r?.media_formats?.gif?.url || r?.media_formats?.tinygif?.url || '',
            description: r?.content_description || '',
          }))
          .filter((x: any) => !!x.id && !!x.previewUrl && !!x.fullUrl);

        if (rows.length) return rows;
      } catch (err: any) {
        const status = err?.response?.status;
        const detail = err?.response?.data
          ? JSON.stringify(err.response.data)
          : err?.message || 'unknown';
        const invalidKey =
          err?.response?.data?.error?.details?.some?.(
            (d: any) => d?.reason === 'API_KEY_INVALID',
          ) || String(detail).includes('API key not valid');

        if (invalidKey) {
          this.tenorDisabled = true;
          this.logger.warn('Tenor API key inválida. Se desactiva Tenor para esta sesión.');
        } else {
          this.logger.warn(`Tenor stickers failed (${status ?? 'no-status'}): ${detail}`);
        }
      }
    }

    const giphyKey = process.env.GIPHY_API_KEY;
    if (!this.giphyDisabled && giphyKey) {
      try {
        const giphyEndpoint = q
          ? 'https://api.giphy.com/v1/gifs/search'
          : 'https://api.giphy.com/v1/gifs/trending';

        const { data } = await axios.get(giphyEndpoint, {
          params: {
            api_key: giphyKey,
            q: q || undefined,
            limit: safeLimit,
            rating: 'pg-13',
            lang: 'es',
          },
          timeout: 10000,
        });

        const rows = (data?.data || [])
          .map((r: any) => ({
            id: String(r?.id || ''),
            previewUrl:
              r?.images?.fixed_height_small?.url ||
              r?.images?.fixed_height?.url ||
              r?.images?.original?.url ||
              '',
            fullUrl:
              r?.images?.original?.url ||
              r?.images?.fixed_height?.url ||
              r?.images?.fixed_height_small?.url ||
              '',
            description: r?.title || '',
          }))
          .filter((x: any) => !!x.id && !!x.previewUrl && !!x.fullUrl);

        if (rows.length) return rows;
      } catch (err: any) {
        this.giphyDisabled = true;
        const status = err?.response?.status;
        const detail = err?.response?.data
          ? JSON.stringify(err.response.data)
          : err?.message || 'unknown';
        this.logger.warn(`Giphy stickers failed (${status ?? 'no-status'}): ${detail}`);
      }
    }

    const webRows = await scrapeTenorWeb();
    if (webRows.length) return webRows;

    return pickFallback();
  }
}
