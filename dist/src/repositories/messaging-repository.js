"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingRepository = void 0;
class MessagingRepository {
    prismaClient;
    constructor(prismaClient) {
        this.prismaClient = prismaClient;
    }
    async createMessage(input) {
        const rows = await this.prismaClient.$queryRaw `
      INSERT INTO messages_master
        (message_sender, message_receiver, message_type, message_url, thumb_url, dual_id, message_content, date_time)
      VALUES
        (${input.sender}, ${input.receiver}, ${input.messageType}, ${input.messageUrl}, ${input.thumbUrl}, ${Number(input.dualId || 0)}, ${input.content}, ${input.dateTime}::timestamp)
      RETURNING message_id
    `;
        return Number(rows[0]?.message_id ?? 0);
    }
    async replaceThread(sender, receiver, content, dateTime) {
        await this.prismaClient.$executeRawUnsafe(`DELETE FROM message_thread WHERE (message_sender='${sender}' AND message_receiver='${receiver}') OR (message_sender='${receiver}' AND message_receiver='${sender}')`);
        const rows = await this.prismaClient.$queryRaw `
      INSERT INTO message_thread(message_sender, message_receiver, message_content, date_time)
      VALUES (${sender}, ${receiver}, ${content}, ${dateTime}::timestamp)
      RETURNING message_thread_id
    `;
        return Number(rows[0]?.message_thread_id ?? 0);
    }
    async getUserSummary(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT user_id, user_pic, user_full_name, user_name FROM user_master WHERE user_id = ${Number(userId)}
    `;
        return rows[0] ?? null;
    }
    async getUserFull(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM user_master WHERE user_id = ${Number(userId)}
    `;
        return rows[0] ?? null;
    }
    async getConversation(userId, friendId) {
        return this.prismaClient.$queryRawUnsafe(`SELECT * FROM messages_master WHERE ((message_sender = '${userId}' AND message_receiver='${friendId}') OR (message_receiver='${userId}' AND message_sender='${friendId}')) AND (is_deleted!='${userId}' AND is_deleted!='BOTH') ORDER BY message_id ASC`);
    }
    async getThreadLegacy(userId) {
        return this.prismaClient.$queryRawUnsafe(`SELECT * FROM message_thread WHERE (message_receiver='${userId}' OR message_sender='${userId}') AND (is_deleted!='${userId}' AND is_deleted!='BOTH') ORDER BY message_thread_id DESC`);
    }
    async getThreadPaginated(userId, start, pageSize) {
        return this.prismaClient.$queryRawUnsafe(`SELECT * FROM message_thread WHERE (message_receiver='${userId}' OR message_sender='${userId}') AND (is_deleted!='${userId}' AND is_deleted!='BOTH') ORDER BY message_thread_id DESC LIMIT ${pageSize} OFFSET ${start}`);
    }
    async getThread2(userId, start, pageSize) {
        let sql = "SELECT mt.*, user_id, user_pic, user_full_name, user_name FROM message_thread mt";
        sql += ` INNER JOIN user_master u on u.user_id=CASE WHEN CAST(mt.message_sender AS INTEGER) = ${Number(userId)} THEN CAST(mt.message_receiver AS INTEGER) ELSE CAST(mt.message_sender AS INTEGER) END`;
        sql += ` WHERE (message_receiver='${userId}' OR message_sender='${userId}') AND (is_deleted!='${userId}' AND is_deleted!='BOTH') GROUP BY mt.message_thread_id, u.user_id, u.user_pic, u.user_full_name, u.user_name ORDER BY message_thread_id DESC`;
        if (start !== undefined && pageSize !== undefined) {
            sql += ` LIMIT ${pageSize} OFFSET ${start}`;
        }
        return this.prismaClient.$queryRawUnsafe(sql);
    }
    async getThread215112022(userId, start, pageSize) {
        let sql = "SELECT mt.*, user_id, user_pic, user_full_name, user_name FROM message_thread mt";
        sql += ` INNER JOIN user_master u on u.user_id=CASE WHEN CAST(mt.message_sender AS INTEGER) = ${Number(userId)} THEN CAST(mt.message_receiver AS INTEGER) ELSE CAST(mt.message_sender AS INTEGER) END`;
        sql += ` WHERE (message_receiver='${userId}' OR message_sender='${userId}') AND (is_deleted!='${userId}' AND is_deleted!='BOTH') GROUP BY mt.message_thread_id, u.user_id, u.user_pic, u.user_full_name, u.user_name ORDER BY message_thread_id DESC`;
        if (start !== undefined && pageSize !== undefined) {
            sql += ` LIMIT ${pageSize} OFFSET ${start}`;
        }
        return this.prismaClient.$queryRawUnsafe(sql);
    }
    async countDistinctThread2Users(userId) {
        const rows = await this.prismaClient.$queryRawUnsafe(`SELECT count(DISTINCT u.user_id) as total FROM message_thread mt INNER JOIN user_master u on u.user_id=CASE WHEN CAST(mt.message_sender AS INTEGER) = ${Number(userId)} THEN CAST(mt.message_receiver AS INTEGER) ELSE CAST(mt.message_sender AS INTEGER) END WHERE (message_receiver='${userId}' OR message_sender='${userId}') AND (is_deleted!='${userId}' AND is_deleted!='BOTH')`);
        return Number(rows[0]?.total ?? 0);
    }
    async countThreadRows(userId) {
        const rows = await this.prismaClient.$queryRawUnsafe(`SELECT count(mt.message_thread_id) as total FROM message_thread mt INNER JOIN user_master u on u.user_id=CASE WHEN CAST(mt.message_sender AS INTEGER) = ${Number(userId)} THEN CAST(mt.message_receiver AS INTEGER) ELSE CAST(mt.message_sender AS INTEGER) END WHERE (message_receiver='${userId}' OR message_sender='${userId}') AND (is_deleted!='${userId}' AND is_deleted!='BOTH')`);
        return Number(rows[0]?.total ?? 0);
    }
}
exports.MessagingRepository = MessagingRepository;
