"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileComposerService = void 0;
class ProfileComposerService {
    metadataRepository;
    userRepository;
    stripeService;
    constructor(metadataRepository, userRepository, stripeService) {
        this.metadataRepository = metadataRepository;
        this.userRepository = userRepository;
        this.stripeService = stripeService;
    }
    async composeSignupUser(request, user) {
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
    async composeLoginUser(request, user, includeInterests) {
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
exports.ProfileComposerService = ProfileComposerService;
