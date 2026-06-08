/**
 * Purpose: Encapsulate legacy venture SQL used by compatibility controllers.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw rows and insert side effects for venture endpoints.
 */
import { LegacyRow } from "../../lib/legacy-row";
import { escapeSql } from "../../lib/legacy-sql";
import { LegacyBaseRepository } from "./base-repository";

export class LegacyVentureRepository extends LegacyBaseRepository {
  public async createVenture(ventureUrl: string, userId: string, picPath: string, ventureTitle: string): Promise<void> {
    await this.exec(
      `INSERT INTO venture_master(venture_url, venture_posted_by, venture_thumb, venture_title) values('${escapeSql(ventureUrl)}', '${escapeSql(userId)}', '${escapeSql(picPath)}', '${escapeSql(ventureTitle)}')`
    );
  }

  public async getVentures(userId: string): Promise<LegacyRow[]> {
    return this.queryRows<LegacyRow>(
      `SELECT t.*, tr.* FROM user_master t, venture_master tr WHERE CAST(tr.venture_posted_by AS INTEGER)=t.user_id AND tr.is_reported='NO' AND (tr.venture_posted_by IN (SELECT following_id FROM followers_master WHERE followed_by='${escapeSql(userId)}') OR tr.venture_posted_by='${escapeSql(userId)}') ORDER BY tr.venture_id DESC LIMIT 100`
    );
  }

  public async getVentureDetail(ventureId: string): Promise<LegacyRow[]> {
    return this.queryRows<LegacyRow>(
      `SELECT t.*, tr.* FROM user_master t, venture_master tr WHERE CAST(tr.venture_posted_by AS INTEGER)=t.user_id AND tr.venture_id='${escapeSql(ventureId)}'`
    );
  }

  public async getUserVentures(userId: string): Promise<LegacyRow[]> {
    return this.queryRows<LegacyRow>(
      `SELECT t.*, tr.* FROM user_master t, venture_master tr WHERE CAST(tr.venture_posted_by AS INTEGER)=t.user_id AND tr.venture_posted_by='${escapeSql(userId)}' AND tr.is_reported='NO' ORDER BY venture_id DESC`
    );
  }
}
