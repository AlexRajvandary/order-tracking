import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(fs.readFileSync(path.join(__dirname, "bags-seed.json"), "utf8"));

function esc(s) {
  if (s == null) return "NULL";
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function num(n) {
  if (n == null) return "NULL";
  return String(n);
}

const lines = [];
lines.push("BEGIN;");
for (const p of products) {
  const auditId = randomUUID();
  lines.push(`INSERT INTO products (
  "Id", "Name", "Slug", "Description", "Sku", "Brand",
  "Price", "CurrencyCode", "OriginalPrice", "OriginalCurrencyCode",
  "ImageUrl", "SourceUrl", "IsActive", "CreatedAt", "UpdatedAt", "IsDeleted", "DeletedAt"
) VALUES (
  '${p.id}'::uuid,
  ${esc(p.name)},
  ${esc(p.slug)},
  ${esc(p.description)},
  ${esc(p.sku)},
  ${esc(p.brand)},
  ${num(p.price)},
  ${esc(p.currencyCode)},
  ${num(p.originalPrice)},
  ${esc(p.originalCurrencyCode)},
  ${esc(p.imageUrl)},
  ${esc(p.sourceUrl)},
  ${p.isActive ? "TRUE" : "FALSE"},
  '${p.createdAt}'::timestamptz,
  NULL,
  FALSE,
  NULL
);`);

  lines.push(`INSERT INTO product_audit_log (
  "Id", "ProductId", "Action", "ActorAdminId", "ActorLogin", "OldValues", "NewValues", "CreatedAt"
) VALUES (
  '${auditId}'::uuid,
  '${p.id}'::uuid,
  'Created',
  NULL,
  'seed',
  NULL,
  ${esc(JSON.stringify({ name: p.name, sku: p.sku, category: "сумки", source: p.sourceUrl }))}::jsonb,
  '${p.createdAt}'::timestamptz
);`);
}
lines.push("COMMIT;");
lines.push("SELECT COUNT(*) AS total FROM products WHERE \"IsDeleted\" = false;");

const sqlPath = path.join(__dirname, "bags-seed.sql");
fs.writeFileSync(sqlPath, lines.join("\n"), "utf8");
console.log(`Wrote SQL for ${products.length} products -> ${sqlPath}`);
