import fs from "node:fs";

const transcriptPath =
  "C:/Users/stark/.cursor/projects/c-Users-stark-Documents-order-tracking/agent-transcripts/d3cba317-8e2a-4e7d-8b25-f552bf567698/d3cba317-8e2a-4e7d-8b25-f552bf567698.jsonl";
const outJson =
  "C:/Users/stark/Documents/order-tracking/src/catalog/src/lib/bags-raw.json";

const lines = fs.readFileSync(transcriptPath, "utf8").split(/\n/).filter(Boolean);

let raw = "";
for (const line of lines) {
  try {
    const o = JSON.parse(line);
    function walk(v) {
      if (typeof v === "string") {
        if (
          v.includes("MP002XW1MAIA") &&
          v.includes("grid__catalog") &&
          v.length > raw.length
        ) {
          raw = v;
        }
      } else if (Array.isArray(v)) {
        v.forEach(walk);
      } else if (v && typeof v === "object") {
        Object.values(v).forEach(walk);
      }
    }
    walk(o);
  } catch {
    // skip bad lines
  }
}

console.log("rawLen", raw.length);

const html = raw.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\//g, "/");
const parts = html.split(/<div id="([A-Z0-9]+)" class="x-product-card__card/);
const products = [];

const parsePrice = (s) => Number(String(s).replace(/[^\d]/g, "")) || 0;

for (let i = 1; i < parts.length; i += 2) {
  const id = parts[i];
  const body = parts[i + 1] || "";
  if (!body.includes("x-product-card-description")) continue;

  const hrefM = body.match(/href="(\/p\/[^"?]+)/);
  const href = hrefM ? hrefM[1] : "";

  const imgCandidates = [
    ...body.matchAll(/(?:data-src|src)="(\/\/a\.lmcdn\.ru\/img[^"]+)"/g),
  ].map((m) => m[1]);
  let image =
    imgCandidates.find((u) => u.includes("img389x562")) ||
    imgCandidates.find((u) => u.includes("a.lmcdn.ru")) ||
    "";
  if (image.startsWith("//")) image = "https:" + image;

  const brandM = body.match(
    /x-product-card-description__brand-name[^>]*>([^<]+)/,
  );
  const brand = brandM ? brandM[1].trim() : "";

  const nameM = body.match(
    /x-product-card-description__product-name[^>]*>([^<]+)/,
  );
  let name = nameM ? nameM[1].trim() : "Сумка";
  name = name.replace(/\s+/g, " ").trim();

  const newPriceM = body.match(/price-new[^>]*>\s*([\d\s]+)\s*₽/);
  const singlePriceM = body.match(/price-single[^>]*>\s*([\d\s]+)\s*₽/);
  const oldPriceM = body.match(/price-old[^>]*>\s*([\d\s]+)/);
  const secondOldM = body.match(/price-second-old[^>]*>\s*([\d\s]+)/);

  const priceRub = parsePrice(
    (newPriceM && newPriceM[1]) || (singlePriceM && singlePriceM[1]) || "0",
  );
  const oldPriceRub = oldPriceM ? parsePrice(oldPriceM[1]) : undefined;
  const secondOldPriceRub = secondOldM ? parsePrice(secondOldM[1]) : undefined;

  const badges = [
    ...body.matchAll(/ui-product-custom-badge-title">([^<]+)/g),
  ].map((m) => m[1].trim());
  const discountBadge = badges.find((b) => b.includes("−") || b.includes("-"));
  const discountPercent = discountBadge
    ? Math.abs(parseInt(discountBadge.replace(/[^\d]/g, ""), 10))
    : undefined;
  const isPremium = badges.some((b) => b.toLowerCase() === "premium");

  const ratingM = body.match(/_rating_[^"]*">\s*([\d.]+)/);
  const rating = ratingM ? Number(ratingM[1]) : undefined;
  const reviewsM = body.match(/_reviewsCount_[^"]*">\s*\((\d+)\)/);
  const reviewsCount = reviewsM ? Number(reviewsM[1]) : undefined;

  const tags = [...body.matchAll(/_tag_d2m9d_2">([^<]+)/g)].map((m) =>
    m[1].trim(),
  );

  const pathParts = href.split("/").filter(Boolean);
  const pathSlug = pathParts[pathParts.length - 1] || id.toLowerCase();
  const path = (pathParts[2] || "").toLowerCase();

  let categorySlug = "женские-сумки";
  if (path.includes("klatch")) categorySlug = "клатчи";
  else if (path.includes("poyasnaya")) categorySlug = "кросс-боди";
  else if (path.includes("ryukzak")) categorySlug = "женские-рюкзаки";
  else if (
    path.includes("xbody") ||
    path.includes("crossbody") ||
    path.includes("через")
  ) {
    categorySlug = "кросс-боди";
  } else if (path.includes("sportivnaya") || path.includes("duffel")) {
    categorySlug = "сумки-на-плечо";
  }

  if (!id || !image || !priceRub) continue;

  const displayName =
    name && name !== "Сумка" && name !== "Клатч"
      ? `${brand} ${name}`.trim()
      : `${brand} ${name || "Сумка"}`.trim();

  products.push({
    id,
    slug: pathSlug || id.toLowerCase(),
    brand,
    name: displayName,
    productName: name,
    categorySlug,
    priceRub,
    oldPriceRub,
    secondOldPriceRub,
    discountPercent,
    isPremium,
    rating,
    reviewsCount,
    imageUrl: image,
    tags,
    href,
  });
}

const seen = new Set();
const unique = products.filter((p) => {
  if (seen.has(p.id)) return false;
  seen.add(p.id);
  return true;
});

console.log("products", unique.length);
console.log(JSON.stringify(unique.slice(0, 2), null, 2));
fs.writeFileSync(outJson, JSON.stringify(unique, null, 2), "utf8");
console.log("wrote", outJson);
