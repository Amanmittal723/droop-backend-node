/**
 * Purpose: Wrap the legacy Wowza API calls used by lightweight stream utility endpoints.
 * Expected request body: Stream identifiers supplied by callers.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw JSON or text responses from the Wowza API.
 */
import { env } from "../config/env";

export class WowzaService {
  public async startSandboxStream(streamId: string): Promise<string> {
    const response = await fetch(`https://api-sandbox.cloud.wowza.com/api/v1.1/live_streams/${streamId}/start`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Wsc-Api-Key": env.WOWZA_API_KEY ?? "",
        "Wsc-Access-Key": env.WOWZA_ACCESS_KEY ?? ""
      }
    });
    return response.text();
  }

  public async getStreamState(streamId: string): Promise<string> {
    const response = await fetch(`https://cloud.wowza.com/api/v1.1/live_streams/${streamId}/state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Wsc-Api-Key": env.WOWZA_API_KEY ?? "",
        "Wsc-Access-Key": env.WOWZA_ACCESS_KEY ?? ""
      }
    });
    return response.text();
  }

  public async listSandboxStreams(): Promise<string> {
    const response = await fetch("https://api-sandbox.cloud.wowza.com/api/v1.1/live_streams", {
      headers: {
        "Content-Type": "application/json",
        "Wsc-Api-Key": env.WOWZA_API_KEY ?? "",
        "Wsc-Access-Key": env.WOWZA_ACCESS_KEY ?? ""
      }
    });
    return response.text();
  }
}
