import { readFileSync } from 'fs';
import { join } from 'path';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { HorasService } from './horas.service';

@Injectable()
export class HorasWeeklyReminderService {
  private readonly logger = new Logger(HorasWeeklyReminderService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly horasService: HorasService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 0 9 * * 1', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async sendPreviousWeekPendingHoursEmails() {
    const activeUsers = await this.userRepo.find({
      where: { is_active: true },
      select: ['id', 'email', 'first_name', 'last_name'],
    });

    if (activeUsers.length === 0) {
      this.logger.log('No hay usuarios activos para evaluar recordatorios semanales de horas.');
      return {
        totalActiveUsers: 0,
        skippedWithoutEmail: 0,
        pendingUsers: 0,
        sent: 0,
        failed: 0,
      };
    }

    let sent = 0;
    let failed = 0;
    let skippedWithoutEmail = 0;
    let pendingUsers = 0;

    for (const user of activeUsers) {
      if (!user.email) {
        skippedWithoutEmail += 1;
        continue;
      }

      try {
        const summary = await this.horasService.getPreviousWeekPendingSummary(user.id);
        if (summary.missing.length === 0) continue;
        pendingUsers += 1;

        const templatesPath = this.configService.get<string>('FILES_TEMPLATES') || './static/templates';
        const logoPath = join(process.cwd(), templatesPath, '18dev-blanco.png');

        await this.mailerService.sendMail({
          from: this.configService.get<string>('SMTP_FROM_ADDRESS'),
          to: user.email,
          subject: 'Te faltan completar horas de la semana pasada',
          html: this.buildEmailHtml({
            user,
            desde: summary.desde,
            hasta: summary.hasta,
            requiredHoursPerDay: summary.requiredHoursPerDay,
            missing: summary.missing,
          }),
          attachments: [
            {
              filename: '18dev-blanco.png',
              path: logoPath,
              cid: 'horas-logo-white',
            },
          ],
        });

        sent += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`No se pudo enviar el recordatorio semanal a ${user.email}: ${message}`);
      }
    }

    this.logger.log(`Recordatorios semanales de horas enviados: ${sent}`);

    return {
      totalActiveUsers: activeUsers.length,
      skippedWithoutEmail,
      pendingUsers,
      sent,
      failed,
    };
  }

  private buildEmailHtml(params: {
    user: Pick<User, 'email' | 'first_name' | 'last_name'>;
    desde: string;
    hasta: string;
    requiredHoursPerDay: number;
    missing: Array<{ fecha: string; faltanHoras: number }>;
  }) {
    const { user, desde, hasta, requiredHoursPerDay, missing } = params;
    const baseUrl = (this.configService.get<string>('APP_BASE_URL') || 'https://vps-5859241-x.dattaweb.com')
      .trim()
      .replace(/\/+$/, '');
    const templatesPath = this.configService.get<string>('FILES_TEMPLATES') || './static/templates';
    const filePath = join(process.cwd(), templatesPath, 'weekly-hours-reminder.html');
    const template = readFileSync(filePath, 'utf-8');

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    const displayName = fullName || user.email;
    const periodLabel = `${this.formatDate(desde)} al ${this.formatDate(hasta)}`;
    const ctaUrl = baseUrl;
    const missingRows = missing
      .map(
        (item) => `
          <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">
              ${this.formatWeekday(item.fecha)}
            </td>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 14px; text-align: right;">
              ${item.faltanHoras.toFixed(2)} hs pendientes
            </td>
          </tr>
        `,
      )
      .join('');

    return template
      .replace(/{{USER_NAME}}/g, this.escapeHtml(displayName))
      .replace(/{{PERIOD_LABEL}}/g, this.escapeHtml(periodLabel))
      .replace(/{{REQUIRED_HOURS}}/g, this.escapeHtml(String(requiredHoursPerDay)))
      .replace(/{{MISSING_ROWS}}/g, missingRows)
      .replace(/{{CTA_URL}}/g, ctaUrl)
      .replace(/{{BASE_URL}}/g, baseUrl)
      .replace(/{{LOGO_WHITE_URL}}/g, 'cid:horas-logo-white');
  }

  private formatDate(value: string) {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
  }

  private formatWeekday(value: string) {
    const date = new Date(`${value}T00:00:00`);
    const weekday = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(date);
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${this.formatDate(value)}`;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
