import { Suspense } from "react";
import { randomInt } from "node:crypto";
import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import { CatalogEntryScrollReset } from "@/components/home-catalog-navigation";
import { fetchCatalogFacets, parseBrandSlugs } from "@/lib/brands-api";
import {
  categoryHref,
  fetchFreshCategoryTree,
  findChildCategory,
  findRootCategory,
  safeDecode,
} from "@/lib/categories-api";
import {
  fetchAllCatalogPage,
  fetchCatalogPage,
  fetchRakutenCategoryPage,
  mapRakutenProductToCatalog,
  PRODUCTS_PAGE_SIZE,
} from "@/lib/products-api";
import { parseCsvParam } from "@/lib/shops-api";

type PageProps = {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{
    page?: string;
    sub?: string;
    brands?: string;
    shops?: string;
    genders?: string;
    laptopProcessors?: string;
    laptopRamGb?: string;
    laptopStorageTypes?: string;
    laptopStorageGb?: string;
    laptopScreenSizes?: string;
    laptopOperatingSystems?: string;
    tcgCharacters?: string;
    tcgSets?: string;
    tcgRarities?: string;
    tcgCrews?: string;
    yugiohCardTypes?: string;
    yugiohCardSubtypes?: string;
    yugiohAttributes?: string;
    yugiohMonsterRaces?: string;
    yugiohSeriesTypes?: string;
    shuffleSeed?: string;
  }>;
};

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function buildBasePath(
  rootSlug: string,
  subSlug?: string,
  brandSlugs?: string[],
  shopSlugs?: string[],
  genders?: string[],
  laptopFilters?: Record<string, string[]>,
  tcgCharacters?: string[],
  tcgSets?: string[],
  tcgRarities?: string[],
  tcgCrews?: string[],
  yugiohFilters?: Record<string, string[]>,
  shuffleSeed?: number,
) {
  const qs = new URLSearchParams();
  if (subSlug) qs.set("sub", subSlug);
  if (brandSlugs && brandSlugs.length > 0) qs.set("brands", brandSlugs.join(","));
  if (shopSlugs && shopSlugs.length > 0) qs.set("shops", shopSlugs.join(","));
  if (genders && genders.length > 0) qs.set("genders", genders.join(","));
  for (const [key, values] of Object.entries(laptopFilters ?? {})) {
    if (values.length > 0) qs.set(key, values.join(","));
  }
  if (tcgCharacters && tcgCharacters.length > 0) qs.set("tcgCharacters", tcgCharacters.join(","));
  if (tcgSets && tcgSets.length > 0) qs.set("tcgSets", tcgSets.join(","));
  if (tcgRarities && tcgRarities.length > 0) qs.set("tcgRarities", tcgRarities.join(","));
  if (tcgCrews && tcgCrews.length > 0) qs.set("tcgCrews", tcgCrews.join(","));
  for (const [key, values] of Object.entries(yugiohFilters ?? {})) {
    if (values.length > 0) qs.set(key, values.join(","));
  }
  if (shuffleSeed != null) qs.set("shuffleSeed", String(shuffleSeed));
  const search = qs.toString();
  return search ? `/categories/${rootSlug}?${search}` : `/categories/${rootSlug}`;
}

