export type CategoryItem = {
  id: string;
  slug: string;
  label: string;
  imageUrl: string;
};

export type CategorySection = {
  id: string;
  title: string;
  /** Prefer 6; use 4 for shorter rows like DVD / stationery */
  columns: 4 | 6;
  items: CategoryItem[];
};

function item(label: string, imageUrl: string): CategoryItem {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-|-$/g, "");
  return {
    id: slug,
    slug,
    label,
    imageUrl,
  };
}

/** Category sections styled after ZenMarket / Rakuten landing cat-grids */
export const categorySections: CategorySection[] = [
  {
    id: "figures",
    title: "Фигурки",
    columns: 6,
    items: [
      item("Ichiban Kuji", "https://static.zenmarket.jp/images/common-landing-pages/2rftkwhl.biv"),
      item("Portrait.Of.Pirates", "https://static.zenmarket.jp/images/common-landing-pages/ftbvgyof.lh0"),
      item("Nendoroid", "https://static.zenmarket.jp/images/common-landing-pages/u1wfwyzi.mcf"),
      item("POP UP PARADE", "https://static.zenmarket.jp/images/common-landing-pages/ratteaqm.eyo"),
      item("Banpresto", "https://static.zenmarket.jp/images/common-landing-pages/3qivqoel.zk3"),
      item("Grandista", "https://static.zenmarket.jp/images/common-landing-pages/slrfxqrp.osj"),
    ],
  },
  {
    id: "tcg",
    title: "ККИ",
    columns: 6,
    items: [
      item("Pokemon", "https://static.zenmarket.jp/images/common-landing-pages/a1w1bj2f.dob"),
      item("Yu-Gi-Oh", "https://static.zenmarket.jp/images/common-landing-pages/ssicxmhi.gao"),
      item("Dragon Ball", "https://static.zenmarket.jp/images/common-landing-pages/yclrozvb.3cs"),
      item("One Piece", "https://static.zenmarket.jp/images/common-landing-pages/edjeonan.lc2"),
      item("Kamen Rider", "https://static.zenmarket.jp/images/common-landing-pages/5h1jmodp.hss"),
      item("Weiss Schwarz", "https://static.zenmarket.jp/images/common-landing-pages/s31ueh2w.qqt"),
    ],
  },
  {
    id: "bags",
    title: "Сумки",
    columns: 6,
    items: [
      item(
        "Женские сумки",
        "https://static.zenmarket.jp/images/common-landing-pages/xfpgrn4u.jz2",
      ),
      item(
        "Клатчи",
        "https://static.zenmarket.jp/images/misc/0352967a3b8e4cc1b0f8c34eca0b952e/p1hpsoujmmm98184ca5ovovjlr4.png",
      ),
      item(
        "Сумки на плечо",
        "https://static.zenmarket.jp/images/misc/e1e23ffb5bf34959a297c5fca5ac6047/p1hpsoujmnesj15bj1fj5qr1rol5.png",
      ),
      item(
        "Женские рюкзаки",
        "https://static.zenmarket.jp/images/misc/f45f9369fce74c6fa9d19962dc978321/p1hpsoujmnadtqqauvb10m341o6.png",
      ),
      item(
        "Кросс-боди",
        "https://static.zenmarket.jp/images/misc/a0b0e19b36cc4f6c81d7f61c07422295/p1hpsoujmo14dg1460imn96116ir7.png",
      ),
      item(
        "Мужские рюкзаки",
        "https://static.zenmarket.jp/images/misc/567919774b6b400baf4d7303391a3045/p1hpup4vsd1sib12vf1vn012iq15id4.png",
      ),
    ],
  },
  {
    id: "watches",
    title: "Часы",
    columns: 6,
    items: [
      item(
        "Seiko",
        "https://static.zenmarket.jp/images/misc/f6beb9e93e1248aaa55695fa600283d5/p1hpsu3j9nsdfu1uhkvaac6v912.png",
      ),
      item(
        "Orient",
        "https://static.zenmarket.jp/images/misc/2a96f87fc5e84d67882ec0d8fe6a123c/p1hpsu3j9p1lu7v4v1nrcom9g13.png",
      ),
      item(
        "Casio",
        "https://static.zenmarket.jp/images/misc/4edacc375e904a50930a8aaa247e5220/p1hpsu3j9qeod1avdv61sp8m0214.png",
      ),
      item(
        "Minase",
        "https://static.zenmarket.jp/images/misc/c99ffd980b004fdc96cd2055249a0dde/p1hpsu3j9qiba1pg6r2ahvi2th15.png",
      ),
      item(
        "Knot",
        "https://static.zenmarket.jp/images/misc/9eaa93aaa7644e44a642ee3dda11f958/p1hpsu3j9q2gp1e4rd9q135rc16.png",
      ),
      item(
        "Citizen",
        "https://static.zenmarket.jp/images/misc/92c384d58d7d4f8b905ab9734f04454a/p1hpsu4bus1fovmvbomrfpm1lct1e.png",
      ),
    ],
  },
  {
    id: "women-fashion",
    title: "Женская мода",
    columns: 6,
    items: [
      item(
        "Кимоно",
        "https://static.zenmarket.jp/images/misc/68b97d1e817449228714e72737459c2e/p1hps89dvil3doq91qfo5sl1ck8g.png",
      ),
      item(
        "Платья",
        "https://static.zenmarket.jp/images/misc/70aa5c4944d149afbb7723e90b8399b1/p1hps88aig1sl114qu1f4ehs111qc8.png",
      ),
      item(
        "Верх",
        "https://static.zenmarket.jp/images/misc/dfcc09f4bb5041caba06badee9b8e00d/p1hps88aig1l6j8nkjl110qlrat7.png",
      ),
      item(
        "Низ",
        "https://static.zenmarket.jp/images/misc/761d3d45f8b54ce3b5f0605a5c5bde45/p1hps88aig10nn91h1v9qtb1j9s6.png",
      ),
      item(
        "Верхняя одежда",
        "https://static.zenmarket.jp/images/misc/9c3e6d8cfca94113912d5cbb0c6eca43/p1hps88aig180m1gv4peqtnfdpn5.png",
      ),
      item(
        "Костюмы",
        "https://static.zenmarket.jp/images/misc/e138cc9ae4934ec092076ec489b74bf9/p1hps88aif12ur1utf120u1l18aq94.png",
      ),
    ],
  },
  {
    id: "men-fashion",
    title: "Мужская мода",
    columns: 6,
    items: [
      item(
        "Кимоно",
        "https://static.zenmarket.jp/images/misc/3936c16df1f34957a4e58e763f766337/p1hpsa7h7ucbi17hbidl1b4djm3g.png",
      ),
      item(
        "Верхняя одежда",
        "https://static.zenmarket.jp/images/misc/aaf9d8c1ae804f96a773d9af9d05153b/p1hps9onccj661ej5n4u10041dve8.png",
      ),
      item(
        "Верх",
        "https://static.zenmarket.jp/images/misc/eee4d22a84c24538809544e5edb17bfc/p1hps9oncb1vj215ua1mln1qkgus7.png",
      ),
      item(
        "Низ",
        "https://static.zenmarket.jp/images/misc/b7a7efcbcdd940cfaeddb6bf765bcacb/p1hps9oncb1osf11u7d341ubd1h466.png",
      ),
      item(
        "Куртки",
        "https://static.zenmarket.jp/images/misc/deebf7ed39ab44acbbd9b2ed35efa4b1/p1hps9oncb1ujadh817mp1g82lkb5.png",
      ),
      item(
        "Костюмы",
        "https://static.zenmarket.jp/images/misc/b41c580096dc402c95bc51ca097fb782/p1hps9oncb19871i0it24a7q4m4.png",
      ),
    ],
  },
  {
    id: "beauty",
    title: "Красота и здоровье",
    columns: 6,
    items: [
      item("БАДы", "https://static.zenmarket.jp/images/common-landing-pages/323axv11.1qt"),
      item("Уход за глазами", "https://static.zenmarket.jp/images/common-landing-pages/q00sowdr.u4q"),
      item("Уход за кожей", "https://static.zenmarket.jp/images/common-landing-pages/zeec1wic.brs"),
      item("Уход за волосами", "https://static.zenmarket.jp/images/common-landing-pages/xkh00udc.4ak"),
      item("Уход за телом", "https://static.zenmarket.jp/images/common-landing-pages/mktfg4yq.4jg"),
      item(
        "Бьюти-устройства",
        "https://static.zenmarket.jp/images/misc/b6b0b07569a04e23afd7f91858081305/p1hpsu0cum1vqoe1s19b211uk1bl7s.png",
      ),
    ],
  },
  {
    id: "instruments",
    title: "Музыкальные инструменты",
    columns: 6,
    items: [
      item("Гитары", "https://static.zenmarket.jp/images/common-landing-pages/noootdcm.esx"),
      item("Бас-гитары", "https://static.zenmarket.jp/images/common-landing-pages/cvsyfq5q.txu"),
      item(
        "Клавишные, синтезаторы",
        "https://static.zenmarket.jp/images/misc/9607d5ee8bcb4b35a0e48838847d342d/p1hpsu54b91hsh16m41ss1qm68us1g.png",
      ),
      item("Струнные", "https://static.zenmarket.jp/images/common-landing-pages/4wn3bz1t.wpl"),
      item("Духовые", "https://static.zenmarket.jp/images/common-landing-pages/dfgbnaan.plm"),
      item("DJ-оборудование", "https://static.zenmarket.jp/images/common-landing-pages/2w2225qn.twv"),
    ],
  },
  {
    id: "sports",
    title: "Спорт и отдых",
    columns: 6,
    items: [
      item("Гольф", "https://static.zenmarket.jp/images/common-landing-pages/5nfv225i.hmn"),
      item("Рыбалка", "https://static.zenmarket.jp/images/common-landing-pages/hyuw1ivd.3wq"),
      item("Бейсбол", "https://static.zenmarket.jp/images/common-landing-pages/00h1g4r4.k53"),
      item("Футбол", "https://static.zenmarket.jp/images/common-landing-pages/musey4tj.jko"),
      item("Кемпинг", "https://static.zenmarket.jp/images/common-landing-pages/fc224l0d.bsz"),
      item("Походы", "https://static.zenmarket.jp/images/common-landing-pages/xncuve42.mgb"),
    ],
  },
  {
    id: "books",
    title: "Книги и манга",
    columns: 6,
    items: [
      item("Книги", "https://static.zenmarket.jp/images/common-landing-pages/hpm5hsh2.wsf"),
      item("Манга", "https://static.zenmarket.jp/images/common-landing-pages/ba5o0wae.4hs"),
      item(
        "Лайт-новеллы",
        "https://static.zenmarket.jp/images/misc/3ecd473154484af29581e7e41abdd5a5/p1hpup8fof1eiu55qtmv13sdqk36.png",
      ),
      item("Журналы", "https://static.zenmarket.jp/images/common-landing-pages/k2yvugsn.qkg"),
      item("Иллюстрированные книги", "https://static.zenmarket.jp/images/common-landing-pages/3ay41wty.0np"),
      item(
        "Slash / BL",
        "https://static.zenmarket.jp/images/misc/1c171dd425c04c929f29c66ae6cae9d7/p1hrlce9qidkt1jda1gqv1fiv56ha.png",
      ),
    ],
  },
  {
    id: "dvd",
    title: "DVD",
    columns: 4,
    items: [
      item("Аниме", "https://static.zenmarket.jp/images/common-landing-pages/3v4kmupq.ky4"),
      item("Концерты", "https://static.zenmarket.jp/images/common-landing-pages/za0etsnz.baj"),
      item("Дорама", "https://static.zenmarket.jp/images/common-landing-pages/ps2dqxn0.11x"),
      item(
        "Японское кино",
        "https://static.zenmarket.jp/images/misc/e45c7af8b1f445b69a0325d6ef89ceba/p1hr8dgot01kje1emifi31ikq10gu4.png",
      ),
    ],
  },
  {
    id: "stationery",
    title: "Канцтовары",
    columns: 4,
    items: [
      item(
        "Ручки",
        "https://static.zenmarket.jp/images/misc/2a9fa1b180f242a89e9b4cf5b723adb4/p1hr8dgot1mul1tqehta1f0u1slf7.png",
      ),
      item(
        "Блокноты, бумага",
        "https://static.zenmarket.jp/images/misc/f6c6cb508ddb40bda9aebf81f3baa944/p1hr8dgot11nqc17ns2el1pplfcl5.png",
      ),
      item(
        "Каллиграфия",
        "https://static.zenmarket.jp/images/misc/27cf76646a4b4524a987139dc7123070/p1hr8d5or4hh08ao1556ot15r34.png",
      ),
      item(
        "Другое",
        "https://static.zenmarket.jp/images/misc/23ebe868ffb7436799e56e129a7bc735/p1hr8dgot11vh1egdc4o1tid1ilq6.png",
      ),
    ],
  },
];

export function findCategoryItem(
  sectionId: string,
  slug: string,
): {
  section: CategorySection;
  item: CategoryItem;
} | null {
  const section = categorySections.find((s) => s.id === sectionId);
  if (!section) return null;
  const found = section.items.find((i) => i.slug === slug);
  if (!found) return null;
  return { section, item: found };
}

export function getCategorySection(id: string): CategorySection | undefined {
  return categorySections.find((s) => s.id === id);
}
