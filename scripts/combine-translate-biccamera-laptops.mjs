/**
 * Merge BicCamera laptop pages, deduplicate by SKU and create Russian titles.
 *
 * Usage:
 *   node scripts/combine-translate-biccamera-laptops.mjs [output.json]
 */
import fs from "node:fs";
import path from "node:path";

const outputPath = process.argv[2] ?? path.join("scripts", "data", "biccamera-laptops-all-ru.json");
const pagePaths = Array.from(
  { length: 8 },
  (_, index) => path.join("scripts", "data", `biccamera-laptops-page-${index + 1}.json`),
);

const replacements = [
  ["Pearl White", "жемчужно-белый"],
  ["Navy Blue", "тёмно-синий"],
  ["Ocean Green", "океанический зелёный"],
  ["Natural Silver", "натуральный серебристый"],
  ["Fine Silver", "серебристый"],
  ["Luna Gray", "лунно-серый"],
  ["Sapphire", "сапфировый"],
  ["【アウトレット品】", "уценённый товар"],
  ["ノートパソコン", ""],
  ["ノートPC", ""],
  ["レッツノート", "Let's Note"],
  ["シリーズ", " серия "],
  ["本体のみ", "без аксессуаров"],
  ["タッチパネル", "сенсорный экран"],
  ["有機EL", "OLED"],
  ["2画面", "два экрана"],
  ["インチ", " дюйма"],
  ["第7世代", "7-го поколения"],
  ["第8世代", "8-го поколения"],
  ["第11世代", "11-го поколения"],
  ["第12世代", "12-го поколения"],
  ["モーハーグレー", "серый мокко"],
  ["パールホワイト", "жемчужно-белый"],
  ["ネイビーブルー", "тёмно-синий"],
  ["アイスブルー", "ледяной голубой"],
  ["ナチュラルシルバー", "натуральный серебристый"],
  ["ミッドナイトブルー", "полуночно-синий"],
  ["セレスティアルブルー", "небесно-голубой"],
  ["カーボンブラック", "угольно-чёрный"],
  ["プラチナシルバー", "платиново-серебристый"],
  ["ピュアシルバー", "чистый серебристый"],
  ["アッシュシルバー", "пепельно-серебристый"],
  ["アッシュブルー", "пепельно-синий"],
  ["アッシュゴールド", "пепельно-золотой"],
  ["サテンゴールド", "сатиново-золотой"],
  ["ファインシルバー", "серебристый"],
  ["ブライトブラック", "ярко-чёрный"],
  ["ベージュゴールド", "бежево-золотой"],
  ["コールブラック", "угольно-чёрный"],
  ["エクルベージュ", "бежевый экрю"],
  ["ストームグレー", "штормовой серый"],
  ["ピクトブラック", "чёрный"],
  ["フロストグレー", "морозный серый"],
  ["シルバーホワイト", "серебристо-белый"],
  ["セレストブルー", "небесно-голубой"],
  ["エッセンスシルバー", "серебристый"],
  ["オブシディアンブラック", "обсидианово-чёрный"],
  ["オーロラホワイト", "белый аврора"],
  ["スノーホワイト", "снежно-белый"],
  ["ルナグレー", "лунно-серый"],
  ["ライトピンク", "светло-розовый"],
  ["ポーラーブルー", "полярно-синий"],
  ["プルシャンブルー", "прусский синий"],
  ["クラリスゴールド", "золотой"],
  ["メテオグレー", "метеоритно-серый"],
  ["フェアリーパープル", "сказочно-фиолетовый"],
  ["ムーンブラック", "лунно-чёрный"],
  ["オニキスブルー", "ониксово-синий"],
  ["アーバンシルバー", "городской серебристый"],
  ["プラチナグレイ", "платиново-серый"],
  ["グレイシャーシルバー", "ледниково-серебристый"],
  ["メテオシルバー", "метеоритно-серебристый"],
  ["イクリプスグレー", "серый затмение"],
  ["セラミックホワイト", "керамический белый"],
  ["スカイブルー", "небесно-голубой"],
  ["ナノブラック", "чёрный"],
  ["ダークテックブルー", "тёмный технологичный синий"],
  ["ダークテックシルバー", "тёмный технологичный серебристый"],
  ["アーバンブロンズ", "городская бронза"],
  ["ブロンズ", "бронзовый"],
  ["プラチナ", "платиновый"],
  ["サファイア", "сапфировый"],
  ["デューン", "песочный"],
  ["ジェイド", "нефритовый"],
  ["ジェードブラック", "нефритово-чёрный"],
  ["ローズゴールド", "розовое золото"],
  ["ファインブラック", "чёрный"],
  ["ダークブルー", "тёмно-синий"],
  ["クワイエットブルー", "спокойный синий"],
  ["インディーブラック", "чёрный инди"],
  ["クールシルバー", "холодный серебристый"],
  ["ミックスブラック", "смешанный чёрный"],
  ["マットグレー", "матовый серый"],
  ["スカイ", "небесный"],
  ["グラファイト", "графитовый"],
  ["コズミックブルー", "космический синий"],
  ["アクアセラドン", "аквамариновый селадон"],
  ["スカンジナビアンホワイト", "скандинавский белый"],
  ["アントリムグレー", "серый Антрим"],
  ["ザブリスキーベージュ", "бежевый Забриски"],
  ["アイスランドグレー", "исландский серый"],
  ["カームグレイ", "спокойный серый"],
  ["ブラック", "чёрный"],
];

