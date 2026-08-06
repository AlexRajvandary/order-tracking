/**
 * Maps ZenPlus/raw category labels → canonical bags subcategory { name, slug }.
 * Parent is always categories.slug = "bags".
 * If no specific subcategory matches, falls back to parent "Сумки" (bags).
 */
export const BAGS_PARENT_SLUG = "bags";
export const BAGS_PARENT = { name: "Сумки", slug: BAGS_PARENT_SLUG };

/** Canonical subcategories under bags (existing seed + new). */
export const CANONICAL_BAG_SUBCATEGORIES = [
  { name: "Женские сумки", slug: "женские-сумки", existing: true },
  { name: "Клатчи", slug: "клатчи", existing: true },
  { name: "Сумки на плечо", slug: "сумки-на-плечо", existing: true },
  { name: "Женские рюкзаки", slug: "женские-рюкзаки", existing: true },
  { name: "Кросс-боди", slug: "кросс-боди", existing: true },
  { name: "Мужские рюкзаки", slug: "мужские-рюкзаки", existing: true },
  { name: "Мужские сумки", slug: "мужские-сумки", existing: false },
  { name: "Рюкзаки", slug: "рюкзаки", existing: false },
  { name: "Сумки-тоут", slug: "тоут", existing: false },
  { name: "Портфели", slug: "портфели", existing: false },
  { name: "Дорожные сумки", slug: "дорожные-сумки", existing: false },
  { name: "Бостонские сумки", slug: "бостон", existing: false },
  { name: "Барсетки", slug: "барсетки", existing: false },
  { name: "Поясные сумки", slug: "поясные-сумки", existing: false },
  { name: "Косметички", slug: "косметички", existing: false },
  { name: "Шопперы", slug: "шопперы", existing: false },
];

/** Higher = more specific; used when a product has several labels. */
const ALIAS_RULES = [
  { re: /^клатч/i, slug: "клатчи", score: 100 },
  { re: /вечерн/i, slug: "клатчи", score: 95 },
  { re: /кросс.?боди|cross.?bod/i, slug: "кросс-боди", score: 100 },
  { re: /почталь/i, slug: "сумки-на-плечо", score: 90 },
  { re: /через плеч|на плечо|длинным ремн/i, slug: "сумки-на-плечо", score: 90 },
  { re: /тоут|tote/i, slug: "тоут", score: 95 },
  { re: /шопп|эко.?сум|для покупок|хозяйственн/i, slug: "шопперы", score: 90 },
  { re: /бостон|boston/i, slug: "бостон", score: 95 },
  { re: /дорожн|путешеств|чемодан/i, slug: "дорожные-сумки", score: 90 },
  { re: /портфел|деловые сумк|дипломат/i, slug: "портфели", score: 95 },
  { re: /барсет/i, slug: "барсетки", score: 95 },
  { re: /пояс|бананк|body.?bag|сумка.?пояс/i, slug: "поясные-сумки", score: 90 },
  { re: /косметич/i, slug: "косметички", score: 95 },
  { re: /мужские рюкзак/i, slug: "мужские-рюкзаки", score: 100 },
  { re: /женские рюкзак/i, slug: "женские-рюкзаки", score: 100 },
  { re: /рюкзак/i, slug: "рюкзаки", score: 80 },
  { re: /мужские сумк/i, slug: "мужские-сумки", score: 100 },
  { re: /женские сумк|ручная сумоч|сумочк/i, slug: "женские-сумки", score: 85 },
];

const bySlug = new Map(CANONICAL_BAG_SUBCATEGORIES.map((c) => [c.slug, c]));

/**
 * Resolve the best bags category for a product.
 * Prefer a specific subcategory; otherwise fall back to parent «Сумки» (bags).
 */
export function resolveBagSubcategory(categories) {
  const labels = Array.isArray(categories) ? categories : [];
  let best = null;

  for (const label of labels) {
    const text = String(label || "").trim();
    if (!text) continue;
    for (const rule of ALIAS_RULES) {
      if (!rule.re.test(text)) continue;
      const canonical = bySlug.get(rule.slug);
      if (!canonical) continue;
      if (!best || rule.score > best.score) {
        best = { ...canonical, score: rule.score, matchedLabel: text };
      }
    }
  }

  if (best) {
    return {
      name: best.name,
      slug: best.slug,
      matchedLabel: best.matchedLabel,
      score: best.score,
      isParent: false,
    };
  }

  return {
    name: BAGS_PARENT.name,
    slug: BAGS_PARENT.slug,
    matchedLabel: labels[0] || null,
    score: 0,
    isParent: true,
  };
}
