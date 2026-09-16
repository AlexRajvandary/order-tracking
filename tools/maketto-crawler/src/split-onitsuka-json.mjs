import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const inputDirectory = path.resolve(process.cwd(), process.argv[2] ?? "../../imports");
const outputDirectory = path.resolve(process.cwd(), process.argv[3] ?? "../../imports/onitsuka-by-category-and-gender");
const genders = ["UNISEX", "MEN", "WOMEN", "KIDS"];

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

const fileNames = (await readdir(inputDirectory))
  .filter((name) => /^onitsuka-tiger-.*\.json$/i.test(name))
  .sort();

if (fileNames.length === 0) throw new Error(`Файлы Onitsuka Tiger не найдены в ${inputDirectory}`);

const productsBySku = new Map();
for (const fileName of fileNames) {
  const products = JSON.parse(await readFile(path.join(inputDirectory, fileName), "utf8"));
  if (!Array.isArray(products)) throw new Error(`${fileName} не содержит массив товаров.`);
  for (const product of products) {
    if (!product?.sku) throw new Error(`В ${fileName} найден товар без SKU.`);
    const key = `${product.categoryName}\u0000${product.sku}`;
    productsBySku.set(key, product);
  }
}

const products = [...productsBySku.values()];
const categories = [...new Set(products.map((product) => String(product.categoryName).trim()))].sort();

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

let writtenProducts = 0;
for (const category of categories) {
  for (const gender of genders) {
    const matching = products.filter(
      (product) => product.categoryName === category && String(product.gender).toUpperCase() === gender,
    );
    const fileName = `${slugify(category)}--${gender.toLowerCase()}.json`;
    await writeFile(path.join(outputDirectory, fileName), `${JSON.stringify(matching, null, 2)}\n`, "utf8");
    writtenProducts += matching.length;
    console.log(`${fileName}: ${matching.length}`);
  }
}

console.log(`Готово: ${categories.length * genders.length} файлов, ${writtenProducts} товаров.`);
