"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WowzaService = void 0;
/**
 * Purpose: Wrap the legacy Wowza API calls used by lightweight stream utility endpoints.
 * Expected request body: Stream identifiers supplied by callers.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw JSON or text responses from the Wowza API.
 */
const env_1 = require("../config/env");
class WowzaService {
    async startSandboxStream(streamId) {
        const response = await fetch(`https://api-sandbox.cloud.wowza.com/api/v1.1/live_streams/${streamId}/start`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Wsc-Api-Key": env_1.env.WOWZA_API_KEY ?? "",
                "Wsc-Access-Key": env_1.env.WOWZA_ACCESS_KEY ?? ""
            }
        });
        return response.text();
    }
    async getStreamState(streamId) {
        const response = await fetch(`https://cloud.wowza.com/api/v1.1/live_streams/${streamId}/state`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Wsc-Api-Key": env_1.env.WOWZA_API_KEY ?? "",
                "Wsc-Access-Key": env_1.env.WOWZA_ACCESS_KEY ?? ""
            }
        });
        return response.text();
    }
    async listSandboxStreams() {
        const response = await fetch("https://api-sandbox.cloud.wowza.com/api/v1.1/live_streams", {
            headers: {
                "Content-Type": "application/json",
                "Wsc-Api-Key": env_1.env.WOWZA_API_KEY ?? "",
                "Wsc-Access-Key": env_1.env.WOWZA_ACCESS_KEY ?? ""
            }
        });
        return response.text();
    }
}
exports.WowzaService = WowzaService;
