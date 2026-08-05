/**
 * Builds SQL to seed popular categories + subcategories from the catalog page.
 * Parents = POPULAR_CATEGORIES; children = LEGACY_CATEGORY_SECTIONS items for href section.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// --- Popular (from popular-categories.tsx) ---
const popular = [
  { id: "figures", title: "Фигурки", caption: "Коллекционные издания", section: "figures", image: "https://static.zenmarket.jp/images/common-landing-pages/u1wfwyzi.mcf" },
  { id: "tcg", title: "ККИ", caption: "Pokemon, One Piece, Yu-Gi-Oh", section: "tcg", image: "https://static.zenmarket.jp/images/common-landing-pages/a1w1bj2f.dob" },
  { id: "clothing", title: "Одежда", caption: "Японские бренды", section: "women-fashion", image: "https://static.zenmarket.jp/images/misc/68b97d1e817449228714e72737459c2e/p1hps89dvil3doq91qfo5sl1ck8g.png" },
  { id: "bags", title: "Сумки", caption: "Luxury & Vintage", section: "bags", image: "https://static.zenmarket.jp/images/common-landing-pages/xfpgrn4u.jz2" },
  { id: "electronics", title: "Электроника", caption: "Sony, Panasonic, Nintendo", section: "instruments", image: "https://static.zenmarket.jp/images/common-landing-pages/2w2225qn.twv" },
  { id: "fishing", title: "Рыболовные снасти", caption: "Снасти и экипировка", section: "sports", image: "https://static.zenmarket.jp/images/common-landing-pages/hyuw1ivd.3wq" },
  { id: "stationery", title: "Интерьер и канцелярия", caption: "Дом и бумага", section: "stationery", image: "https://static.zenmarket.jp/images/misc/f6c6cb508ddb40bda9aebf81f3baa944/p1hr8dgot11nqc17ns2el1pplfcl5.png" },
  { id: "matcha", title: "Чай матча", caption: "Порошок и чай", section: "beauty", image: null },
  { id: "retro-consoles", title: "Ретро-консоли", caption: "Классика игр", section: "instruments", image: null },
  { id: "books", title: "Манга и книги", caption: "Манга, новеллы, журналы", section: "books", image: "https://static.zenmarket.jp/images/common-landing-pages/ba5o0wae.4hs" },
  { id: "vinyl", title: "Пластинки", caption: "LP и винил", section: "instruments", image: null },
  { id: "watches", title: "Часы", caption: "Seiko, Orient, Casio", section: "watches", image: "https://static.zenmarket.jp/images/misc/f6beb9e93e1248aaa55695fa600283d5/p1hpsu3j9nsdfu1uhkvaac6v912.png" },
  { id: "beauty", title: "Косметика и уход", caption: "Кожа, волосы, тело", section: "beauty", image: "https://static.zenmarket.jp/images/common-landing-pages/zeec1wic.brs" },
  { id: "supplements", title: "БАДы и добавки", caption: "Красота и здоровье", section: "beauty", image: "https://static.zenmarket.jp/images/common-landing-pages/323axv11.1qt" },
  { id: "instruments", title: "Инструменты", caption: "Гитары, клавиши, DJ", section: "instruments", image: "https://static.zenmarket.jp/images/common-landing-pages/noootdcm.esx" },
  { id: "cameras", title: "Камеры", caption: "Фото и оптика", section: "instruments", image: null },
  { id: "snacks", title: "Снеки и сладости", caption: "KitKat и сладости", section: "beauty", image: null },
  { id: "games", title: "Игры", caption: "PC и консоли", section: "tcg", image: null },
];

function loadLegacySections() {
  const text = fs.readFileSync(
    path.join(root, "src/catalog/src/lib/categories.ts"),
    "utf8",
  );
  const start = text.indexOf("export const LEGACY_CATEGORY_SECTIONS");
  const arrStart = text.indexOf("[", start);
  const arrEnd = text.indexOf("];", arrStart);
  const body = text.slice(arrStart, arrEnd + 1);

  // Parse sections: id: "foo" ... items with item("Label", "url")
  const sections = {};
  const sectionRe =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?title:\s*"([^"]+)"[\s\S]*?items:\s*\[([\s\S]*?)\],?\s*\}/g;
  let m;
  while ((m = sectionRe.exec(body))) {
    const [, id, title, itemsBlock] = m;
    const items = [];
    // Multiline item("Label", "url",) — allow trailing comma before )
    const itemRe = /item\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,?\s*\)/g;
    let im;
    while ((im = itemRe.exec(itemsBlock))) {
      const label = im[1];
      const imageUrl = im[2];
      const slug = label
        .toLowerCase()
        .replace(/[^a-z0-9а-яё]+/gi, "-")
        .replace(/^-|-$/g, "");
      items.push({ label, imageUrl, slug });
    }
    sections[id] = { id, title, items };
  }
  return sections;
}

function esc(s) {
  if (s == null) return "NULL";
  return "'" + String(s).replace(/'/g, "''") + "'";
}

const legacy = loadLegacySections();
const now = new Date().toISOString();
const lines = [];
lines.push("BEGIN;");
lines.push("-- Clear existing category tree (children first because of FK Restrict)");
lines.push('DELETE FROM categories WHERE "ParentId" IS NOT NULL;');
lines.push('DELETE FROM categories WHERE "ParentId" IS NULL;');

let parentOrder = 0;
for (const p of popular) {
  const parentId = randomUUID();
  parentOrder += 1;
  lines.push(`INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '${parentId}'::uuid, NULL, ${esc(p.title)}, ${esc(p.id)}, ${esc(p.caption)}, ${esc(p.image)},
  ${parentOrder}, TRUE, TRUE, '${now}'::timestamptz, NULL, FALSE, NULL
);`);

  const section = legacy[p.section];
  if (!section) {
    console.warn("No legacy section for", p.id, p.section);
    continue;
  }
  let childOrder = 0;
  for (const child of section.items) {
    childOrder += 1;
    const childId = randomUUID();
    // Unique slug per parent: keep item slug; if collision across popular sharing section, still unique under parent
    lines.push(`INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '${childId}'::uuid, '${parentId}'::uuid, ${esc(child.label)}, ${esc(child.slug)}, NULL, ${esc(child.imageUrl)},
  ${childOrder}, FALSE, TRUE, '${now}'::timestamptz, NULL, FALSE, NULL
);`);
  }
}

lines.push('SELECT c."Name" AS root, COUNT(ch."Id") AS children FROM categories c LEFT JOIN categories ch ON ch."ParentId" = c."Id" WHERE c."ParentId" IS NULL AND c."IsDeleted" = false GROUP BY c."Id", c."Name", c."SortOrder" ORDER BY c."SortOrder";');
lines.push("COMMIT;");

const out = path.join(__dirname, "seed-categories.sql");
fs.writeFileSync(out, lines.join("\n"), "utf8");
console.log("Wrote", out);
console.log("Parents:", popular.length, "Legacy sections parsed:", Object.keys(legacy).length);
