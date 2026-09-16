/**
 * Parse a saved BicCamera laptop category HTML page into importable JSON.
 *
 * Usage:
 *   node scripts/parse-biccamera-laptops-html.mjs <input.html> [output.json]
 */
import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2];
const outputPath = process.argv[3] ?? path.join("scripts", "data", "biccamera-laptops-page-1.json");

if (!inputPath) {
  console.error("Usage: node scripts/parse-biccamera-laptops-html.mjs <input.html> [output.json]");
  process.exit(1);
}

const html = fs.readFileSync(inputPath, "utf8");

function decodeHtml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ")
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return decodeHtml(match?.[1] ?? match?.[2] ?? "");
}

function firstMatch(source, pattern) {
  return decodeHtml(source.match(pattern)?.[1] ?? "");
}

function parseNumber(value) {
  const normalized = value.replace(/[^\d.]/g, "");
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function capacityToGb(amount, unit) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  return unit.toUpperCase() === "TB" ? value * 1024 : value;
}

function cleanBrand(value) {
  return value.split("｜")[0].trim() || null;
}

function removeBrandAndKind(prefix, brand) {
  let value = prefix
    .replace(/^(?:notebook\s+computer|laptop|notebook|ノートパソコン)\s*/i, "")
    .trim();

  if (brand && value.toLowerCase().startsWith(brand.toLowerCase())) {
    value = value.slice(brand.length).trim();
  }

  return value || null;
}

function parseSpecs(name) {
  const bracketContents = [...name.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]);
  const compactParts = bracketContents.length === 0 && name.includes("/")
    ? name.split("/").map((part) => part.trim()).filter(Boolean)
    : [];
  const rawSpecifications = bracketContents
    .flatMap((content) => content.split("/"))
    .map((part) => part.trim())
    .filter(Boolean);
  const joined = rawSpecifications.join(" / ");

  const ramMatch = joined.match(/(?:memory|メモリ)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(GB|TB)/i);
  const storageMatch = joined.match(/\b(SSD|HDD|UFS|eMMC)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(GB|TB)\b/i);
  const screenMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:-?inch(?:es)?\b|インチ|型)/i);
  const compactCpu = compactParts[2]?.match(/^(U|C)(\d)-(.+)$/i);
  const cpu = rawSpecifications.find((part) =>
    /(?:intel|core\s+(?:ultra|i?\d)|amd|ryzen|snapdragon|celeron|pentium|apple\s+m\d|processor)/i.test(part),
  ) ?? (compactCpu
    ? `Intel Core ${compactCpu[1].toUpperCase() === "U" ? "Ultra " : ""}${compactCpu[2]} ${compactCpu[3]}`
    : null);
  const operatingSystem = rawSpecifications.find((part) =>
    /(?:windows\s*\d|chrome\s*os|macos)/i.test(part),
  ) ?? (compactParts.some((part) => /^W11$/i.test(part)) ? "Windows 11" : null);
  const office = rawSpecifications.find((part) => /(?:office|m365|microsoft\s*365)/i.test(part))
    ?? (compactParts.some((part) => /^M365$/i.test(part)) ? "Microsoft 365" : null);
  const graphics = rawSpecifications.find((part) =>
    /(?:geforce|nvidia|radeon|intel\s+(?:arc|iris|uhd)|graphics|gpu)/i.test(part),
  ) ?? null;
  const releaseModel = rawSpecifications.find((part) =>
    /(?:20\d{2}.*(?:model|モデル)|(?:spring|summer|autumn|fall|winter)\s+20\d{2})/i.test(part),
  ) ?? null;

  return {
    processor: cpu,
    ramGb: ramMatch ? capacityToGb(ramMatch[1], ramMatch[2]) : parseNumber(compactParts[3] ?? ""),
    storageType: storageMatch?.[1]?.toUpperCase() ?? (compactParts[4] ? "SSD" : null),
    storageGb: storageMatch ? capacityToGb(storageMatch[2], storageMatch[3]) : parseNumber(compactParts[4] ?? ""),
    screenSizeInches: screenMatch ? Number(screenMatch[1]) : parseNumber(compactParts[1] ?? ""),
    operatingSystem,
    office,
    graphics,
    copilotPlus: /copilot\s*\+\s*pc/i.test(joined),
    releaseModel,
    rawSpecifications: rawSpecifications.length > 0 ? rawSpecifications : compactParts.slice(1),
  };
}

const starts = [...html.matchAll(/<li\b[^>]*class="[^"]*\bprod_box\b[^"]*"[^>]*>/gi)];
const products = [];

for (let index = 0; index < starts.length; index += 1) {
  const openingTag = starts[index][0];
  const block = html.slice(starts[index].index, starts[index + 1]?.index ?? html.length);
  const id = getAttribute(openingTag, "data-item-id");
  if (!id) continue;

  const brand = cleanBrand(getAttribute(openingTag, "data-item-brand"));
  const imageTag = block.match(/<img\b[^>]*src="https:\/\/image\.biccamera\.com\/[^"]+"[^>]*>/i)?.[0] ?? "";
  const imageUrl = getAttribute(imageTag, "src") || null;
  const translatedName = getAttribute(imageTag, "alt");
  const originalName = getAttribute(openingTag, "data-item-name");
  const name = translatedName || originalName;
  if (!name) continue;

  const priceText = firstMatch(block, /<p\b[^>]*class="[^"]*\bbcs_price\b[^"]*"[^>]*>[\s\S]*?<span\b[^>]*class="[^"]*\bval\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const prefix = name.split("[")[0].trim();
  const model = removeBrandAndKind(prefix, brand);
  const modelNumber =
    model?.match(/\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+(?:\/[A-Z0-9]+)?\b/i)?.[0] ??
    model?.match(/\b(?=[A-Z0-9]{6,}\b)(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]+\b/i)?.[0] ??
    null;
  const color = model?.match(/\b(?:pearl white|navy blue|ocean green|natural silver|luna gray|sapphire|black|white|silver|gray|grey|blue|green|red|pink|gold)\b/i)?.[0] ?? null;
  const rating = parseNumber(firstMatch(block, /aria-label="(\d+(?:\.\d+)?)\s+out of 5 stars"/i));

  products.push({
    name,
    originalName: originalName || null,
    price: parseNumber(priceText),
    currencyCode: "JPY",
    imageUrl,
    sourceUrl: `https://www.biccamera.com/bc/item/${id}/`,
    sku: id,
    brand,
    model,
    modelNumber,
    color,
    categoryName: "Laptops",
    parentCategoryName: "Electronics",
    condition: "new",
    isActive: true,
    rating,
    ...parseSpecs(name),
  });
}

if (products.length === 0) {
  throw new Error("No BicCamera product cards were found in the supplied HTML.");
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");

console.log(`Parsed ${products.length} laptops`);
console.log(`Saved to ${path.resolve(outputPath)}`);
