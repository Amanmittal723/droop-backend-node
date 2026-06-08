/**
 * Purpose: Expose shared legacy SQL helpers and notification inserts to split controllers.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw rows and shared write helpers.
 */
import { LegacyRow } from "../../lib/legacy-row";
import { legacyNowString } from "../../lib/legacy-datetime";
import { escapeSql } from "../../lib/legacy-sql";
import { LegacyBaseRepository } from "./base-repository";

export class LegacySharedRepository extends LegacyBaseRepository {
  public async queryMany<T extends LegacyRow>(sql: string): Promise<T[]> {
    return this.queryRows<T>(sql);
  }

  public async queryOne<T extends LegacyRow>(sql: string): Promise<T | null> {
    return this.queryRow<T>(sql);
  }

  public async execute(sql: string): Promise<void> {
    await this.exec(sql);
  }

  public async insertNotification(
    text: string,
    sentTo: string,
    dual: string,
    sharedBy: string,
    dualId?: string,
    notificationType?: number
  ): Promise<void> {
    const columns = ["notification_txt", "notification_sent_to", "notification_dual", "shared_by", "date_time"];
    const values = [`'${escapeSql(text)}'`, `'${escapeSql(sentTo)}'`, `'${escapeSql(dual)}'`, `'${escapeSql(sharedBy)}'`, `'${legacyNowString()}'`];
    if (dualId !== undefined) {
      columns.splice(3, 0, "notification_dual_id");
      values.splice(3, 0, `'${escapeSql(dualId)}'`);
    }
    if (notificationType !== undefined) {
      columns.splice(1, 0, "notification_type");
      values.splice(1, 0, String(notificationType));
    }
    await this.exec(`INSERT INTO notifications_master(${columns.join(",")}) values(${values.join(",")})`);
  }
}
