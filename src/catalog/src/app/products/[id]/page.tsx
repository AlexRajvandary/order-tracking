import { notFound } from "next/navigation";
import Link from "next/link";
import { Scale } from "lucide-react";
import { NavigationBackButton } from "@/components/navigation-back-button";
import { ProductDetailActions } from "@/components/product-detail-actions";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchCategoryTree } from "@/lib/categories-api";
import { findCatalogProductBySlug, type CatalogProduct } from "@/lib/catalog-products";
import { fetchCatalogPage, fetchProductById, fetchProductBySlug, fetchProductRelations, fetchRakutenItem, mapApiProductToCatalog, mapRakutenProductToCatalog } from "@/lib/products-api";
import { formatPrice, getProductById, type Product } from "@/lib/products";
import { onePieceRarityName } from "@/lib/one-piece-rarity";

type PageProps = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TCG_SHOP_NAMES: Record<string, string> = {
  yahoo_auction: "Yahoo Auction",
  mercari: "Mercari",
  magi: "Magi",
  suruga_ya: "Suruga-ya",
  rakuma: "Rakuma",
  rakuten: "Rakuten",
  yahoo_flea_market: "Yahoo Flea Market",
  amazon_japan: "Amazon Japan",
  yahoo_shopping: "Yahoo Shopping",
};

async function resolveProduct(idOrSlug: string): Promise<CatalogProduct | Product | undefined> {
  const decoded = decodeURIComponent(idOrSlug);
  if (decoded.startsWith("rakuten~")) {
    const item = await fetchRakutenItem(decoded.slice("rakuten~".length));
    return item ? mapRakutenProductToCatalog(item) : undefined;
  }
  const demo = getProductById(decoded) ?? findCatalogProductBySlug(decoded);
  if (demo) return demo;
  try {
    if (UUID_RE.test(decoded)) {
      const byId = await fetchProductById(decoded);
      if (byId) return mapApiProductToCatalog(byId);
    }
    const bySlug = await fetchProductBySlug(decoded);
    return bySlug ? mapApiProductToCatalog(bySlug) : undefined;
  } catch { return undefined; }
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const product = await resolveProduct((await params).id);
  return product ? { title: product.name, description: product.shortDescription } : { title: "Товар не найден" };
}

