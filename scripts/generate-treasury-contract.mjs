import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "docs/apps/treasury/feed.schema.json"), "utf8"));
const definitions = new Map();
function emit(node) {
  if (node.$ref) {
    const name = node.$ref.split("/").at(-1);
    if (!definitions.has(name)) definitions.set(name, emit(schema.$defs[name]));
    return "Treasury" + name + "Schema";
  }
  if ("const" in node) return "z.literal(" + JSON.stringify(node.const) + ")";
  if (node.enum) return "z.enum(" + JSON.stringify(node.enum) + ")";
  if (node.anyOf) {
    if (node.anyOf.length === 2 && node.anyOf[1].type === "null") return emit(node.anyOf[0]) + ".nullable()";
    throw new Error("Unsupported union");
  }
  let result;
  if (node.type === "object") {
    if (node.additionalProperties !== false) throw new Error("Only strict objects supported");
    return "z.strictObject({\n" + Object.entries(node.properties).map(([key, value]) => "  " + key + ": " + emit(value) + (node.required.includes(key) ? "" : ".optional()") + ",").join("\n") + "\n})";
  }
  if (node.type === "array") return "z.array(" + emit(node.items) + ").max(" + node.maxItems + ")";
  if (node.type === "integer") result = "z.number().int().min(" + node.minimum + ").max(" + node.maximum + ")";
  else if (node.type === "string") {
    result = "z.string()";
    if (node.minLength !== undefined) result += ".min(" + node.minLength + ")";
    if (node.maxLength !== undefined) result += ".max(" + node.maxLength + ")";
    if (node.pattern) result += ".regex(new RegExp(" + JSON.stringify(node.pattern) + "))";
  } else throw new Error("Unsupported type " + node.type);
  return result;
}
const envelope = emit(schema);
const output = '// Generated from docs/apps/treasury/feed.schema.json. Run node scripts/generate-treasury-contract.mjs.\nimport { z } from "./zod";\n\n'
  + [...definitions].map(([name, expression]) => "export const Treasury" + name + "Schema = " + expression + ";\n").join("\n")
  + "\nexport const TreasuryFeedSchema = " + envelope + ";\n";
const target = path.join(root, "lib/schemas/treasury-feed.generated.ts");
if (process.argv.includes("--check")) {
  if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output) throw new Error("Treasury schema is stale; regenerate it.");
} else fs.writeFileSync(target, output);
