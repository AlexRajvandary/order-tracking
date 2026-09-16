import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const inputPath = path.resolve(process.cwd(), process.argv[2] ?? "../../imports/amiami-products.json");
const outputDirectory = path.resolve(process.cwd(), process.argv[3] ?? "../../imports/amiami-by-category");

function toFileName(categoryName) {
  return categoryName
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

const products = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(products)) throw new Error("Исходный JSON должен содержать массив товаров.");

const groups = new Map();
for (const product of products) {
  const categoryName = String(product?.categoryName ?? "").trim();
  if (!categoryName) throw new Error(`У товара ${product?.sku ?? "без SKU"} отсутствует categoryName.`);
  const group = groups.get(categoryName) ?? [];
  group.push(product);
  groups.set(categoryName, group);
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const [categoryName, categoryProducts] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const filePath = path.join(outputDirectory, `${toFileName(categoryName)}.json`);
  await writeFile(filePath, `${JSON.stringify(categoryProducts, null, 2)}\n`, "utf8");
  console.log(`${path.basename(filePath)}: ${categoryProducts.length}`);
}

console.log(`Готово: ${groups.size} файлов, ${products.length} товаров.`);