function translateModel(model) {
  let translated = model ?? "";
  for (const [source, target] of replacements) {
    translated = translated.replaceAll(source, target);
  }
  return translated
    .replaceAll("（", "(")
    .replaceAll("）", ")")
    .replace(/(\d+(?:\.\d+)?)\s*-?inch\b/gi, "$1 дюйма")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

function translateBrand(brand) {
  return ({
    "富士通": "Fujitsu",
    "マウスコンピュータ": "Mouse Computer",
  })[brand] ?? brand;
}

function translateProcessor(processor) {
  return (processor ?? "")
    .replace(/^intel\b/i, "Intel")
    .replace(/^amd\b/i, "AMD")
    .trim();
}

function translateOs(os) {
  return (os ?? "")
    .replaceAll("（Arm版）", " (ARM)")
    .replaceAll("(Arm)", "(ARM)")
    .replace(/Windows\s*(\d+)/i, "Windows $1")
    .trim();
}

function formatStorage(gb) {
  if (gb >= 1024 && gb % 1024 === 0) return `${gb / 1024} ТБ`;
  return `${gb} ГБ`;
}

function buildRussianName(product, translatedModel) {
  const details = [];
  if (product.processor) details.push(translateProcessor(product.processor));
  if (product.ramGb) details.push(`${product.ramGb} ГБ ОЗУ`);
  if (product.storageType && product.storageGb) {
    details.push(`${product.storageType} ${formatStorage(product.storageGb)}`);
  }
  if (product.screenSizeInches) details.push(`экран ${product.screenSizeInches}″`);
  if (product.operatingSystem) details.push(translateOs(product.operatingSystem));

  const identity = [product.brand, translatedModel]
    .filter(Boolean)
    .join(" ")
    .replace(/^(\S+)\s+\1\b/i, "$1")
    .trim();
  return `Ноутбук ${identity}${details.length ? ` — ${details.join(", ")}` : ""}`;
}

const merged = new Map();
for (const pagePath of pagePaths) {
  const products = JSON.parse(fs.readFileSync(pagePath, "utf8"));
  for (const product of products) {
    if (!merged.has(product.sku)) merged.set(product.sku, product);
  }
}

const products = [...merged.values()].map((product) => {
  const model = translateModel(product.model);
  const brand = translateBrand(product.brand);
  return {
    ...product,
    sourceName: product.name,
    name: buildRussianName({ ...product, brand }, model),
    brand,
    model,
    processor: translateProcessor(product.processor) || null,
    operatingSystem: translateOs(product.operatingSystem) || null,
  };
});

const untranslated = products.filter((product) => /[ぁ-んァ-ン一-龯]/.test(`${product.name} ${product.model}`));
if (untranslated.length > 0) {
  console.error("Untranslated model fragments:");
  for (const product of untranslated) {
    const characters = [...new Set(`${product.name} ${product.model}`.match(/[ぁ-んァ-ン一-龯]/g) ?? [])].join("");
    console.error(`- ${product.sku} [${characters}]: ${product.model}`);
  }
  process.exit(2);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
console.log(`Read ${pagePaths.length} pages`);
console.log(`Saved ${products.length} unique laptops to ${path.resolve(outputPath)}`);
