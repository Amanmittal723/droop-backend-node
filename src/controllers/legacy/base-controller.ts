/**
 * Purpose: Share legacy repositories and support services across split compatibility controllers.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Base controller infrastructure for legacy endpoint handlers.
 */
import { Request } from "express";
import { PrismaClient } from "@prisma/client";
import { getLegacyOptionalString } from "../../lib/legacy-request";
import { ApnsService } from "../../services/apns-service";
import { StripeService } from "../../services/stripe-service";
import { WowzaService } from "../../services/wowza-service";
import { LegacyCommentRepository } from "../../repositories/legacy/comment-repository";
import { LegacyFeedRepository } from "../../repositories/legacy/feed-repository";
import { LegacyFollowRepository } from "../../repositories/legacy/follow-repository";
import { LegacyMediaRepository } from "../../repositories/legacy/media-repository";
import { LegacyProfileRepository } from "../../repositories/legacy/profile-repository";
import { LegacySearchRepository } from "../../repositories/legacy/search-repository";
import { LegacySharedRepository } from "../../repositories/legacy/shared-repository";
import { LegacyVentureRepository } from "../../repositories/legacy/venture-repository";

export type LegacyControllerDependencies = {
  prismaClient: PrismaClient;
  stripeService: StripeService;
};

export class LegacyBaseController {
  protected readonly sharedRepository: LegacySharedRepository;

  protected readonly profileRepository: LegacyProfileRepository;

  protected readonly followRepository: LegacyFollowRepository;

  protected readonly searchRepository: LegacySearchRepository;

  protected readonly ventureRepository: LegacyVentureRepository;

  protected readonly commentRepository: LegacyCommentRepository;

  protected readonly feedRepository: LegacyFeedRepository;

  protected readonly mediaRepository: LegacyMediaRepository;

  protected readonly wowzaService: WowzaService;

  protected readonly stripeService: StripeService;

  private readonly apnsService: ApnsService;

  public constructor(dependencies: LegacyControllerDependencies) {
    this.sharedRepository = new LegacySharedRepository(dependencies.prismaClient);
    this.profileRepository = new LegacyProfileRepository(dependencies.prismaClient);
    this.followRepository = new LegacyFollowRepository(dependencies.prismaClient);
    this.searchRepository = new LegacySearchRepository(dependencies.prismaClient);
    this.ventureRepository = new LegacyVentureRepository(dependencies.prismaClient);
    this.commentRepository = new LegacyCommentRepository(dependencies.prismaClient);
    this.feedRepository = new LegacyFeedRepository(dependencies.prismaClient);
    this.mediaRepository = new LegacyMediaRepository(dependencies.prismaClient);
    this.wowzaService = new WowzaService();
    this.stripeService = dependencies.stripeService;
    this.apnsService = new ApnsService();
  }

  protected async sendLegacyPush(request: Request, sandbox: boolean): Promise<void> {
    const message = getLegacyOptionalString(request, "message") ?? "";
    const employeeIds = (getLegacyOptionalString(request, "emp_id") ?? "")
      .split("#")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const fromId = getLegacyOptionalString(request, "from_id");

    for (const userId of employeeIds) {
      if (fromId) {
        const muteRow = await this.sharedRepository.queryMany(
          `SELECT user_id FROM mute_master WHERE user_id=${Number(userId)} AND mute_id=${Number(fromId)}`
        );
        if (muteRow.length > 0) {
          continue;
        }
      }

      const user = await this.sharedRepository.queryOne<Record<string, unknown>>(
        `SELECT * FROM user_master WHERE user_id='${userId.replace(/'/g, "''")}'`
      );
      const deviceToken = String(user?.device_token ?? "").trim();
      if (deviceToken.length === 0 || deviceToken === "NA") {
        continue;
      }

      try {
        await this.apnsService.sendPush(
          deviceToken,
          {
            message,
            dualId: getLegacyOptionalString(request, "dual_id"),
            friendId: getLegacyOptionalString(request, "friend_id"),
            userId: getLegacyOptionalString(request, "user_id"),
            notificationType: getLegacyOptionalString(request, "notification_type"),
            isCollaborate: getLegacyOptionalString(request, "is_collaborate") !== undefined
          },
          sandbox
        );
      } catch {
        // Preserve best-effort legacy delivery behavior.
      }
    }
  }
}
