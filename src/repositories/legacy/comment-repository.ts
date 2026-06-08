/**
 * Purpose: Encapsulate live comment and live status SQL used by compatibility controllers.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw rows for comment and live lookup endpoints.
 */
import { LegacyRow } from "../../lib/legacy-row";
import { escapeSql } from "../../lib/legacy-sql";
import { LegacyBaseRepository } from "./base-repository";

export class LegacyCommentRepository extends LegacyBaseRepository {
  public async updateLiveLastChecked(broadcastId: string, checkTime: string): Promise<void> {
    await this.exec(`UPDATE "liveStream_master" SET last_checked_time='${checkTime}' WHERE live_id = ${Number(broadcastId)}`);
  }

  public async getLiveById(broadcastId: string): Promise<LegacyRow | null> {
    return this.queryRow<LegacyRow>(`SELECT * FROM "liveStream_master" WHERE live_id=${Number(broadcastId)}`);
  }

  public async getComments(broadcastId: string): Promise<LegacyRow[]> {
    return this.queryRows<LegacyRow>(
      `SELECT t.user_name,t.user_id, t.user_email, t.user_pic, t.user_name, tr.* FROM user_master t, comments_master tr WHERE tr.broadcast_id='${escapeSql(broadcastId)}' AND CAST(tr.comment_by AS INTEGER)=t.user_id ORDER BY tr.comment_id ASC`
    );
  }

  public async insertComment(broadcastId: string, commentBy: string, commentTxt: string): Promise<void> {
    await this.exec(
      `INSERT INTO comments_master(comment_by, comment_txt, broadcast_id) values('${escapeSql(commentBy)}', '${escapeSql(commentTxt)}', '${escapeSql(broadcastId)}')`
    );
  }
}