export default async function CategorySectionPage({
  params,
  searchParams,
}: PageProps) {
  const { sectionId } = await params;
  const {
    page: pageParam,
    sub: subParam,
    brands: brandsParam,
    shops: shopsParam,
    genders: gendersParam,
    laptopProcessors,
    laptopRamGb,
    laptopStorageTypes,
    laptopStorageGb,
    laptopScreenSizes,
    laptopOperatingSystems,
    tcgCharacters: tcgCharactersParam,
    tcgSets: tcgSetsParam,
    tcgRarities: tcgRaritiesParam,
    tcgCrews: tcgCrewsParam,
    yugiohCardTypes,
    yugiohCardSubtypes,
    yugiohAttributes,
    yugiohMonsterRaces,
    yugiohSeriesTypes,
    shuffleSeed: shuffleSeedParam,
  } = await searchParams;
  const page = parsePage(pageParam);
  const subSlug = subParam ? safeDecode(subParam) : undefined;
  const selectedBrandSlugs = parseBrandSlugs(brandsParam);
  const selectedShopSlugs = parseCsvParam(shopsParam);
  const decodedSectionId = safeDecode(sectionId);
  const isAllCategories = decodedSectionId === "all";
  const selectedTcgCharacters = decodedSectionId.toLowerCase() === "tcg"
    ? parseCsvParam(tcgCharactersParam)
    : [];
  const selectedTcgSets = decodedSectionId.toLowerCase() === "tcg" ? parseCsvParam(tcgSetsParam) : [];
  const selectedTcgRarities = decodedSectionId.toLowerCase() === "tcg" ? parseCsvParam(tcgRaritiesParam) : [];
  const selectedTcgCrews = decodedSectionId.toLowerCase() === "tcg" ? parseCsvParam(tcgCrewsParam) : [];
  const isYuGiOhCategory = decodedSectionId.toLowerCase() === "tcg"
    && ["yu-gi-oh", "yugioh"].includes(subSlug?.toLowerCase() ?? "");
  const selectedYuGiOhFilters = isYuGiOhCategory ? {
    cardTypes: parseCsvParam(yugiohCardTypes),
    cardSubtypes: parseCsvParam(yugiohCardSubtypes),
    attributes: parseCsvParam(yugiohAttributes),
    monsterRaces: parseCsvParam(yugiohMonsterRaces),
    seriesTypes: parseCsvParam(yugiohSeriesTypes),
  } : { cardTypes: [], cardSubtypes: [], attributes: [], monsterRaces: [], seriesTypes: [] };
  const isShoesCategory = ["shoes", "obuv", "обувь"].includes(decodedSectionId.toLowerCase());
  const selectedGenders = (isShoesCategory ? parseCsvParam(gendersParam) : []).filter((value) =>
    ["unisex", "men", "women", "kids"].includes(value),
  ) as Array<"unisex" | "men" | "women" | "kids">;
  const parsedShuffleSeed = Number(shuffleSeedParam);
  const requestedShuffleSeed =
    Number.isSafeInteger(parsedShuffleSeed) && parsedShuffleSeed >= 0
      ? parsedShuffleSeed
      : randomInt(0, 2_147_483_647);
  const shuffleSeed = isAllCategories || !subSlug
    ? requestedShuffleSeed
    : undefined;

  // Catalog pages must always receive a fresh tree with current counts for every
  // root category and subcategory. Client-side navigation keeps the previous
  // snapshot visible while this uncached request is in flight.
  const categoryTreePromise = fetchFreshCategoryTree().catch(() => []);

  // Product requests do not depend on category metadata. Start them immediately
  // instead of putting products behind the categories/shops waterfall. Tree
  // validation below still controls the title, breadcrumbs and 404 behaviour.
  const earlyCatalogPromise = isAllCategories
    ? fetchAllCatalogPage({
        page,
        pageSize: PRODUCTS_PAGE_SIZE,
        brandSlugs: selectedBrandSlugs,
        shopSlugs: selectedShopSlugs,
        genders: selectedGenders,
        shuffleSeed,
      })
    : !subSlug ? fetchCatalogPage({
        rootCategorySlug: decodedSectionId,
        rootCategoryName: decodedSectionId,
        page,
        pageSize: PRODUCTS_PAGE_SIZE,
        brandSlugs: selectedBrandSlugs,
        shopSlugs: selectedShopSlugs,
        genders: selectedGenders,
        tcgCharacters: selectedTcgCharacters,
        tcgSets: selectedTcgSets,
        tcgRarities: selectedTcgRarities,
        tcgCrews: selectedTcgCrews,
        yugiohFilters: selectedYuGiOhFilters,
        shuffleSeed,
      }) : null;

  const categoryTree = await categoryTreePromise;

  const root = isAllCategories ? undefined : findRootCategory(categoryTree, sectionId);
  if (!isAllCategories && !root) notFound();

  const child = root && subSlug ? findChildCategory(root, subSlug) : undefined;
  const isLaptopCategory = (child?.slug ?? root?.slug)?.toLowerCase() === "laptops";
  const selectedLaptopFilters = isLaptopCategory ? {
    models: [],
    processors: parseCsvParam(laptopProcessors),
    ramGb: parseCsvParam(laptopRamGb),
    storageTypes: parseCsvParam(laptopStorageTypes),
    storageGb: parseCsvParam(laptopStorageGb),
    screenSizes: parseCsvParam(laptopScreenSizes),
    operatingSystems: parseCsvParam(laptopOperatingSystems),
  } : { models: [], processors: [], ramGb: [], storageTypes: [], storageGb: [], screenSizes: [], operatingSystems: [] };
  const facetsPromise = fetchCatalogFacets(
    child?.id ?? root?.id,
    child?.slug ?? root?.slug,
    !child,
  ).catch(() => ({
    brands: [], shops: [],
    laptop: { models: [], processors: [], ramGb: [], storageTypes: [], storageGb: [], screenSizes: [], operatingSystems: [] },
    tcg: {
      characters: [], sets: [], rarities: [], crews: [],
      yuGiOh: { cardTypes: [], cardSubtypes: [], attributes: [], monsterRaces: [], seriesTypes: [] },
    },
  }));
  const effectiveShuffleSeed = isAllCategories || !child
    ? requestedShuffleSeed
    : undefined;

  // Preserve the previous behaviour for an unknown `sub`: show the root
  // category rather than an empty result for the invalid child slug.
  const catalogPromise = subSlug && !child && root
    ? fetchCatalogPage({
        rootCategorySlug: root.slug,
        rootCategoryName: root.name,
        page,
        pageSize: PRODUCTS_PAGE_SIZE,
        brandSlugs: selectedBrandSlugs,
        shopSlugs: selectedShopSlugs,
        genders: selectedGenders,
        laptopFilters: selectedLaptopFilters,
        tcgCharacters: selectedTcgCharacters,
        tcgSets: selectedTcgSets,
        tcgRarities: selectedTcgRarities,
        tcgCrews: selectedTcgCrews,
        yugiohFilters: selectedYuGiOhFilters,
        shuffleSeed: effectiveShuffleSeed,
      })
    : child && root
      ? fetchCatalogPage({
          rootCategoryId: root.id,
          rootCategorySlug: root.slug,
          rootCategoryName: root.name,
          page,
          pageSize: PRODUCTS_PAGE_SIZE,
          brandSlugs: selectedBrandSlugs,
          shopSlugs: selectedShopSlugs,
          genders: selectedGenders,
          laptopFilters: selectedLaptopFilters,
          tcgCharacters: selectedTcgCharacters,
          tcgSets: selectedTcgSets,
          tcgRarities: selectedTcgRarities,
          tcgCrews: selectedTcgCrews,
          yugiohFilters: selectedYuGiOhFilters,
          categoryId: child.id,
          categorySlug: child.slug,
          categoryName: child.name,
        })
      : earlyCatalogPromise!;
  const [catalog, facets] = await Promise.all([
    catalogPromise,
    facetsPromise,
  ]);

  const showRakutenTcg = root?.slug === "tcg" && !child
    && selectedBrandSlugs.length === 0 && selectedShopSlugs.length === 0
    && selectedTcgCharacters.length === 0
    && selectedTcgSets.length === 0
    && selectedTcgRarities.length === 0
    && selectedTcgCrews.length === 0;
  const rakutenProducts = showRakutenTcg
    ? await fetchRakutenCategoryPage({ genreId: 406864, page, pageSize: 20 })
        .then(result => result.items.map(mapRakutenProductToCatalog))
        .catch(() => [])
    : [];

  return (
    <div className="min-h-screen bg-background">
      <CatalogEntryScrollReset />
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6 sm:px-8 lg:px-10">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка…</p>}>
          <CatalogBrowser
            products={[...catalog.products, ...rakutenProducts]}
            title={isAllCategories ? "Все товары" : (child?.name ?? root!.name)}
            parentBreadcrumb={
              child && root
                ? { label: root.name, href: categoryHref(root.slug) }
                : undefined
            }
            categoryTree={categoryTree}
            activeRootSlug={root?.slug}
            activeChildSlug={child?.slug}
            brands={facets.brands}
            categoryFacetsScoped
            selectedBrandSlugs={selectedBrandSlugs}
            shops={facets.shops}
            selectedShopSlugs={selectedShopSlugs}
            selectedGenders={selectedGenders}
            laptopFacets={facets.laptop}
            selectedLaptopFilters={selectedLaptopFilters}
            tcgCharacters={facets.tcg.characters}
            selectedTcgCharacters={selectedTcgCharacters}
            tcgSets={facets.tcg.sets}
            selectedTcgSets={selectedTcgSets}
            tcgRarities={facets.tcg.rarities}
            selectedTcgRarities={selectedTcgRarities}
            tcgCrews={facets.tcg.crews}
            selectedTcgCrews={selectedTcgCrews}
            yugiohFacets={facets.tcg.yuGiOh}
            selectedYuGiOhFilters={selectedYuGiOhFilters}
            pagination={{
              page: catalog.page,
              pageSize: catalog.pageSize,
              total: catalog.total,
              basePath: buildBasePath(
                root?.slug ?? "all",
                child?.slug,
                selectedBrandSlugs,
                selectedShopSlugs,
                selectedGenders,
                isLaptopCategory ? {
                  laptopProcessors: selectedLaptopFilters.processors,
                  laptopRamGb: selectedLaptopFilters.ramGb,
                  laptopStorageTypes: selectedLaptopFilters.storageTypes,
                  laptopStorageGb: selectedLaptopFilters.storageGb,
                  laptopScreenSizes: selectedLaptopFilters.screenSizes,
                  laptopOperatingSystems: selectedLaptopFilters.operatingSystems,
                } : undefined,
                selectedTcgCharacters,
                selectedTcgSets,
                selectedTcgRarities,
                selectedTcgCrews,
                isYuGiOhCategory ? {
                  yugiohCardTypes: selectedYuGiOhFilters.cardTypes,
                  yugiohCardSubtypes: selectedYuGiOhFilters.cardSubtypes,
                  yugiohAttributes: selectedYuGiOhFilters.attributes,
                  yugiohMonsterRaces: selectedYuGiOhFilters.monsterRaces,
                  yugiohSeriesTypes: selectedYuGiOhFilters.seriesTypes,
                } : undefined,
                effectiveShuffleSeed,
              ),
              shuffleSeed: effectiveShuffleSeed,
            }}
          />
        </Suspense>
      </main>
    </div>
  );
}