export default async function ProductPage({ params }: PageProps) {
  const product = await resolveProduct((await params).id);
  if (!product) notFound();
  const catalog = product as CatalogProduct;
  const relations = product.source === "Rakuten"
    ? { variants: [], images: [] }
    : await fetchProductRelations(product.id).catch(() => ({ variants: [], images: [] }));
  const categoryTree = await fetchCategoryTree().catch(() => []);
  const categorySlug = "categorySlug" in product ? product.categorySlug : undefined;
  const root = categoryTree.find((item) => item.slug === categorySlug || item.children.some((child) => child.slug === categorySlug));
  const child = root?.children.find((item) => item.slug === categorySlug);
  const rootSlug = root?.slug ?? categorySlug;
  const showSizes = rootSlug === "clothing";
  const related = rootSlug ? await fetchCatalogPage({ rootCategorySlug: rootSlug, rootCategoryName: root?.name ?? product.category, page: 1, pageSize: 8, categorySlug: child?.slug, categoryName: child?.name }).then((result) => result.products.filter((item) => item.id !== product.id)).catch(() => []) : [];
  const condition = product.condition === "used" ? "Б/У" : product.condition === "new" ? "Новое" : "";
  const summary = [product.brand, product.shopName, condition].filter(Boolean).join(" · ");
  const onePieceCharacter = product.tcgCard?.characters.find((item) => item.onePieceSpecification)?.onePieceSpecification;
  const productDetails = [
    ["Бренд", product.brand],
    ["Магазин", product.shopName],
    ["Категория", product.category],
    ["Состояние", condition],
    ["Персонаж", product.tcgCard?.characterName],
    ["Набор", product.tcgCard?.setName],
    ["Номер карты", product.tcgCard?.cardNumber],
    ["Редкость", product.tcgCard?.franchise === "one-piece"
      ? onePieceRarityName(product.tcgCard.rarity)
      : product.tcgCard?.rarity],
    ["Команда", onePieceCharacter?.crew],
    ["Дьявольский фрукт", onePieceCharacter?.devilFruit],
    ["Роль", onePieceCharacter?.role],
    ["Первое появление", onePieceCharacter?.firstAppearance],
  ].filter(([, value]) => typeof value === "string" && value.trim().length > 0);
  const tcgShopLinks = Object.entries(product.tcgCard?.shopLinks ?? {}).filter(([, url]) => /^https?:\/\//i.test(url));
  const backHref = rootSlug ? `/categories/${rootSlug}${child ? `?sub=${encodeURIComponent(child.slug)}` : ""}` : "/";

  return (
    <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <NavigationBackButton
        label="Назад к каталогу"
        fallbackHref={backHref}
        className="mb-5 -ml-2"
      />
      <nav className="mb-6 text-xs text-muted-foreground">Главная <span className="mx-2">/</span> {product.category} <span className="mx-2">/</span> {product.name}</nav>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:gap-14">
        <ProductGallery product={catalog} images={relations.images} />
        <div className="flex flex-col">
          {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
          <h1 className={summary ? "mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl" : "text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"}>{product.name}</h1>
          <div className="mt-5 flex flex-wrap items-baseline gap-3"><p className="text-2xl font-semibold">{formatPrice(product)}</p>{product.oldPriceRub ? <p className="text-lg text-muted-foreground line-through">{new Intl.NumberFormat("ru-RU", { style: "currency", currency: product.currency, maximumFractionDigits: 0 }).format(product.oldPriceRub)}</p> : null}{product.discountPercent ? <Badge variant="destructive">{product.discountPercent}</Badge> : null}</div>
          <div className="mt-6"><ProductDetailActions product={catalog} variants={relations.variants} showSizes={showSizes} /></div>
          <div className="mt-6 space-y-3 bg-muted/40 p-5 text-sm"><p className="font-medium">Заказ из Японии</p><p className="text-muted-foreground">Товар будет выкуплен у японского магазина после оформления заказа.</p>{condition ? <div className="flex justify-between border-t border-border pt-3"><span>Состояние</span><span>{condition}</span></div> : null}<Button render={<Link href="/item-weight" />} variant="outline" className="mt-2 w-full bg-background"><Scale data-icon="inline-start" />Примерный вес товара</Button></div>
        </div>
      </div>
      <section className="mt-16 grid gap-8 border-t border-border pt-8 md:grid-cols-[1fr_1.4fr]"><div><h2 className="text-xl font-semibold">О товаре</h2>{product.description ? <p className="mt-4 max-w-md whitespace-pre-line text-sm leading-6 text-muted-foreground">{product.description}</p> : null}{product.tcgCard?.officialUrl ? <div className="mt-6"><Button render={<a href={product.tcgCard.officialUrl} target="_blank" rel="noreferrer" />} variant="outline" size="sm">Официальная страница карты</Button></div> : null}{tcgShopLinks.length > 0 ? <div className="mt-6"><p className="text-sm font-medium">Найти в магазинах</p><div className="mt-2 flex flex-wrap gap-2">{tcgShopLinks.map(([shop, url]) => <Button key={shop} render={<a href={url} target="_blank" rel="noreferrer" />} variant="outline" size="sm">{TCG_SHOP_NAMES[shop.toLowerCase()] ?? shop.replaceAll("_", " ")}</Button>)}</div></div> : null}</div>{productDetails.length > 0 ? <dl className="divide-y divide-border text-sm">{productDetails.map(([label, value]) => <div key={label} className="flex justify-between gap-6 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right">{value}</dd></div>)}</dl> : null}</section>
      {related.length > 0 ? <section className="mt-14 space-y-4"><h2 className="text-xl font-semibold">Вам также может понравиться</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section> : null}
    </main></div>
  );
}
