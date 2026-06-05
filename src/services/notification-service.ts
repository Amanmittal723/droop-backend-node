/**
 * Purpose: Recreate the database-side notification writes and keep external push delivery optional.
 * Expected request body: Notification text, recipient ids, and optional dual or sender metadata.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Side effects only; callers return legacy endpoint payloads.
 */
import { PrismaClient } from "@prisma/client";

type CreateNotificationInput = {
  text: string;
  sentTo: string;
  dual: string;
  dualId?: string;
  sharedBy?: string;
  notificationType?: number;
  dateTime: string | Date;
};

export class NotificationService {
  public constructor(private readonly prismaClient: PrismaClient) {}

  public async createNotification(input: CreateNotificationInput): Promise<void> {
    await this.prismaClient.$executeRaw`
      INSERT INTO notifications_master
        (notification_txt, notification_type, notification_sent_to, notification_dual, notification_dual_id, shared_by, date_time)
      VALUES
        (
          ${input.text},
          ${input.notificationType ?? 0},
          ${input.sentTo},
          ${input.dual},
          ${input.dualId ?? null},
          ${input.sharedBy ?? null},
          ${input.dateTime instanceof Date ? input.dateTime : new Date(input.dateTime)}
        )
    `;
  }
}
