"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLegacyJson = sendLegacyJson;
const legacy_row_1 = require("./legacy-row");
function sendLegacyJson(response, payload, httpStatus = 200) {
    response.status(httpStatus);
    response.setHeader("Content-Type", "application/json");
    response.send(JSON.stringify(payload, (_key, value) => (0, legacy_row_1.stringifyLegacyValue)(value)));
}
