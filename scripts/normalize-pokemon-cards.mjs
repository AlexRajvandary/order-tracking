#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function usage() {
  console.log(`Usage:
  node scripts/normalize-pokemon-cards.mjs <input.json> [--output-dir <dir>] [--no-dedupe]

Outputs:
  normalized_cards.json       Normalized card records
  pokemon_card_counts.json    Character/card-count summary`);
}

function parseArgs(argv) {
  const options = {
    input: null,
    outputDir: process.cwd(),
    dedupe: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help" || argument === "-h") {
      usage();
      process.exit(0);
    }

    if (argument === "--output-dir") {
      options.outputDir = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument === "--no-dedupe") {
      options.dedupe = false;
      continue;
    }

    if (!options.input) {
      options.input = argument;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!options.input) {
    usage();
    throw new Error("Input JSON path is required.");
  }

  if (!options.outputDir) {
    throw new Error("--output-dir requires a directory path.");
  }

  return options;
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstNonEmpty(record, keys) {
  for (const key of keys) {
    const value = clean(record[key]);
    if (value) return value;
  }
  return "";
}

function normalizeCardNumber(value) {
  return clean(value).replace(/^No\s*:\s*/i, "").trim();
}

function addShopLink(target, name, value) {
  const url = clean(value);
  if (!url) return;

  if (!Object.values(target).includes(url)) {
    target[name] = url;
  }
}

function normalizeShopLinks(record) {
  const shops = {};

  addShopLink(shops, "yahoo_auction", record.URL);
  addShopLink(shops, "mercari", record.URL1);
  addShopLink(shops, "magi", record.URL2);
  addShopLink(shops, "suruga_ya", record.URL3);
  addShopLink(shops, "rakuma", record.URL4);
  addShopLink(shops, "rakuten", record.URL5);

  // Support older Octoparse column names as a fallback.
  const legacyShopFields = [
    ["shop_1", "Shop_URL"],
    ["shop_2", "Shop_URL3"],
    ["shop_3", "Shop_URL5"],
    ["shop_4", "Shop_URL7"],
    ["shop_5", "Shop_URL9"],
    ["shop_6", "Shop_URL11"],
  ];

  for (const [name, field] of legacyShopFields) {
    addShopLink(shops, name, record[field]);
  }

  return shops;
}

function normalizeRecord(record) {
  const pokemonName = firstNonEmpty(record, ["Text", "Field1", "line"]);
  const imageUrl = firstNonEmpty(record, ["Image_URL", "Image"]);
  const set = firstNonEmpty(record, ["Text1", "line1"]);
  const cardNumber = normalizeCardNumber(
    firstNonEmpty(record, ["Text2", "line2"]),
  );

  if (!pokemonName && !imageUrl && !set && !cardNumber) {
    return null;
  }

  return {
    pokemon_name: pokemonName,
    set,
    card_number: cardNumber,
    image_url: imageUrl,
    shop_links: normalizeShopLinks(record),
  };
}

function getRows(parsed) {
  if (Array.isArray(parsed)) return parsed;

  for (const key of ["data", "results", "items", "rows"]) {
    if (Array.isArray(parsed?.[key])) return parsed[key];
  }

  throw new Error("Expected a JSON array or an object containing data/results/items/rows.");
}

function cardKey(card) {
  return [card.pokemon_name, card.set, card.card_number, card.image_url]
    .map((value) => value.toLocaleLowerCase("en"))
    .join("\u0000");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(options.input);
  const outputDir = path.resolve(options.outputDir);
  const parsed = JSON.parse(await readFile(inputPath, "utf8"));
  const rows = getRows(parsed);

  const normalizedCards = [];
  const seen = new Set();
  const rawCounts = new Map();
  let skippedEmptyRows = 0;
  let removedDuplicates = 0;

  for (const row of rows) {
    const card = normalizeRecord(row ?? {});

    if (!card) {
      skippedEmptyRows += 1;
      continue;
    }

    const countName = card.pokemon_name || "(unknown)";
    rawCounts.set(countName, (rawCounts.get(countName) ?? 0) + 1);

    if (options.dedupe) {
      const key = cardKey(card);
      if (seen.has(key)) {
        removedDuplicates += 1;
        continue;
      }
      seen.add(key);
    }

    normalizedCards.push(card);
  }

  const uniqueCounts = new Map();
  for (const card of normalizedCards) {
    const name = card.pokemon_name || "(unknown)";
    uniqueCounts.set(name, (uniqueCounts.get(name) ?? 0) + 1);
  }

  const characters = [...uniqueCounts.entries()]
    .map(([pokemonName, cardCount]) => ({
      pokemon_name: pokemonName,
      card_count: cardCount,
      raw_rows: rawCounts.get(pokemonName) ?? cardCount,
    }))
    .sort(
      (left, right) =>
        right.card_count - left.card_count ||
        left.pokemon_name.localeCompare(right.pokemon_name, "en"),
    );

  const summary = {
    source_file: inputPath,
    input_rows: rows.length,
    normalized_cards: normalizedCards.length,
    unique_characters: characters.length,
    skipped_empty_rows: skippedEmptyRows,
    removed_duplicates: removedDuplicates,
    deduplication_enabled: options.dedupe,
    characters,
  };

  await mkdir(outputDir, { recursive: true });
  const cardsPath = path.join(outputDir, "normalized_cards.json");
  const countsPath = path.join(outputDir, "pokemon_card_counts.json");

  await Promise.all([
    writeFile(cardsPath, `${JSON.stringify(normalizedCards, null, 2)}\n`, "utf8"),
    writeFile(countsPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8"),
  ]);

  console.log(`Input rows:           ${rows.length}`);
  console.log(`Normalized cards:     ${normalizedCards.length}`);
  console.log(`Unique characters:    ${characters.length}`);
  console.log(`Skipped empty rows:   ${skippedEmptyRows}`);
  console.log(`Removed duplicates:   ${removedDuplicates}`);
  console.log(`Cards JSON:           ${cardsPath}`);
  console.log(`Counts JSON:          ${countsPath}`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
