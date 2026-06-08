/**
 * Purpose: Encapsulate legacy profile, counts, and follower list SQL used by compatibility controllers.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw rows and scalar values shaped like the PHP backend queries.
 */
import { LegacyRow } from "../lib/legacy-row";
import { legacyNowString } from "../lib/legacy-datetime";
import { escapeSql } from "../lib/legacy-sql";
import { LegacyBaseRepository } from "./base-repository";

export class LegacyProfileRepository extends LegacyBaseRepository {
  public async userBusinesses(userId: string | number): Promise<number[]> {
    const rows = await this.queryRows<{ business_id: number }>(
      `SELECT business_id FROM user_business WHERE user_id='${escapeSql(String(userId))}'`
    );
    return rows.map((row) => Number(row.business_id));
  }

  public async categories(): Promise<LegacyRow[]> {
    return this.queryRows("SELECT * FROM categories_master");
  }

  public async interests(): Promise<LegacyRow[]> {
    return this.queryRows("SELECT * FROM interest_master");
  }

  public async businesses(): Promise<LegacyRow[]> {
    return this.queryRows("SELECT * FROM business_master");
  }

  public async userCategoryIds(userId: string): Promise<number[]> {
    const rows = await this.queryRows<{ category_id: number }>(
      `SELECT category_id FROM user_category WHERE user_id='${escapeSql(userId)}'`
    );
    return rows.map((row) => Number(row.category_id));
  }

  public async userInterestIds(userId: string): Promise<number[]> {
    const rows = await this.queryRows<{ interest_id: number }>(
      `SELECT interest_id FROM user_interest WHERE user_id='${escapeSql(userId)}'`
    );
    return rows.map((row) => Number(row.interest_id));
  }

  public async userBusinessIds(userId: string): Promise<number[]> {
    const rows = await this.queryRows<{ business_id: number }>(
      `SELECT business_id FROM user_business WHERE user_id='${escapeSql(userId)}'`
    );
    return rows.map((row) => Number(row.business_id));
  }

  public async profileBase(userId: string, includeLoginStats = false): Promise<LegacyRow | null> {
    const row = await this.queryRow<LegacyRow>(`SELECT * FROM user_master WHERE user_id='${escapeSql(userId)}'`);
    if (!row) {
      return null;
    }

    row.stripe_account_id = row.stripe_account_id ? String(row.stripe_account_id) : "";

    const collabSql = `SELECT count(distinct dual_id) as total FROM dualpost_master WHERE (dual_posted_by='${escapeSql(userId)}' OR dual_linked_to=${Number(userId)}) AND dual_linked_to>0 AND dual_caption!='Not Provided' AND is_reported='NO'`;
    const postSql = `SELECT count(distinct dual_id) as total FROM dualpost_master WHERE (dual_posted_by='${escapeSql(userId)}' OR dual_linked_to=${Number(userId)}) AND dual_caption!='Not Provided' AND is_reported='NO'`;
    const likeSql = includeLoginStats
      ? `SELECT COUNT(lm.dual_id) as total FROM love_master lm join dualpost_master dm on dm.dual_id=lm.dual_id WHERE dual_posted_by='${escapeSql(userId)}' AND dual_caption!='Not Provided' AND is_reported='NO'`
      : `SELECT COUNT(lm.dual_id) as total FROM love_master lm join dualpost_master dm on dm.dual_id=lm.dual_id WHERE (dual_posted_by='${escapeSql(userId)}' OR dual_linked_to=${Number(userId)}) AND dual_caption!='Not Provided' AND is_reported='NO'`;
    const followingSql = `SELECT count(distinct following_id) as total FROM followers_master WHERE followed_by='${escapeSql(userId)}'`;
    const followersSql = `SELECT count(distinct followed_by) as total FROM followers_master WHERE following_id='${escapeSql(userId)}'`;

    const collabs = await this.queryRow<{ total: number | bigint }>(collabSql);
    const posts = await this.queryRow<{ total: number | bigint }>(postSql);
    const likes = await this.queryRow<{ total: number | bigint }>(likeSql);
    const following = await this.queryRow<{ total: number | bigint }>(followingSql);
    const followers = await this.queryRow<{ total: number | bigint }>(followersSql);

    row.user_collabs = Number(collabs?.total ?? 0);
    row.user_post = Number(posts?.total ?? 0);
    row.user_likes = Number(likes?.total ?? 0);
    row.following_count = Number(following?.total ?? 0);
    row.followers_count = Number(followers?.total ?? 0);
    return row;
  }

