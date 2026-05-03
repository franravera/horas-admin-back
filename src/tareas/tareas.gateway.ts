import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { TareasService } from './tareas.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TareasGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly tareasService: TareasService) {}

  private projectRoom(proyectoId: string) {
    return `project-chat:${proyectoId}`;
  }

  handleConnection(client: Socket) {
    const userId = String(client.handshake.query.userId || '').trim();
    if (userId) {
      client.join(`user:${userId}`);
      void this.emitUserNotifications(userId);
    }
  }

  @SubscribeMessage('tareas:join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId?: string },
  ) {
    const userId = String(payload?.userId || '').trim();
    if (!userId) return;
    client.join(`user:${userId}`);
    await this.emitUserNotifications(userId);
  }

  @SubscribeMessage('tareas:chat:join')
  async joinProjectChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId?: string; projectId?: string },
  ) {
    const userId = String(payload?.userId || '').trim();
    const projectId = String(payload?.projectId || '').trim();
    if (!userId || !projectId) return;

    const allowed = await this.tareasService.canJoinProjectChat(projectId, userId);
    if (!allowed) return;

    client.join(this.projectRoom(projectId));
  }

  @SubscribeMessage('tareas:chat:typing')
  async typing(
    @ConnectedSocket() _client: Socket,
    @MessageBody()
    payload: {
      userId?: string;
      userName?: string;
      avatar?: string | null;
      projectId?: string;
      isTyping?: boolean;
    },
  ) {
    const userId = String(payload?.userId || '').trim();
    const projectId = String(payload?.projectId || '').trim();
    if (!userId || !projectId) return;

    const allowed = await this.tareasService.canJoinProjectChat(projectId, userId);
    if (!allowed) return;

    this.server.to(this.projectRoom(projectId)).emit('tareas:chat:typing', {
      userId,
      projectId,
      userName: payload?.userName || 'Usuario',
      avatar: payload?.avatar ?? null,
      isTyping: !!payload?.isTyping,
      at: new Date().toISOString(),
    });
  }

  async emitUserNotifications(userId: string) {
    const data = await this.tareasService.getNotifications(userId);
    this.server.to(`user:${userId}`).emit('tareas-notifications', data);
  }

  emitProjectChatMessage(proyectoId: string, message: any) {
    this.server.to(this.projectRoom(proyectoId)).emit('tareas:chat:new-message', message);
  }
}
