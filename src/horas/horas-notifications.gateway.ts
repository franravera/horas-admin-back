import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { HorasService } from './horas.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class HorasNotificationsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly horasService: HorasService) {}

  handleConnection(client: Socket) {
    const userId = String(client.handshake.query.userId || '').trim();
    if (userId) {
      client.join(`user:${userId}`);
      this.emitUserNotifications(userId);
    }
  }

  @SubscribeMessage('horas:join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId?: string },
  ) {
    const userId = String(payload?.userId || '').trim();
    if (!userId) return;
    client.join(`user:${userId}`);
    await this.emitUserNotifications(userId);
  }

  async emitUserNotifications(userId: string) {
    const data = await this.horasService.getMisNotificaciones(userId, 'user');
    this.server.to(`user:${userId}`).emit('horas-notifications', data);
  }
}
