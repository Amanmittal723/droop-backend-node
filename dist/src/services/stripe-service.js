"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
/**
 * Purpose: Provide compatibility helpers for the legacy Stripe behaviors used by login and signup.
 * Expected request body: Legacy user rows and Stripe-related identifiers passed by callers.
 * Expected query parameters: None.
 * Expected headers: Request host headers are used to build legacy connect URLs.
 * Expected response structure: Legacy-style status/message/data payloads for Stripe operations.
 */
const stripe_1 = __importDefault(require("stripe"));
const node_path_1 = __importDefault(require("node:path"));
const env_1 = require("../config/env");
class StripeService {
    client;
    constructor() {
        this.client = env_1.env.STRIPE_SECRET_KEY ? new stripe_1.default(env_1.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" }) : null;
    }
    async createCustomer(user) {
        if (!this.client) {
            return { status: "0", message: "Stripe is not configured", data: {} };
        }
        try {
            if (!user.stripe_customer_id) {
                const customer = await this.client.customers.create({
                    email: String(user.user_email ?? "")
                });
                return {
                    status: "1",
                    message: "Account created successfully",
                    data: { ...user, stripe_customer_id: customer.id }
                };
            }
            return {
                status: "1",
                message: "Account created successfully",
                data: user
            };
        }
        catch (error) {
            return {
                status: "0",
                message: error instanceof Error ? error.message : "Stripe customer creation failed",
                data: {}
            };
        }
    }
    connectUrl(request, user) {
        const basePath = requestBasePath(request);
        return `${basePath}/stripe_connect?user_id=${String(user.user_id ?? "")}`;
    }
    isConfigured() {
        return this.client !== null;
    }
    async createStandardAccount(email) {
        if (!this.client) {
            return { status: "0", message: "Stripe is not configured" };
        }
        try {
            const account = await this.client.accounts.create({
                type: "standard",
                email
            });
            return {
                status: "1",
                message: "Account created successfully",
                accountId: account.id
            };
        }
        catch (error) {
            return {
                status: "0",
                message: error instanceof Error ? error.message : "Stripe account creation failed"
            };
        }
    }
    async createStandardOnboardingLink(request, accountId, userId) {
        if (!this.client) {
            return { status: "0", message: "Stripe is not configured" };
        }
        try {
            const basePath = requestBasePath(request);
            const accountLink = await this.client.accountLinks.create({
                account: accountId,
                refresh_url: `${basePath}/stripe_refresh?user_id=${userId}`,
                return_url: `${basePath}/stripe_success?user_id=${userId}`,
                type: "account_onboarding"
            });
            return {
                status: "1",
                message: "Account onboarding link created successfully",
                url: accountLink.url
            };
        }
        catch (error) {
            return {
                status: "0",
                message: error instanceof Error ? error.message : "Stripe onboarding link creation failed"
            };
        }
    }
    async isAccountActive(stripeAccountId) {
        if (!this.client || stripeAccountId.length === 0) {
            return false;
        }
        try {
            const account = await this.client.accounts.retrieve(stripeAccountId);
            return Boolean(account.payouts_enabled);
        }
        catch {
            return false;
        }
    }
    async authorizeCode(code) {
        if (!this.client) {
            return { status: "0", message: "Stripe is not configured" };
        }
        try {
            const response = await this.client.oauth.token({
                grant_type: "authorization_code",
                code
            });
            return {
                status: "1",
                message: "authorization succesfully",
                stripeAccountId: response.stripe_user_id
            };
        }
        catch (error) {
            return {
                status: "0",
                message: error instanceof Error ? error.message : "Stripe authorization failed"
            };
        }
    }
    async addCard(token, customerId) {
        if (!this.client) {
            return { status: "0", message: "Stripe is not configured" };
        }
        try {
            const card = await this.client.customers.createSource(customerId, { source: token });
            return { status: "1", data: card };
        }
        catch (error) {
            return { status: "0", message: error instanceof Error ? error.message : "Unknown error" };
        }
    }
    async listCards(customerId) {
        if (!this.client) {
            return { status: "0", message: "Stripe is not configured" };
        }
        try {
            const cards = await this.client.customers.listSources(customerId, { object: "card" });
            return { status: "1", data: cards };
        }
        catch (error) {
            return { status: "0", message: error instanceof Error ? error.message : "Unknown error" };
        }
    }
    async deleteCard(customerId, cardId) {
        if (!this.client) {
            return { status: "0", message: "Stripe is not configured" };
        }
        try {
            const deleted = await this.client.customers.deleteSource(customerId, cardId);
            return { status: "1", data: deleted };
        }
        catch (error) {
            return { status: "0", message: error instanceof Error ? error.message : "Unknown error" };
        }
    }
}
exports.StripeService = StripeService;
function requestBasePath(request) {
    const scheme = request.secure ? "https" : "http";
    const host = request.headers.host ?? "localhost:3000";
    const requestPath = request.originalUrl.split("?")[0];
    const requestDirectory = node_path_1.default.posix.dirname(requestPath);
    const legacyDirectory = requestDirectory.startsWith("/categories") ? requestDirectory : "/categories";
    return `${scheme}://${host}${legacyDirectory}`;
}
