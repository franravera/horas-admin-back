import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    const userId = String(client.handshake.query.userId || '').trim();
    if (!userId) return;

    client.join('chat:global');
    client.join(`user:${userId}`);

    const unread = await this.chatService.getUnreadCount(userId);
    this.server.to(`user:${userId}`).emit('chat:unread-count', unread);
  }

  @SubscribeMessage('chat:join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId?: string },
  ) {
    const userId = String(payload?.userId || '').trim();
    if (!userId) return;

    client.join('chat:global');
    client.join(`user:${userId}`);

    const unread = await this.chatService.getUnreadCount(userId);
    this.server.to(`user:${userId}`).emit('chat:unread-count', unread);
  }

  @SubscribeMessage('chat:typing')
  typing(
    @ConnectedSocket() _client: Socket,
    @MessageBody()
    payload: {
      userId?: string;
      userName?: string;
      avatar?: string | null;
      isTyping?: boolean;
    },
  ) {
    const userId = String(payload?.userId || '').trim();
    if (!userId) return;

    this.server.to('chat:global').emit('chat:typing', {
      userId,
      userName: payload?.userName || 'Usuario',
      avatar: payload?.avatar ?? null,
      isTyping: !!payload?.isTyping,
      at: new Date().toISOString(),
    });
  }

  emitNewMessage(message: any) {
    this.server.to('chat:global').emit('chat:new-message', message);
  }

  async emitUnreadToAll(excludeUserId?: string) {
    const userIds = await this.chatService.getActiveUserIdsForBroadcast();
    await Promise.all(
      userIds.map(async (userId) => {
        if (excludeUserId && userId === excludeUserId) return;
        const unread = await this.chatService.getUnreadCount(userId);
        this.server.to(`user:${userId}`).emit('chat:unread-count', unread);
      }),
    );
  }

  async emitUnreadToUser(userId: string) {
    const unread = await this.chatService.getUnreadCount(userId);
    this.server.to(`user:${userId}`).emit('chat:unread-count', unread);
  }
}