  public async updateProfileViewCount(userId: string, isCount = 0): Promise<LegacyRow | false> {
    const row = await this.queryRow<LegacyRow>(`SELECT * FROM user_master WHERE user_id=${Number(userId)}`);
    if (!row) {
      return false;
    }

    const currentViews = Number(row.user_views ?? 0);
    if (Number(isCount) === 1) {
      await this.exec(`UPDATE user_master SET user_views='${String(currentViews + 1)}' WHERE user_id=${Number(userId)}`);
      row.user_views = String(currentViews + 1);
    }

    return row;
  }

  public async shouldSendViewMilestone(currentViews: number): Promise<number | null> {
    if (currentViews > 0 && currentViews % 1000 === 0) {
      return currentViews / 1000;
    }
    return null;
  }

  public async buildFollowerList(
    userId: string,
    loggedUserId: string,
    includePrices = false
  ): Promise<{ following: LegacyRow[]; followers: LegacyRow[] }> {
    const loggedFollowingRows = loggedUserId !== userId
      ? await this.queryRows<{ following_id: string }>(
          `SELECT distinct(tr.following_id) FROM followers_master tr WHERE tr.followed_by='${escapeSql(loggedUserId)}'`
        )
      : [];
    const loggedFollowing = loggedFollowingRows.map((row) => String(row.following_id));
    const loggedList = loggedFollowing.length > 0 ? loggedFollowing.join(",") : "";

    const selectUserFields = includePrices
      ? "t.user_id, t.user_pic, t.user_email, t.user_full_name, t.user_name,t.video_price ,t.image_price,t.story_price,t.is_free_promo, tr.*"
      : "t.user_id, t.user_pic, t.user_email, t.user_full_name, t.user_name, tr.*";
    const followFlag = loggedFollowing.length > 0 ? `CASE WHEN t.user_id in (${loggedList}) THEN 1 ELSE 0 END as is_following` : "1 as is_following";

    const followingSql = `SELECT distinct ${selectUserFields}, ${followFlag} FROM user_master t, followers_master tr WHERE CAST(tr.following_id AS INTEGER)=t.user_id AND tr.followed_by='${escapeSql(userId)}'`;
    const following = await this.queryRows<LegacyRow>(followingSql);

    const followersSql = `SELECT distinct ${selectUserFields}, ${followFlag} FROM user_master t, followers_master tr WHERE CAST(tr.followed_by AS INTEGER)=t.user_id AND tr.following_id='${escapeSql(userId)}'`;
    const followers = await this.queryRows<LegacyRow>(followersSql);

    return { following, followers };
  }

  public async followerTotal(userId: string): Promise<number> {
    const totalRow = await this.queryRow<{ total: number | bigint }>(
      `SELECT count(distinct t.user_id) as total FROM user_master t, followers_master tr WHERE CAST(tr.followed_by AS INTEGER)=t.user_id AND tr.following_id='${escapeSql(userId)}'`
    );
    return Number(totalRow?.total ?? 0);
  }

  public async followingTotal(userId: string): Promise<number> {
    const totalRow = await this.queryRow<{ total: number | bigint }>(
      `SELECT count(t.user_id) as total FROM user_master t, followers_master tr WHERE CAST(tr.following_id AS INTEGER)=t.user_id AND tr.followed_by='${escapeSql(userId)}'`
    );
    return Number(totalRow?.total ?? 0);
  }

  public async findUserByUsername(username: string): Promise<LegacyRow | null> {
    return this.queryRow<LegacyRow>(`SELECT * FROM user_master WHERE user_name='${escapeSql(username.trim())}'`);
  }

  public async updateUserProfile(userId: string, updateParts: string[]): Promise<void> {
    if (updateParts.length <= 0) {
      return;
    }
    await this.exec(`UPDATE user_master SET ${updateParts.join(",")} WHERE user_id='${escapeSql(userId)}'`);
  }

  public async syncDualProfilePictures(userId: string, picPath: string): Promise<void> {
    await this.exec(`UPDATE dualpost_master SET dual_posted_pic='${escapeSql(picPath)}' WHERE dual_posted_by='${escapeSql(userId)}'`);
    await this.exec(`UPDATE dualpost_master SET dual_linked_profile_pic='${escapeSql(picPath)}' WHERE dual_linked_to='${escapeSql(userId)}'`);
  }

  public async createViewMilestoneNotification(userId: string, count: number): Promise<void> {
    await this.exec(
      `INSERT INTO notifications_master(notification_txt, notification_sent_to, notification_dual, shared_by, date_time) values('${escapeSql(`Congratulations you reached ${count} thousand customer views`)}', '${escapeSql(userId)}', 'NO', '${escapeSql(userId)}', '${legacyNowString()}')`
    );
  }
}
