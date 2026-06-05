/**
 * Purpose: Recreate the legacy user category, interest, and business selection endpoints.
 * Expected request body: user_id plus category_ids, interest_ids, or business_ids as comma-separated strings.
 * Expected query parameters: Legacy clients may send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status and message fields matching the PHP scripts.
 */
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getLegacyOptionalString, getLegacyString } from "../lib/legacy-request";
import { sendLegacyJson } from "../lib/legacy-response";
import { UserRepository } from "../repositories/user-repository";

type PreferencesControllerDependencies = {
  prismaClient: PrismaClient;
};

function parseLegacyIdList(value: string): number[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => Number(entry));
}

export class PreferencesController {
  private readonly userRepository: UserRepository;

  public constructor(dependencies: PreferencesControllerDependencies) {
    this.userRepository = new UserRepository(dependencies.prismaClient);
  }

  public selectCategories = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyOptionalString(request, "user_id");
    const categoryIdsRaw = getLegacyOptionalString(request, "category_ids");

    if (!userId || categoryIdsRaw === undefined) {
      sendLegacyJson(response, { status: "0", message: "Data required to process request" });
      return;
    }

    const categoryIds = parseLegacyIdList(getLegacyString(request, "category_ids"));
    if (categoryIds.length <= 0) {
      sendLegacyJson(response, { status: "0", message: "Please select atleast one category" });
      return;
    }

    await this.userRepository.replaceUserCategorySelections(Number(userId), categoryIds);
    sendLegacyJson(response, { status: "1", message: "Categories added Successfully" });
  };

  public selectInterests = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyOptionalString(request, "user_id");
    const interestIdsRaw = getLegacyOptionalString(request, "interest_ids");

    if (!userId || interestIdsRaw === undefined) {
      sendLegacyJson(response, { status: "0", message: "Data required to process request" });
      return;
    }

    const interestIds = parseLegacyIdList(getLegacyString(request, "interest_ids"));
    if (interestIds.length <= 0) {
      sendLegacyJson(response, { status: "0", message: "Please select atleast one interest" });
      return;
    }

    await this.userRepository.replaceUserInterestSelections(Number(userId), interestIds);
    sendLegacyJson(response, { status: "1", message: "Interests added Successfully" });
  };

  public selectBusinesses = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyOptionalString(request, "user_id");
    const businessIdsRaw = getLegacyOptionalString(request, "business_ids");

    if (!userId || businessIdsRaw === undefined) {
      sendLegacyJson(response, { status: "0", message: "Data required to process request" });
      return;
    }

    const businessIds = parseLegacyIdList(getLegacyString(request, "business_ids"));
    if (businessIds.length <= 0) {
      sendLegacyJson(response, { status: "0", message: "Please select atleast one business" });
      return;
    }

    await this.userRepository.replaceUserBusinessSelections(Number(userId), businessIds);
    sendLegacyJson(response, { status: "1", message: "Business added Successfully" });
  };
}
