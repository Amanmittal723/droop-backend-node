/**
 * Purpose: Generate migration artifacts from the PHP source tree and SQL dump for route, dependency, schema, and compatibility tracking.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: JSON artifact files written into the artifacts directory.
 */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const phpRoot = "/Volumes/flutterMas/codibex/droop-backend/categories";
const sqlDumpPath = "/Volumes/flutterMas/codibex/droop-backend/droop1988_appdb.sql";
const outputRoot = path.join(projectRoot, "artifacts");

function readPhpFiles() {
  return fs.readdirSync(phpRoot).filter((file) => file.endsWith(".php")).sort();
}

function analyzePhpFile(fileName) {
  const absolutePath = path.join(phpRoot, fileName);
  const contents = fs.readFileSync(absolutePath, "utf8");
  const requestKeys = [...contents.matchAll(/\$_(?:REQUEST|GET|POST|FILES)\s*\[\s*["']([^"']+)["']\s*\]/g)].map((match) => match[1]);
  const includes = [...contents.matchAll(/(?:require_once|include_once|require|include)\s*\(?["']([^"']+)["']/g)].map((match) => match[1]);
  const tables = [...contents.matchAll(/(?:FROM|INTO|UPDATE|JOIN|DELETE FROM)\s+`?([A-Za-z0-9_]+)`?/gi)].map((match) => match[1]);
  const statuses = [...contents.matchAll(/["']status["']\s*=>\s*["']([^"']+)["']/g)].map((match) => match[1]);

  return {
    file: fileName,
    route: `/categories/${fileName}`,
    requestKeys: [...new Set(requestKeys)].sort(),
    includes: [...new Set(includes)].sort(),
    tables: [...new Set(tables)].sort(),
    statuses: [...new Set(statuses)].sort()
  };
}

function buildSchemaMap() {
  const sql = fs.readFileSync(sqlDumpPath, "utf8");
  const createTablePattern = /^CREATE TABLE `([^`]+)` \(([\s\S]*?)^\) ENGINE=/gm;
  const tables = [];
  let match;
  while ((match = createTablePattern.exec(sql)) !== null) {
    const [, tableName, body] = match;
    const columns = [...body.matchAll(/^\s*`([^`]+)`\s+([^\n,]+)/gm)].map((columnMatch) => ({
      name: columnMatch[1],
      definition: columnMatch[2].trim()
    }));
    tables.push({ table: tableName, columns });
  }
  return tables;
}

function buildCompatibilityFixtures(routeMap) {
  return routeMap.map((entry) => ({
    route: entry.route,
    sampleRequest: {},
    expectedPhpResponse: null,
    expectedHttpStatus: 200,
    notes: "Populate with captured PHP fixture before marking endpoint complete."
  }));
}

fs.mkdirSync(outputRoot, { recursive: true });

const routeMap = readPhpFiles().map(analyzePhpFile);
const dependencyMap = routeMap.map((entry) => ({
  file: entry.file,
  route: entry.route,
  includes: entry.includes,
  tables: entry.tables
}));
const schemaMap = buildSchemaMap();
const compatibilityFixtures = buildCompatibilityFixtures(routeMap);

fs.writeFileSync(path.join(outputRoot, "route-map.json"), JSON.stringify(routeMap, null, 2));
fs.writeFileSync(path.join(outputRoot, "dependency-map.json"), JSON.stringify(dependencyMap, null, 2));
fs.writeFileSync(path.join(outputRoot, "schema-map.json"), JSON.stringify(schemaMap, null, 2));
fs.writeFileSync(path.join(outputRoot, "response-compatibility-fixtures.json"), JSON.stringify(compatibilityFixtures, null, 2));
