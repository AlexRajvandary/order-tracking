import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const [, , inputArg, outputArg, ...flags] = process.argv;
if (!inputArg) {
  console.error("Usage: node scripts/normalize-yugioh-cards.mjs <input.json> [output.json] [--skip-translation]");
  process.exit(1);
}

const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg ?? "imports/yugioh-cards-normalized-ru.json");
const cachePath = resolve("imports/yugioh-translation-cache.json");
const skipTranslation = flags.includes("--skip-translation");
const source = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(source)) throw new Error("The input JSON must contain an array.");

await mkdir(dirname(outputPath), { recursive: true });
let translationCache = {};
try { translationCache = JSON.parse(await readFile(cachePath, "utf8")); } catch {}

const hasJapanese = (value) => /[\u3040-\u30ff\u3400-\u9fff]/u.test(value ?? "");
const clean = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function translate(value) {
  const text = clean(value);
  if (!text || !hasJapanese(text)) return text;
  if (translationCache[text]) return translationCache[text];
  if (skipTranslation) return null;

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "ja");
  url.searchParams.set("tl", "ru");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const translated = payload?.[0]?.map((part) => part?.[0] ?? "").join("").trim();
      if (!translated) throw new Error("empty translation");
      translationCache[text] = translated;
      return translated;
    } catch (error) {
      if (attempt === 5) throw new Error(`Failed to translate ${JSON.stringify(text.slice(0, 80))}: ${error}`);
      await wait(attempt * 750);
    }
  }
}

function parseSeriesMetadata(rawValue) {
  const raw = clean(rawValue);
  const parts = raw?.split("·").map((part) => part.trim()).filter(Boolean) ?? [];
  const countPart = parts.at(-1);
  const datePart = parts.at(-2);
  const typePart = parts.at(-3);
  const alternateParts = parts.slice(0, -3);
  return {
    seriesMetadataRaw: raw,
    seriesAlternateName: clean(alternateParts.join(" · ")),
    seriesType: clean(typePart),
    releaseDate: /^\d{4}-\d{2}-\d{2}$/.test(datePart ?? "") ? datePart : null,
    declaredCardCount: /^(\d+)\s*cards?$/i.test(countPart ?? "") ? Number(countPart.match(/\d+/)?.[0]) : null,
  };
}

function parseStats(rawValue) {
  const raw = clean(rawValue);
  const number = (pattern) => {
    const match = raw?.match(pattern);
    return match ? Number(match[1]) : null;
  };
  return {
    statsRaw: raw,
    level: number(/\bLv\s*(\d+)/i),
    rank: number(/\bRank\s*(\d+)/i),
    linkRating: number(/\bLINK[-\s]*(\d+)/i),
    attack: number(/\bATK\s*(\d+)/i),
    defense: number(/\bDEF\s*(\d+)/i),
  };
}

function normalizeCardType(value) {
  const text = clean(value);
  if (!text) return null;
  if (/monster/i.test(text)) return "Monster";
  if (/spell/i.test(text)) return "Spell";
  if (/trap/i.test(text)) return "Trap";
  return text.replace(/[^\p{L}\p{N} -]/gu, "").trim() || text;
}

const seriesTypeRu = {
  "Booster Pack": "Бустер",
  "Structure Deck": "Структурная колода",
  "Duelist Pack": "Набор дуэлянта",
  "Deck Build Pack": "Набор для сборки колоды",
  "Starter Deck": "Стартовая колода",
  Promotion: "Промо",
  Other: "Другое",
  Bundled: "Комплект",
};

const uniqueTranslations = new Set();
for (const row of source) {
  for (const value of [row.Name, row.Description, row.MonsterRaceRaw, row.Series]) {
    const text = clean(value);
    if (text && hasJapanese(text) && !translationCache[text]) uniqueTranslations.add(text);
  }
}

const pending = [...uniqueTranslations];
let completed = 0;
async function worker() {
  while (pending.length) {
    const value = pending.shift();
    await translate(value);
    completed += 1;
    if (completed % 20 === 0) {
      await writeFile(cachePath, `${JSON.stringify(translationCache, null, 2)}\n`, "utf8");
      console.log(`Translated ${completed}/${uniqueTranslations.size}`);
    }
    await wait(120);
  }
}
if (!skipTranslation) await Promise.all(Array.from({ length: 4 }, worker));
await writeFile(cachePath, `${JSON.stringify(translationCache, null, 2)}\n`, "utf8");

const normalized = [];
for (const row of source) {
  const series = clean(row.Series);
  const metadata = parseSeriesMetadata(row.Series2);
  const stats = parseStats(row.StatsRaw);
  normalized.push({
    name: clean(row.Name),
    nameRu: await translate(row.Name),
    price: 0,
    currencyCode: "RUB",
    imageUrl: clean(row.URL),
    description: clean(row.Description),
    descriptionRu: await translate(row.Description),
    brand: "Yu-Gi-Oh",
    categoryName: "Yu-Gi-Oh",
    categorySlug: "yu-gi-oh",
    parentCategoryName: "Коллекционные карточные игры",
    parentCategorySlug: "tcg",
    condition: "new",
    isActive: true,
    franchise: "yu-gi-oh",
    setName: series,
    setNameRu: await translate(series),
    japaneseNameReading: clean(row.JapaneseNameReading),
    cardType: normalizeCardType(row.CardType),
    cardSubtype: clean(row.CardSubtype),
    attribute: clean(row.Attribute)?.toUpperCase() ?? null,
    ...stats,
    monsterRaceRaw: clean(row.MonsterRaceRaw),
    monsterRaceRu: await translate(row.MonsterRaceRaw),
    ...metadata,
    seriesAlternateNameRu: await translate(metadata.seriesAlternateName),
    seriesTypeRu: metadata.seriesType ? seriesTypeRu[metadata.seriesType] ?? metadata.seriesType : null,
    shopLinks: {
      yahoo_auction: clean(row._Link),
      mercari: clean(row._Link1),
      rakuma: clean(row._Link2),
      yahoo_flea_market: clean(row._Link3),
      rakuten: clean(row._Link4),
      amazon_japan: clean(row._Link5),
      yahoo_shopping: clean(row._Link6),
    },
  });
}

await writeFile(outputPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
console.log(`Wrote ${normalized.length} cards to ${outputPath}`);
