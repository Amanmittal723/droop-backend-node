/**
 * Purpose: Encapsulate legacy direct-message SQL operations while preserving PHP field names and query behavior.
 * Expected request body: Caller-provided ids, message content, message metadata, and pagination fields.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw message rows and thread rows that match the PHP scripts.
 */
import { PrismaClient } from "@prisma/client";

export class MessagingRepository {
  public constructor(private readonly prismaClient: PrismaClient) {}

  public async createMessage(input: {
    sender: string;
    receiver: string;
    messageType: number;
    messageUrl: string;
    thumbUrl: string;
    dualId: string;
    content: string;
    dateTime: string;
  }): Promise<number> {
    const rows = await this.prismaClient.$queryRaw<{ message_id: number }[]>`
      INSERT INTO messages_master
        (message_sender, message_receiver, message_type, message_url, thumb_url, dual_id, message_content, date_time)
      VALUES
        (${input.sender}, ${input.receiver}, ${input.messageType}, ${input.messageUrl}, ${input.thumbUrl}, ${Number(input.dualId || 0)}, ${input.content}, ${input.dateTime}::timestamp)
      RETURNING message_id
    `;
    return Number(rows[0]?.message_id ?? 0);
  }

  public async replaceThread(sender: string, receiver: string, content: string, dateTime: string): Promise<number> {
    await this.prismaClient.$executeRawUnsafe(
      `DELETE FROM message_thread WHERE (message_sender='${sender}' AND message_receiver='${receiver}') OR (message_sender='${receiver}' AND message_receiver='${sender}')`
    );
    const rows = await this.prismaClient.$queryRaw<{ message_thread_id: number }[]>`
      INSERT INTO message_thread(message_sender, message_receiver, message_content, date_time)
      VALUES (${sender}, ${receiver}, ${content}, ${dateTime}::timestamp)
      RETURNING message_thread_id
    `;
    return Number(rows[0]?.message_thread_id ?? 0);
  }

  public async getUserSummary(userId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.prismaClient.$queryRaw<Record<string, unknown>[]>`
      SELECT user_id, user_pic, user_full_name, user_name FROM user_master WHERE user_id = ${Number(userId)}
    `;
    return rows[0] ?? null;
  }

  public async getUserFull(userId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.prismaClient.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM user_master WHERE user_id = ${Number(userId)}
    `;
    return rows[0] ?? null;
  }

  public async getConversation(userId: string, friendId: string): Promise<Record<string, unknown>[]> {
    return this.prismaClient.$queryRawUnsafe(
      `SELECT * FROM messages_master WHERE ((message_sender = '${userId}' AND message_receiver='${friendId}') OR (message_receiver='${userId}' AND message_sender='${friendId}')) AND (is_deleted!='${userId}' AND is_deleted!='BOTH') ORDER BY message_id ASC`
    );
  }

  public async getThreadLegacy(userId: string): Promise<Record<string, unknown>[]> {
    return this.prismaClient.$queryRawUnsafe(
      `SELECT * FROM message_thread WHERE (message_receiver='${userId}' OR message_sender='${userId}') AND (is_deleted!='${userId}' AND is_deleted!='BOTH') ORDER BY message_thread_id DESC`
    );
  }

  public async getThreadPaginated(userId: string, start: string, pageSize: string): Promise<Record<string, unknown>[]> {
    return this.prismaClient.$queryRawUnsafe(
      `SELECT * FROM message_thread WHERE (message_receiver='${userId}' OR message_sender='${userId}') AND (is_deleted!='${userId}' AND is_deleted!='BOTH') ORDER BY message_thread_id DESC LIMIT ${pageSize} OFFSET ${start}`
    );
  }

  public async getThread2(userId: string, start?: string, pageSize?: string): Promise<Record<string, unknown>[]> {
    let sql = "SELECT mt.*, user_id, user_pic, user_full_name, user_name FROM message_thread mt";
    sql += ` INNER JOIN user_master u on u.user_id=CASE WHEN CAST(mt.message_sender AS INTEGER) = ${Number(userId)} THEN CAST(mt.message_receiver AS INTEGER) ELSE CAST(mt.message_sender AS INTEGER) END`;
    sql += ` WHERE (message_receiver='${userId}' OR message_sender='${userId}') AND (is_deleted!='${userId}' AND is_deleted!='BOTH') GROUP BY mt.message_thread_id, u.user_id, u.user_pic, u.user_full_name, u.user_name ORDER BY message_thread_id DESC`;
    if (start !== undefined && pageSize !== undefined) {
      sql += ` LIMIT ${pageSize} OFFSET ${start}`;
    }
    return this.prismaClient.$queryRawUnsafe(sql);
  }

  public async getThread215112022(userId: string, start?: string, pageSize?: string): Promise<Record<string, unknown>[]> {
    let sql = "SELECT mt.*, user_id, user_pic, user_full_name, user_name FROM message_thread mt";
    sql += ` INNER JOIN user_master u on u.user_id=CASE WHEN CAST(mt.message_sender AS INTEGER) = ${Number(userId)} THEN CAST(mt.message_receiver AS INTEGER) ELSE CAST(mt.message_sender AS INTEGER) END`;
    sql += ` WHERE (message_receiver='${userId}' OR message_sender='${userId}') AND (is_deleted!='${userId}' AND is_deleted!='BOTH') GROUP BY mt.message_thread_id, u.user_id, u.user_pic, u.user_full_name, u.user_name ORDER BY message_thread_id DESC`;
    if (start !== undefined && pageSize !== undefined) {
      sql += ` LIMIT ${pageSize} OFFSET ${start}`;
    }
    return this.prismaClient.$queryRawUnsafe(sql);
  }

  public async countDistinctThread2Users(userId: string): Promise<number> {
    const rows = await this.prismaClient.$queryRawUnsafe<{ total: bigint | number }[]>(
      `SELECT count(DISTINCT u.user_id) as total FROM message_thread mt INNER JOIN user_master u on u.user_id=CASE WHEN CAST(mt.message_sender AS INTEGER) = ${Number(userId)} THEN CAST(mt.message_receiver AS INTEGER) ELSE CAST(mt.message_sender AS INTEGER) END WHERE (message_receiver='${userId}' OR message_sender='${userId}') AND (is_deleted!='${userId}' AND is_deleted!='BOTH')`
    );
    return Number(rows[0]?.total ?? 0);
  }

  public async countThreadRows(userId: string): Promise<number> {
    const rows = await this.prismaClient.$queryRawUnsafe<{ total: bigint | number }[]>(
      `SELECT count(mt.message_thread_id) as total FROM message_thread mt INNER JOIN user_master u on u.user_id=CASE WHEN CAST(mt.message_sender AS INTEGER) = ${Number(userId)} THEN CAST(mt.message_receiver AS INTEGER) ELSE CAST(mt.message_sender AS INTEGER) END WHERE (message_receiver='${userId}' OR message_sender='${userId}') AND (is_deleted!='${userId}' AND is_deleted!='BOTH')`
    );
    return Number(rows[0]?.total ?? 0);
  }
}
