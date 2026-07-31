export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  priceRub: number;
  currency: "RUB";
  shortDescription: string;
  description: string;
  tags: string[];
  /** Placeholder visual: solid brand tint for in-memory demo */
  tint: string;
  inStock: boolean;
  imageUrl?: string;
  brand?: string;
  oldPriceRub?: number;
  discountPercent?: string;
  rating?: number;
  reviewsCount?: number;
  isPremium?: boolean;
};

const products: Product[] = [
  {
    id: "p1",
    slug: "nordic-wool-coat",
    name: "Nordic Wool Coat",
    category: "Одежда",
    priceRub: 28900,
    currency: "RUB",
    shortDescription: "Плотное шерстяное пальто с поясом и скрытыми карманами.",
    description:
      "Демо-карточка товара. В памяти приложения — без склада и оплаты. Пальто свободного кроя, подходит для межсезонья. Состав и размеры появятся после подключения реального каталога.",
    tags: ["зима", "шерсть", "унисекс"],
    tint: "#1f6f5b",
    inStock: true,
  },
  {
    id: "p2",
    slug: "glass-desk-lamp",
    name: "Arc Glass Desk Lamp",
    category: "Дом",
    priceRub: 12400,
    currency: "RUB",
    shortDescription: "Настольная лампа с дуговым основанием и тёплым светом.",
    description:
      "Мок-товар для витрины. Стекло и металл, диммер на касание (описание условное). Используется только для проверки UI каталога.",
    tags: ["свет", "офис", "декор"],
    tint: "#c45c26",
    inStock: true,
  },
  {
    id: "p3",
    slug: "trail-runner-pro",
    name: "Trail Runner Pro",
    category: "Спорт",
    priceRub: 15990,
    currency: "RUB",
    shortDescription: "Кроссовки для пересечёнки с усиленной подошвой.",
    description:
      "Фейковые кроссовки в in-memory каталоге. Сетка, защита носка, цвет «slate». Реальных остатков нет — данные живут в коде.",
    tags: ["бег", "outdoor"],
    tint: "#2a4a6b",
    inStock: true,
  },
  {
    id: "p4",
    slug: "ceramic-pour-over",
    name: "Ceramic Pour-Over Set",
    category: "Кухня",
    priceRub: 6800,
    currency: "RUB",
    shortDescription: "Набор для пуровера: воронка, сервер и мерная ложка.",
    description:
      "Демонстрационный набор. Матовая керамика, объём сервера 600 мл (условно). Позже заменим на данные из API/БД.",
    tags: ["кофе", "керамика"],
    tint: "#6b3a4a",
    inStock: false,
  },
  {
    id: "p5",
    slug: "compact-field-bag",
    name: "Compact Field Bag",
    category: "Аксессуары",
    priceRub: 9200,
    currency: "RUB",
    shortDescription: "Компактная сумка на каждый день с отделением для ноутбука 13\".",
    description:
      "In-memory позиция. Водоотталкивающая ткань, ремень через плечо. Нужна только для сетки каталога и страницы товара.",
    tags: ["сумка", "travel"],
    tint: "#3d3a2f",
    inStock: true,
  },
  {
    id: "p6",
    slug: "linen-throw",
    name: "Washed Linen Throw",
    category: "Дом",
    priceRub: 5400,
    currency: "RUB",
    shortDescription: "Льняной плед с необработанным краем, 140×200.",
    description:
      "Мок. Стирка «stone wash», цвет «fog». Без реальной логистики — только отображение в Next.js каталоге.",
    tags: ["текстиль", "лён"],
    tint: "#4a5d4e",
    inStock: true,
  },
  {
    id: "p7",
    slug: "signal-watch",
    name: "Signal Field Watch",
    category: "Аксессуары",
    priceRub: 21900,
    currency: "RUB",
    shortDescription: "Часы с сапфировым стеклом и ремешком из нейлона.",
    description:
      "Фейковый SKU. Кварц, WR 50 м (условно). Карточка нужна для проверки детальной страницы.",
    tags: ["часы", "gadget"],
    tint: "#1a2332",
    inStock: true,
  },
  {
    id: "p8",
    slug: "studio-headphones",
    name: "Studio Fold Headphones",
    category: "Электроника",
    priceRub: 18700,
    currency: "RUB",
    shortDescription: "Складные наушники с активным шумоподавлением (мок).",
    description:
      "Данные только в памяти процесса. ANC, до 30 ч работы — текст для макета, не из магазина.",
    tags: ["audio", "travel"],
    tint: "#0f3d4c",
    inStock: true,
  },
];

export function listProducts(): Product[] {
  return products;
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id || p.slug === id);
}

export function formatPrice(product: Product): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: product.currency,
    maximumFractionDigits: 0,
  }).format(product.priceRub);
}
