/**
 * Purpose: Rebuild the legacy login and signup response payloads by enriching raw user rows with lookup data and counters.
 * Expected request body: Legacy user rows loaded by auth handlers.
 * Expected query parameters: None.
 * Expected headers: Host headers are used by the Stripe connect URL builder.
 * Expected response structure: Legacy user payload with categories, interests, businesses, and counters appended.
 */
import { Request } from "express";
import { MetadataRepository } from "../repositories/metadata-repository";
import { UserRepository } from "../repositories/user-repository";
import { StripeService } from "./stripe-service";

export class ProfileComposerService {
  public constructor(
    private readonly metadataRepository: MetadataRepository,
    private readonly userRepository: UserRepository,
    private readonly stripeService: StripeService
  ) {}

  public async composeSignupUser(request: Request, user: Record<string, unknown>): Promise<Record<string, unknown>> {
    const categories = await this.metadataRepository.getCategories();
    const interests = await this.metadataRepository.getInterests();
    const businesses = await this.metadataRepository.getBusinesses();

    const hydrated = { ...user };
    hydrated.categories = categories;
    hydrated.interests = interests;
    hydrated.businesses = businesses;
    hydrated.following_count = 0;
    hydrated.followers_count = 0;
    hydrated.stripe_account_id = hydrated.stripe_account_id ? String(hydrated.stripe_account_id) : "";
    hydrated.stripe_connect_url = this.stripeService.connectUrl(request, hydrated);
    return hydrated;
  }

  public async composeLoginUser(request: Request, user: Record<string, unknown>, includeInterests: boolean): Promise<Record<string, unknown>> {
    const userId = Number(user.user_id ?? 0);
    const categories = await this.metadataRepository.getCategories();
    const businesses = await this.metadataRepository.getBusinesses();
    const interests = includeInterests ? await this.metadataRepository.getInterests() : [];

    const hydrated = { ...user };
    hydrated.categories = categories;
    hydrated.businesses = businesses;
    if (includeInterests) {
      hydrated.interests = interests;
    }
    hydrated.user_categories = await this.userRepository.getUserCategories(userId);
    hydrated.user_businesses = await this.userRepository.getUserBusinesses(userId);
    if (includeInterests) {
      hydrated.user_interests = await this.userRepository.getUserInterests(userId);
    }
    hydrated.user_collabs = await this.userRepository.getUserCollabCount(userId);
    hydrated.user_post = await this.userRepository.getUserPostCount(userId);
    hydrated.user_likes = await this.userRepository.getUserLikeCount(userId);
    hydrated.following_count = await this.userRepository.getFollowingCount(userId);
    hydrated.followers_count = await this.userRepository.getFollowersCount(userId);
    hydrated.stripe_account_id = hydrated.stripe_account_id ? String(hydrated.stripe_account_id) : "";
    hydrated.stripe_connect_url = this.stripeService.connectUrl(request, hydrated);
    return hydrated;
  }
}
