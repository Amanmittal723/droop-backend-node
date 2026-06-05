"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataRepository = void 0;
class MetadataRepository {
    prismaClient;
    constructor(prismaClient) {
        this.prismaClient = prismaClient;
    }
    async getCategories() {
        return this.prismaClient.$queryRaw `select * from categories_master`;
    }
    async getInterests() {
        return this.prismaClient.$queryRaw `select * from interest_master`;
    }
    async getBusinesses() {
        return this.prismaClient.$queryRaw `select * from business_master`;
    }
}
exports.MetadataRepository = MetadataRepository;
