/**
 * Purpose: Recreate the legacy story create, delete, and listing endpoints while preserving PHP grouping and response payloads.
 * Expected request body: user_id, story_id, story_type, story_date, story_time, story_image, video, and video_thumb.
 * Expected query parameters: Legacy clients may also send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers and multipart content types for uploaded story media.
 * Expected response structure: Legacy JSON payloads with status, message, and story data or grouped story arrays.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getLegacyOptionalString, getLegacyString } from "../lib/legacy-request";
import { stringifyLegacyRow } from "../lib/legacy-row";
import { sendLegacyJson } from "../lib/legacy-response";
import { legacyRandomString } from "../lib/random";
import { env } from "../config/env";
import { StoryRepository } from "../repositories/story-repository";
import { UserRepository } from "../repositories/user-repository";

type StoryControllerDependencies = {
  prismaClient: PrismaClient;
};

export class StoryController {
  private readonly storyRepository: StoryRepository;

  private readonly userRepository: UserRepository;

  public constructor(dependencies: StoryControllerDependencies) {
    this.storyRepository = new StoryRepository(dependencies.prismaClient);
    this.userRepository = new UserRepository(dependencies.prismaClient);
  }

  public addStory = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const user = await this.userRepository.findByUserId(userId);
    if (!user) {
      sendLegacyJson(response, { status: "0", message: "Invalid login user" });
      return;
    }

    const storyDate = getLegacyString(request, "story_date");
    const storyTime = getLegacyString(request, "story_time");
    const storyType = getLegacyString(request, "story_type");
    const dateTime = new Date().toISOString().slice(0, 19).replace("T", " ");

    try {
      let storyImage = "";
      let storyVideo = "";

      if (storyType === "1") {
        const image = this.getUploadedFile(request, "story_image");
        if (!image) {
          sendLegacyJson(response, { status: "0", message: "Error while adding record in database File not found." });
          return;
        }
        const fileName = `${legacyRandomString(10)}${path.extname(image.originalname) || ".jpg"}`;
        await this.writeStoryFile(fileName, image.buffer);
        storyImage = this.storyUrl(request, fileName);
      } else if (storyType === "2") {
        const thumb = this.getUploadedFile(request, "video_thumb");
        if (thumb) {
          const thumbName = `${legacyRandomString(10)}.jpg`;
          await this.writeStoryFile(thumbName, thumb.buffer);
          storyImage = this.storyUrl(request, thumbName);
        }

        const video = this.getUploadedFile(request, "video");
        if (!video) {
          sendLegacyJson(response, { status: "0", message: "Error while adding record in database File not found." });
          return;
        }
        const videoName = `${legacyRandomString(10)}${path.extname(video.originalname) || ".mov"}`;
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
        sendLegacyJson(response, { status: "1", message: "Story Created Successfully", data: stringifyLegacyRow(row) });
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendLegacyJson(response, { status: "0", message: `Error while adding record in database ${message}` });
      return;
    }

    sendLegacyJson(response, { status: "0", message: "Error while adding record in database " });
  };

  public deleteStory = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyOptionalString(request, "user_id");
    const storyId = getLegacyOptionalString(request, "story_id");
    if (!userId || !storyId) {
      sendLegacyJson(response, { status: "0", message: "Invalid Request" });
      return;
    }

    const story = await this.storyRepository.findStoryByOwner(storyId, userId);
    if (story) {
      await this.deleteStoryFile(String(story.story_image ?? ""));
      await this.deleteStoryFile(String(story.story_video ?? ""));
      await this.storyRepository.deleteStory(storyId, userId);
    }

    sendLegacyJson(response, { status: "1", message: "Story deleted successfully!" });
  };

  public getStories = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const rows = await this.storyRepository.listStories(userId);
    if (rows.length === 0) {
      sendLegacyJson(response, { status: "0", message: "No story found" });
      return;
    }

    const data: Record<string, Record<string, unknown>> = {};
    for (const row of rows) {
      const normalizedRow = stringifyLegacyRow(row);
      const owner = String(normalizedRow.story_posted_by);
      if (!data[owner]) {
        data[owner] = {
          story_posted_by: normalizedRow.story_posted_by,
          user_pic: normalizedRow.user_pic,
          user_name: normalizedRow.user_name,
          stories: []
        };
      }
      (data[owner].stories as Record<string, unknown>[]).push(normalizedRow);
    }

    const groupedStories = Object.values(data).map((group) => {
      const stories = (group.stories as Record<string, unknown>[]) ?? [];
      const ownerId = String(group.story_posted_by ?? "");
      const hasUnseenStories =
        ownerId === userId
          ? stories.length > 0
          : stories.some((story) => String(story.is_viewed ?? "0") !== "1");

      return {
        ...group,
        has_unseen_stories: hasUnseenStories ? "1" : "0"
      };
    });

    sendLegacyJson(response, { status: "1", message: "Story Found successfully", data: groupedStories });
  };

  public viewStory = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const storyId = getLegacyString(request, "story_id");
    const recorded = await this.storyRepository.recordStoryView(storyId, userId);
    if (!recorded) {
      sendLegacyJson(response, { status: "0", message: "Story not found" });
      return;
    }

    sendLegacyJson(response, { status: "1", message: "Story viewed successfully" });
  };

  private getUploadedFile(request: Request, fieldName: string): Express.Multer.File | undefined {
    return (request.files as Express.Multer.File[] | undefined)?.find((file) => file.fieldname === fieldName);
  }

  private async writeStoryFile(fileName: string, buffer: Buffer): Promise<void> {
    const directory = path.join(env.legacyStorageRoot, "storyPost");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, fileName), buffer);
  }

  private async deleteStoryFile(url: string): Promise<void> {
    if (!url) {
      return;
    }
    const fileName = path.basename(url);
    const filePath = path.join(env.legacyStorageRoot, "storyPost", fileName);
    await fs.rm(filePath, { force: true });
  }

  private storyUrl(request: Request, fileName: string): string {
    const protocol = request.secure ? "https" : "http";
    const host = request.headers.host ?? "localhost:2000";
    return `${protocol}://${host}/categories/storyPost/${fileName}`;
  }
}
