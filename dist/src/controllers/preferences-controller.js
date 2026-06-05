"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesController = void 0;
const legacy_request_1 = require("../lib/legacy-request");
const legacy_response_1 = require("../lib/legacy-response");
const user_repository_1 = require("../repositories/user-repository");
function parseLegacyIdList(value) {
    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .map((entry) => Number(entry));
}
class PreferencesController {
    userRepository;
    constructor(dependencies) {
        this.userRepository = new user_repository_1.UserRepository(dependencies.prismaClient);
    }
    selectCategories = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyOptionalString)(request, "user_id");
        const categoryIdsRaw = (0, legacy_request_1.getLegacyOptionalString)(request, "category_ids");
        if (!userId || categoryIdsRaw === undefined) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Data required to process request" });
            return;
        }
        const categoryIds = parseLegacyIdList((0, legacy_request_1.getLegacyString)(request, "category_ids"));
        if (categoryIds.length <= 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Please select atleast one category" });
            return;
        }
        await this.userRepository.replaceUserCategorySelections(Number(userId), categoryIds);
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Categories added Successfully" });
    };
    selectInterests = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyOptionalString)(request, "user_id");
        const interestIdsRaw = (0, legacy_request_1.getLegacyOptionalString)(request, "interest_ids");
        if (!userId || interestIdsRaw === undefined) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Data required to process request" });
            return;
        }
        const interestIds = parseLegacyIdList((0, legacy_request_1.getLegacyString)(request, "interest_ids"));
        if (interestIds.length <= 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Please select atleast one interest" });
            return;
        }
        await this.userRepository.replaceUserInterestSelections(Number(userId), interestIds);
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Interests added Successfully" });
    };
    selectBusinesses = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyOptionalString)(request, "user_id");
        const businessIdsRaw = (0, legacy_request_1.getLegacyOptionalString)(request, "business_ids");
        if (!userId || businessIdsRaw === undefined) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Data required to process request" });
            return;
        }
        const businessIds = parseLegacyIdList((0, legacy_request_1.getLegacyString)(request, "business_ids"));
        if (businessIds.length <= 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Please select atleast one business" });
            return;
        }
        await this.userRepository.replaceUserBusinessSelections(Number(userId), businessIds);
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Business added Successfully" });
    };
}
exports.PreferencesController = PreferencesController;
