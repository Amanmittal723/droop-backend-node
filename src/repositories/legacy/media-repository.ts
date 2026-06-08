/**
 * Purpose: Encapsulate legacy post/media persistence SQL used by compatibility controllers.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw inserted or queried rows for media endpoints.
 */
import { LegacyRow } from "../../lib/legacy-row";
import { escapeSql } from "../../lib/legacy-sql";
import { LegacyBaseRepository } from "./base-repository";

export class LegacyMediaRepository extends LegacyBaseRepository {
  public async createVideoDual(input: {
    userId: string;
    thumbUrl: string;
    title: string;
    userName: string;
    userPic: string;
    videoUrl: string;
    cost: string;
    dateTime: string;
    linkedTo: string;
    linkedName: string;
    linkedPic: string;
    dualDate: string;
    dualTime: string;
    receiverNotes: string;
    receiverUserStatus: string;
    cardId: string;
    collabPrice: string;
    taggedUserIds: string;
  }): Promise<LegacyRow | null> {
    return this.queryRow<LegacyRow>(
      `INSERT INTO dualpost_master(dual_posted_by, dual_image, dual_caption, dual_posted_name, dual_posted_pic, video_url, video_cost, date_time, dual_type, dual_linked_to, dual_linked_name, dual_linked_profile_pic, dual_date, dual_time, receiver_notes, receiver_user_status, card_id, collab_price, payment_status, tagged_users)
       VALUES('${escapeSql(input.userId)}', '${escapeSql(input.thumbUrl)}', '${escapeSql(input.title)}', '${escapeSql(input.userName)}', '${escapeSql(input.userPic)}', '${escapeSql(input.videoUrl)}', '${escapeSql(input.cost)}', '${input.dateTime}', 2, '${escapeSql(input.linkedTo)}', '${escapeSql(input.linkedName)}', '${escapeSql(input.linkedPic)}', '${escapeSql(input.dualDate)}', '${escapeSql(input.dualTime)}', '${escapeSql(input.receiverNotes)}', '${escapeSql(input.receiverUserStatus)}', '${escapeSql(input.cardId)}', '${escapeSql(input.collabPrice)}', 'Pending', '${escapeSql(input.taggedUserIds)}') RETURNING *`
    );
  }

  public async createImageDual(input: {
    picPath: string;
    userId: string;
    linkedTo: string;
    linkedName: string;
    linkedPic: string;
    title: string;
    userName: string;
    userPic: string;
    dualDate: string;
    dualTime: string;
    dateTime: string;
    receiverNotes: string;
    receiverUserStatus: string;
    cardId: string;
    collabPrice: string;
    taggedUserIds: string;
  }): Promise<LegacyRow | null> {
    return this.queryRow<LegacyRow>(
      `INSERT INTO dualpost_master(dual_image, dual_posted_by, dual_linked_to, dual_linked_name, dual_linked_profile_pic, dual_caption, dual_posted_name, dual_posted_pic, dual_date, dual_time, date_time, receiver_notes, receiver_user_status, card_id, collab_price, payment_status, tagged_users)
       VALUES('${escapeSql(input.picPath)}', '${escapeSql(input.userId)}', '${escapeSql(input.linkedTo)}', '${escapeSql(input.linkedName)}', '${escapeSql(input.linkedPic)}', '${escapeSql(input.title)}', '${escapeSql(input.userName)}', '${escapeSql(input.userPic)}', '${escapeSql(input.dualDate)}', '${escapeSql(input.dualTime)}', '${input.dateTime}', '${escapeSql(input.receiverNotes)}', '${escapeSql(input.receiverUserStatus)}', '${escapeSql(input.cardId)}', '${escapeSql(input.collabPrice)}', 'Pending', '${escapeSql(input.taggedUserIds)}') RETURNING *`
    );
  }

  public async addDualCategories(dualId: string, categoryIds: number[]): Promise<void> {
    if (categoryIds.length > 0) {
      await this.exec(`INSERT INTO dualpost_category(dual_id, category_id) VALUES ${categoryIds.map((id) => `(${dualId}, ${id})`).join(",")}`);
    }
  }

  public async addDualInterests(dualId: string, interestIds: number[]): Promise<void> {
    if (interestIds.length > 0) {
      await this.exec(`INSERT INTO dualpost_interest(dual_id, interest_id) VALUES ${interestIds.map((id) => `(${dualId}, ${id})`).join(",")}`);
    }
  }

  public async findDualById(dualId: string): Promise<LegacyRow | null> {
    return this.queryRow<LegacyRow>(`SELECT * FROM dualpost_master WHERE dual_id='${escapeSql(dualId)}'`);
  }

  public async findDualDeleteInfo(dualId: string): Promise<LegacyRow | null> {
    return this.queryRow<LegacyRow>(`SELECT dual_id, dual_image, video_url, dual_type FROM dualpost_master WHERE dual_id=${Number(dualId)}`);
  }

  public async updateDual(dualId: string, sqlSet: string): Promise<void> {
    await this.exec(`UPDATE dualpost_master SET ${sqlSet} WHERE dual_id='${escapeSql(dualId)}'`);
  }

  public async deleteDualRelations(dualId: string): Promise<void> {
    await this.exec(`DELETE FROM notifications_master WHERE notification_dual_id='${escapeSql(dualId)}'`);
    await this.exec(`DELETE FROM dualpost_category WHERE dual_id='${escapeSql(dualId)}'`);
    await this.exec(`DELETE FROM dualpost_master WHERE dual_id='${escapeSql(dualId)}'`);
  }
}
