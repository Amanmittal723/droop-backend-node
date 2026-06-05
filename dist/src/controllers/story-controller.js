"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoryController = void 0;
/**
 * Purpose: Recreate the legacy story create, delete, and listing endpoints while preserving PHP grouping and response payloads.
 * Expected request body: user_id, story_id, story_type, story_date, story_time, story_image, video, and video_thumb.
 * Expected query parameters: Legacy clients may also send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers and multipart content types for uploaded story media.
 * Expected response structure: Legacy JSON payloads with status, message, and story data or grouped story arrays.
 */
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const legacy_request_1 = require("../lib/legacy-request");
const legacy_row_1 = require("../lib/legacy-row");
const legacy_response_1 = require("../lib/legacy-response");
const random_1 = require("../lib/random");
const env_1 = require("../config/env");
const story_repository_1 = require("../repositories/story-repository");
const user_repository_1 = require("../repositories/user-repository");
class StoryController {
    storyRepository;
    userRepository;
    constructor(dependencies) {
        this.storyRepository = new story_repository_1.StoryRepository(dependencies.prismaClient);
        this.userRepository = new user_repository_1.UserRepository(dependencies.prismaClient);
    }
    addStory = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyString)(request, "user_id");
        const user = await this.userRepository.findByUserId(userId);
        if (!user) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Invalid login user" });
            return;
        }
        const storyDate = (0, legacy_request_1.getLegacyString)(request, "story_date");
        const storyTime = (0, legacy_request_1.getLegacyString)(request, "story_time");
        const storyType = (0, legacy_request_1.getLegacyString)(request, "story_type");
        const dateTime = new Date().toISOString().slice(0, 19).replace("T", " ");
        try {
            let storyImage = "";
            let storyVideo = "";
            if (storyType === "1") {
                const image = this.getUploadedFile(request, "story_image");
                if (!image) {
                    (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database File not found." });
                    return;
                }
                const fileName = `${(0, random_1.legacyRandomString)(10)}${node_path_1.default.extname(image.originalname) || ".jpg"}`;
                await this.writeStoryFile(fileName, image.buffer);
                storyImage = this.storyUrl(request, fileName);
            }
            else if (storyType === "2") {
                const thumb = this.getUploadedFile(request, "video_thumb");
                if (thumb) {
                    const thumbName = `${(0, random_1.legacyRandomString)(10)}.jpg`;
                    await this.writeStoryFile(thumbName, thumb.buffer);
                    storyImage = this.storyUrl(request, thumbName);
                }
                const video = this.getUploadedFile(request, "video");
                if (!video) {
                    (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database File not found." });
                    return;
                }
                const videoName = `${(0, random_1.legacyRandomString)(10)}${node_path_1.default.extname(video.originalname) || ".mov"}`;
                await this.writeStoryFile(videoName, video.buffer);
                storyVideo = this.storyUrl(request, videoName);
            }
            const row = await this.storyRepository.createStory({
                storyImage,
                storyPostedBy: userId,
                storyVideo,
                storyType,
                storyDate,
                storyTime,
                dateTime
            });
            if (row) {
                (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Story Created Successfully", data: (0, legacy_row_1.stringifyLegacyRow)(row) });
                return;
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: `Error while adding record in database ${message}` });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database " });
    };
    deleteStory = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyOptionalString)(request, "user_id");
        const storyId = (0, legacy_request_1.getLegacyOptionalString)(request, "story_id");
        if (!userId || !storyId) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Invalid Request" });
            return;
        }
        const story = await this.storyRepository.findStoryByOwner(storyId, userId);
        if (story) {
            await this.deleteStoryFile(String(story.story_image ?? ""));
            await this.deleteStoryFile(String(story.story_video ?? ""));
            await this.storyRepository.deleteStory(storyId, userId);
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Story deleted successfully!" });
    };
    getStories = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyString)(request, "user_id");
        const rows = await this.storyRepository.listStories(userId);
        if (rows.length === 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "No story found" });
            return;
        }
        const data = {};
        for (const row of rows) {
            const normalizedRow = (0, legacy_row_1.stringifyLegacyRow)(row);
            const owner = String(normalizedRow.story_posted_by);
            if (!data[owner]) {
                data[owner] = {
                    story_posted_by: normalizedRow.story_posted_by,
                    user_pic: normalizedRow.user_pic,
                    user_name: normalizedRow.user_name,
                    stories: []
                };
            }
            data[owner].stories.push(normalizedRow);
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Story Found successfully", data: Object.values(data) });
    };
    getUploadedFile(request, fieldName) {
        return request.files?.find((file) => file.fieldname === fieldName);
    }
    async writeStoryFile(fileName, buffer) {
        const directory = node_path_1.default.join(env_1.env.legacyStorageRoot, "storyPost");
        await promises_1.default.mkdir(directory, { recursive: true });
        await promises_1.default.writeFile(node_path_1.default.join(directory, fileName), buffer);
    }
    async deleteStoryFile(url) {
        if (!url) {
            return;
        }
        const fileName = node_path_1.default.basename(url);
        const filePath = node_path_1.default.join(env_1.env.legacyStorageRoot, "storyPost", fileName);
        await promises_1.default.rm(filePath, { force: true });
    }
    storyUrl(request, fileName) {
        const protocol = request.secure ? "https" : "http";
        const host = request.headers.host ?? "localhost:3000";
        return `${protocol}://${host}/categories/storyPost/${fileName}`;
    }
}
exports.StoryController = StoryController;
