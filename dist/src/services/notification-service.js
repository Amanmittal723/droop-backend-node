"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
class NotificationService {
    prismaClient;
    constructor(prismaClient) {
        this.prismaClient = prismaClient;
    }
    async createNotification(input) {
        await this.prismaClient.$executeRaw `
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
exports.NotificationService = NotificationService;
