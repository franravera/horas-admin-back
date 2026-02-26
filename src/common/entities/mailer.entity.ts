export class Mailer {
  from: string = null;

  to: string;

  cc: string = null;

  bcc: string = null;

  subject: string;

  html: string;

  attachments: any[] = [];
}
