BEGIN;
-- Clear existing category tree (children first because of FK Restrict)
DELETE FROM categories WHERE "ParentId" IS NOT NULL;
DELETE FROM categories WHERE "ParentId" IS NULL;
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'fdbaf9b3-dbbb-4207-be46-2163bc96911b'::uuid, NULL, 'Фигурки', 'figures', 'Коллекционные издания', 'https://static.zenmarket.jp/images/common-landing-pages/u1wfwyzi.mcf',
  1, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '1169b840-e51e-486e-8616-b94365bacb43'::uuid, 'fdbaf9b3-dbbb-4207-be46-2163bc96911b'::uuid, 'Ichiban Kuji', 'ichiban-kuji', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/2rftkwhl.biv',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '17b9a0e6-f1d2-40d4-b4c2-8c7832603439'::uuid, 'fdbaf9b3-dbbb-4207-be46-2163bc96911b'::uuid, 'Portrait.Of.Pirates', 'portrait-of-pirates', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/ftbvgyof.lh0',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'bacad93a-7126-432b-a21a-1c31fc421042'::uuid, 'fdbaf9b3-dbbb-4207-be46-2163bc96911b'::uuid, 'Nendoroid', 'nendoroid', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/u1wfwyzi.mcf',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '29caa4c8-7dfc-489c-ab54-1c3119172894'::uuid, 'fdbaf9b3-dbbb-4207-be46-2163bc96911b'::uuid, 'POP UP PARADE', 'pop-up-parade', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/ratteaqm.eyo',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '5ded5b24-2034-4f5e-8043-d868908bdac5'::uuid, 'fdbaf9b3-dbbb-4207-be46-2163bc96911b'::uuid, 'Banpresto', 'banpresto', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/3qivqoel.zk3',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'b84695f0-7e5a-463a-819d-d384d382194d'::uuid, 'fdbaf9b3-dbbb-4207-be46-2163bc96911b'::uuid, 'Grandista', 'grandista', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/slrfxqrp.osj',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '96cd1b9f-3d28-4d84-adde-022e3a7f8c5e'::uuid, NULL, 'ККИ', 'tcg', 'Pokemon, One Piece, Yu-Gi-Oh', 'https://static.zenmarket.jp/images/common-landing-pages/a1w1bj2f.dob',
  2, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '338f17b6-29ae-4dba-a816-e2baaba2f439'::uuid, '96cd1b9f-3d28-4d84-adde-022e3a7f8c5e'::uuid, 'Pokemon', 'pokemon', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/a1w1bj2f.dob',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'b28f205c-8d53-43bd-b683-f2c6e20b841d'::uuid, '96cd1b9f-3d28-4d84-adde-022e3a7f8c5e'::uuid, 'Yu-Gi-Oh', 'yu-gi-oh', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/ssicxmhi.gao',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '33771894-559c-4c0e-9a71-955451524421'::uuid, '96cd1b9f-3d28-4d84-adde-022e3a7f8c5e'::uuid, 'Dragon Ball', 'dragon-ball', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/yclrozvb.3cs',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'f49f1a55-4e3d-47f1-b802-02dd6734f601'::uuid, '96cd1b9f-3d28-4d84-adde-022e3a7f8c5e'::uuid, 'One Piece', 'one-piece', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/edjeonan.lc2',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '0e45d1b0-65fb-4a6f-8856-e08ebb72c331'::uuid, '96cd1b9f-3d28-4d84-adde-022e3a7f8c5e'::uuid, 'Kamen Rider', 'kamen-rider', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/5h1jmodp.hss',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '2beca354-0c22-4e20-a9f9-11ccfd7285ea'::uuid, '96cd1b9f-3d28-4d84-adde-022e3a7f8c5e'::uuid, 'Weiss Schwarz', 'weiss-schwarz', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/s31ueh2w.qqt',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'd55277b8-ffd5-4abf-8eb6-9e5d236ad8aa'::uuid, NULL, 'Одежда', 'clothing', 'Японские бренды', 'https://static.zenmarket.jp/images/misc/68b97d1e817449228714e72737459c2e/p1hps89dvil3doq91qfo5sl1ck8g.png',
  3, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '9091310e-9347-49fa-94ca-1affebcef127'::uuid, 'd55277b8-ffd5-4abf-8eb6-9e5d236ad8aa'::uuid, 'Кимоно', 'кимоно', NULL, 'https://static.zenmarket.jp/images/misc/68b97d1e817449228714e72737459c2e/p1hps89dvil3doq91qfo5sl1ck8g.png',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '6549ad4b-57ba-40ea-9bc1-c099ca9c6af0'::uuid, 'd55277b8-ffd5-4abf-8eb6-9e5d236ad8aa'::uuid, 'Платья', 'платья', NULL, 'https://static.zenmarket.jp/images/misc/70aa5c4944d149afbb7723e90b8399b1/p1hps88aig1sl114qu1f4ehs111qc8.png',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'a445e65f-a6fa-4225-962a-8dde636f9043'::uuid, 'd55277b8-ffd5-4abf-8eb6-9e5d236ad8aa'::uuid, 'Верх', 'верх', NULL, 'https://static.zenmarket.jp/images/misc/dfcc09f4bb5041caba06badee9b8e00d/p1hps88aig1l6j8nkjl110qlrat7.png',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'a1494e89-c5bb-40a4-9f48-b442fced3ed6'::uuid, 'd55277b8-ffd5-4abf-8eb6-9e5d236ad8aa'::uuid, 'Низ', 'низ', NULL, 'https://static.zenmarket.jp/images/misc/761d3d45f8b54ce3b5f0605a5c5bde45/p1hps88aig10nn91h1v9qtb1j9s6.png',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'df53b3db-0435-4aab-8bf7-2d7bd6d70f0e'::uuid, 'd55277b8-ffd5-4abf-8eb6-9e5d236ad8aa'::uuid, 'Верхняя одежда', 'верхняя-одежда', NULL, 'https://static.zenmarket.jp/images/misc/9c3e6d8cfca94113912d5cbb0c6eca43/p1hps88aig180m1gv4peqtnfdpn5.png',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'fd7afdde-c0ff-48e4-a745-52d6ea76bb19'::uuid, 'd55277b8-ffd5-4abf-8eb6-9e5d236ad8aa'::uuid, 'Костюмы', 'костюмы', NULL, 'https://static.zenmarket.jp/images/misc/e138cc9ae4934ec092076ec489b74bf9/p1hps88aif12ur1utf120u1l18aq94.png',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '2e0629c6-777f-4145-aa36-1fe488e7dbbe'::uuid, NULL, 'Сумки', 'bags', 'Luxury & Vintage', 'https://static.zenmarket.jp/images/common-landing-pages/xfpgrn4u.jz2',
  4, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'adaef9e8-d71f-4603-b351-9094d58a8152'::uuid, '2e0629c6-777f-4145-aa36-1fe488e7dbbe'::uuid, 'Женские сумки', 'женские-сумки', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/xfpgrn4u.jz2',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '9d9ca089-53e1-4354-a7da-10d8c022a5c7'::uuid, '2e0629c6-777f-4145-aa36-1fe488e7dbbe'::uuid, 'Клатчи', 'клатчи', NULL, 'https://static.zenmarket.jp/images/misc/0352967a3b8e4cc1b0f8c34eca0b952e/p1hpsoujmmm98184ca5ovovjlr4.png',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '9e145341-7284-4328-8b3d-2ceafa256a7a'::uuid, '2e0629c6-777f-4145-aa36-1fe488e7dbbe'::uuid, 'Сумки на плечо', 'сумки-на-плечо', NULL, 'https://static.zenmarket.jp/images/misc/e1e23ffb5bf34959a297c5fca5ac6047/p1hpsoujmnesj15bj1fj5qr1rol5.png',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '535e1cd8-de0f-4ea0-b276-5ee3e66ae2a3'::uuid, '2e0629c6-777f-4145-aa36-1fe488e7dbbe'::uuid, 'Женские рюкзаки', 'женские-рюкзаки', NULL, 'https://static.zenmarket.jp/images/misc/f45f9369fce74c6fa9d19962dc978321/p1hpsoujmnadtqqauvb10m341o6.png',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '1f1fb6e0-3123-47e5-8cec-7900763dbae0'::uuid, '2e0629c6-777f-4145-aa36-1fe488e7dbbe'::uuid, 'Кросс-боди', 'кросс-боди', NULL, 'https://static.zenmarket.jp/images/misc/a0b0e19b36cc4f6c81d7f61c07422295/p1hpsoujmo14dg1460imn96116ir7.png',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '03d95c16-5646-41b4-92d4-2a1c6d9a3ff8'::uuid, '2e0629c6-777f-4145-aa36-1fe488e7dbbe'::uuid, 'Мужские рюкзаки', 'мужские-рюкзаки', NULL, 'https://static.zenmarket.jp/images/misc/567919774b6b400baf4d7303391a3045/p1hpup4vsd1sib12vf1vn012iq15id4.png',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'e3c79d90-9d55-4b7f-a56b-f19507f06b37'::uuid, NULL, 'Электроника', 'electronics', 'Sony, Panasonic, Nintendo', 'https://static.zenmarket.jp/images/common-landing-pages/2w2225qn.twv',
  5, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '073b61e0-6570-444a-ad31-6a1c9bb483c7'::uuid, 'e3c79d90-9d55-4b7f-a56b-f19507f06b37'::uuid, 'Гитары', 'гитары', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/noootdcm.esx',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'df665d34-52f9-47d8-b541-58a9aaf833e8'::uuid, 'e3c79d90-9d55-4b7f-a56b-f19507f06b37'::uuid, 'Бас-гитары', 'бас-гитары', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/cvsyfq5q.txu',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '277c1595-ebe1-4d4a-a386-a0ef8fba1822'::uuid, 'e3c79d90-9d55-4b7f-a56b-f19507f06b37'::uuid, 'Клавишные, синтезаторы', 'клавишные-синтезаторы', NULL, 'https://static.zenmarket.jp/images/misc/9607d5ee8bcb4b35a0e48838847d342d/p1hpsu54b91hsh16m41ss1qm68us1g.png',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '88d41e46-5867-4237-a6a8-5a0a765ee04a'::uuid, 'e3c79d90-9d55-4b7f-a56b-f19507f06b37'::uuid, 'Струнные', 'струнные', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/4wn3bz1t.wpl',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '8699b0b2-b563-4757-ab30-1e3fa4df1203'::uuid, 'e3c79d90-9d55-4b7f-a56b-f19507f06b37'::uuid, 'Духовые', 'духовые', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/dfgbnaan.plm',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'f922c888-3bb9-4bc2-90f9-2f9e1c620bc5'::uuid, 'e3c79d90-9d55-4b7f-a56b-f19507f06b37'::uuid, 'DJ-оборудование', 'dj-оборудование', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/2w2225qn.twv',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'f3c78bba-1e56-4d10-8b07-13ec69af674a'::uuid, NULL, 'Рыболовные снасти', 'fishing', 'Снасти и экипировка', 'https://static.zenmarket.jp/images/common-landing-pages/hyuw1ivd.3wq',
  6, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '096c1b9c-751c-44a7-80ce-8a494cef6462'::uuid, 'f3c78bba-1e56-4d10-8b07-13ec69af674a'::uuid, 'Гольф', 'гольф', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/5nfv225i.hmn',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'ae3c8926-8e6a-4b32-9a13-79536ad5721f'::uuid, 'f3c78bba-1e56-4d10-8b07-13ec69af674a'::uuid, 'Рыбалка', 'рыбалка', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/hyuw1ivd.3wq',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '37c5d7a2-7776-4f75-b250-d6977325b0bc'::uuid, 'f3c78bba-1e56-4d10-8b07-13ec69af674a'::uuid, 'Бейсбол', 'бейсбол', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/00h1g4r4.k53',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '9c056a55-8c1c-4cb7-8c21-ecb1b6a8feb4'::uuid, 'f3c78bba-1e56-4d10-8b07-13ec69af674a'::uuid, 'Футбол', 'футбол', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/musey4tj.jko',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '04ab7c93-a061-4e7e-bc01-20ebfa34bcb1'::uuid, 'f3c78bba-1e56-4d10-8b07-13ec69af674a'::uuid, 'Кемпинг', 'кемпинг', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/fc224l0d.bsz',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '18b92f27-ef8f-4cca-aae6-2b9fa0354872'::uuid, 'f3c78bba-1e56-4d10-8b07-13ec69af674a'::uuid, 'Походы', 'походы', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/xncuve42.mgb',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '2ed49af2-ccbc-4f87-b37f-2e4104862df1'::uuid, NULL, 'Интерьер и канцелярия', 'stationery', 'Дом и бумага', 'https://static.zenmarket.jp/images/misc/f6c6cb508ddb40bda9aebf81f3baa944/p1hr8dgot11nqc17ns2el1pplfcl5.png',
  7, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'b34d9f22-095e-4c2a-b71a-a1d979da5119'::uuid, '2ed49af2-ccbc-4f87-b37f-2e4104862df1'::uuid, 'Ручки', 'ручки', NULL, 'https://static.zenmarket.jp/images/misc/2a9fa1b180f242a89e9b4cf5b723adb4/p1hr8dgot1mul1tqehta1f0u1slf7.png',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '533c789c-9518-4c8d-8dba-237a9a459e94'::uuid, '2ed49af2-ccbc-4f87-b37f-2e4104862df1'::uuid, 'Блокноты, бумага', 'блокноты-бумага', NULL, 'https://static.zenmarket.jp/images/misc/f6c6cb508ddb40bda9aebf81f3baa944/p1hr8dgot11nqc17ns2el1pplfcl5.png',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'aea8d5c8-dbd1-4ebe-b5ee-6c1cf9faeff7'::uuid, '2ed49af2-ccbc-4f87-b37f-2e4104862df1'::uuid, 'Каллиграфия', 'каллиграфия', NULL, 'https://static.zenmarket.jp/images/misc/27cf76646a4b4524a987139dc7123070/p1hr8d5or4hh08ao1556ot15r34.png',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '25d8b462-aac1-4e85-81e7-d03384150eb7'::uuid, '2ed49af2-ccbc-4f87-b37f-2e4104862df1'::uuid, 'Другое', 'другое', NULL, 'https://static.zenmarket.jp/images/misc/23ebe868ffb7436799e56e129a7bc735/p1hr8dgot11vh1egdc4o1tid1ilq6.png',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'cade47bf-d7cc-4794-beb6-bc7ca8041036'::uuid, NULL, 'Чай матча', 'matcha', 'Порошок и чай', NULL,
  8, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'b14b56b7-dce8-4aab-ab17-eed9862ac00a'::uuid, 'cade47bf-d7cc-4794-beb6-bc7ca8041036'::uuid, 'БАДы', 'бады', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/323axv11.1qt',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '60ff5574-b65b-4be0-bb1d-5a198055d8d8'::uuid, 'cade47bf-d7cc-4794-beb6-bc7ca8041036'::uuid, 'Уход за глазами', 'уход-за-глазами', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/q00sowdr.u4q',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '43e0a814-7b5f-4a73-9702-a45b1c3bf239'::uuid, 'cade47bf-d7cc-4794-beb6-bc7ca8041036'::uuid, 'Уход за кожей', 'уход-за-кожей', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/zeec1wic.brs',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'e6766274-05c7-456f-9917-33716c5ac996'::uuid, 'cade47bf-d7cc-4794-beb6-bc7ca8041036'::uuid, 'Уход за волосами', 'уход-за-волосами', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/xkh00udc.4ak',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '4ab51d79-ea4a-4e1a-9e49-c39c57e89cba'::uuid, 'cade47bf-d7cc-4794-beb6-bc7ca8041036'::uuid, 'Уход за телом', 'уход-за-телом', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/mktfg4yq.4jg',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'b04a9cde-129c-4717-8010-1637a5caf365'::uuid, 'cade47bf-d7cc-4794-beb6-bc7ca8041036'::uuid, 'Бьюти-устройства', 'бьюти-устройства', NULL, 'https://static.zenmarket.jp/images/misc/b6b0b07569a04e23afd7f91858081305/p1hpsu0cum1vqoe1s19b211uk1bl7s.png',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '0e858555-b937-4733-9db7-6733a6319875'::uuid, NULL, 'Ретро-консоли', 'retro-consoles', 'Классика игр', NULL,
  9, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '33a72c84-1f40-42eb-8380-3e566746aa65'::uuid, '0e858555-b937-4733-9db7-6733a6319875'::uuid, 'Гитары', 'гитары', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/noootdcm.esx',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'b6fd28e3-b456-49b2-ad6c-736fac0cb9c5'::uuid, '0e858555-b937-4733-9db7-6733a6319875'::uuid, 'Бас-гитары', 'бас-гитары', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/cvsyfq5q.txu',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'ba43e286-0f71-4e1d-a04b-871812e2d4bd'::uuid, '0e858555-b937-4733-9db7-6733a6319875'::uuid, 'Клавишные, синтезаторы', 'клавишные-синтезаторы', NULL, 'https://static.zenmarket.jp/images/misc/9607d5ee8bcb4b35a0e48838847d342d/p1hpsu54b91hsh16m41ss1qm68us1g.png',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '5176df62-e3f9-45be-b090-31b7483f7d5b'::uuid, '0e858555-b937-4733-9db7-6733a6319875'::uuid, 'Струнные', 'струнные', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/4wn3bz1t.wpl',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '0b57f97e-5eab-42f1-b973-09de4bff718d'::uuid, '0e858555-b937-4733-9db7-6733a6319875'::uuid, 'Духовые', 'духовые', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/dfgbnaan.plm',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'b501e60c-fadf-4e54-aaf4-dd349e816936'::uuid, '0e858555-b937-4733-9db7-6733a6319875'::uuid, 'DJ-оборудование', 'dj-оборудование', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/2w2225qn.twv',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '2498f859-6110-4ea4-b83b-f0cb25978558'::uuid, NULL, 'Манга и книги', 'books', 'Манга, новеллы, журналы', 'https://static.zenmarket.jp/images/common-landing-pages/ba5o0wae.4hs',
  10, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '2c387d32-2601-4d17-bfc8-1eb20b139b74'::uuid, '2498f859-6110-4ea4-b83b-f0cb25978558'::uuid, 'Книги', 'книги', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/hpm5hsh2.wsf',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '58c2dce0-cc85-4b8a-bbc8-a11ab56b786f'::uuid, '2498f859-6110-4ea4-b83b-f0cb25978558'::uuid, 'Манга', 'манга', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/ba5o0wae.4hs',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '14d24d7c-b7be-4381-8494-4e1eb7f09a28'::uuid, '2498f859-6110-4ea4-b83b-f0cb25978558'::uuid, 'Лайт-новеллы', 'лайт-новеллы', NULL, 'https://static.zenmarket.jp/images/misc/3ecd473154484af29581e7e41abdd5a5/p1hpup8fof1eiu55qtmv13sdqk36.png',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '8f8d4901-3522-401a-9e61-f6d9d4135d66'::uuid, '2498f859-6110-4ea4-b83b-f0cb25978558'::uuid, 'Журналы', 'журналы', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/k2yvugsn.qkg',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '5687ffcf-0df7-4618-a68e-10b592f49dfa'::uuid, '2498f859-6110-4ea4-b83b-f0cb25978558'::uuid, 'Иллюстрированные книги', 'иллюстрированные-книги', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/3ay41wty.0np',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '8ab8c23f-4841-4de2-be79-716809444003'::uuid, '2498f859-6110-4ea4-b83b-f0cb25978558'::uuid, 'Slash / BL', 'slash-bl', NULL, 'https://static.zenmarket.jp/images/misc/1c171dd425c04c929f29c66ae6cae9d7/p1hrlce9qidkt1jda1gqv1fiv56ha.png',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '2ea861ea-0fa0-492d-8636-605aceded471'::uuid, NULL, 'Пластинки', 'vinyl', 'LP и винил', NULL,
  11, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '8c888dee-bb9b-4d40-b90e-c225b5d202e0'::uuid, '2ea861ea-0fa0-492d-8636-605aceded471'::uuid, 'Гитары', 'гитары', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/noootdcm.esx',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '0a386aa9-6579-4f79-9b97-7f81a6e9911e'::uuid, '2ea861ea-0fa0-492d-8636-605aceded471'::uuid, 'Бас-гитары', 'бас-гитары', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/cvsyfq5q.txu',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'db87ab1f-6b7f-4806-94b3-5faa6f6e6232'::uuid, '2ea861ea-0fa0-492d-8636-605aceded471'::uuid, 'Клавишные, синтезаторы', 'клавишные-синтезаторы', NULL, 'https://static.zenmarket.jp/images/misc/9607d5ee8bcb4b35a0e48838847d342d/p1hpsu54b91hsh16m41ss1qm68us1g.png',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '4613e0fd-73e5-4f08-ac5e-2446742bbbc2'::uuid, '2ea861ea-0fa0-492d-8636-605aceded471'::uuid, 'Струнные', 'струнные', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/4wn3bz1t.wpl',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '88cdd2eb-90d7-459c-a950-1e3ca4cc52ad'::uuid, '2ea861ea-0fa0-492d-8636-605aceded471'::uuid, 'Духовые', 'духовые', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/dfgbnaan.plm',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'b15264f9-c10d-4938-9a0e-d2da35fadb78'::uuid, '2ea861ea-0fa0-492d-8636-605aceded471'::uuid, 'DJ-оборудование', 'dj-оборудование', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/2w2225qn.twv',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '94b91f1f-33e1-4d1d-a0eb-1865375fbf38'::uuid, NULL, 'Часы', 'watches', 'Seiko, Orient, Casio', 'https://static.zenmarket.jp/images/misc/f6beb9e93e1248aaa55695fa600283d5/p1hpsu3j9nsdfu1uhkvaac6v912.png',
  12, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'f18a71a4-25e9-4a00-b093-e7fb07fa6c19'::uuid, '94b91f1f-33e1-4d1d-a0eb-1865375fbf38'::uuid, 'Seiko', 'seiko', NULL, 'https://static.zenmarket.jp/images/misc/f6beb9e93e1248aaa55695fa600283d5/p1hpsu3j9nsdfu1uhkvaac6v912.png',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'cc315736-5122-4993-9fcc-b0e8138ee727'::uuid, '94b91f1f-33e1-4d1d-a0eb-1865375fbf38'::uuid, 'Orient', 'orient', NULL, 'https://static.zenmarket.jp/images/misc/2a96f87fc5e84d67882ec0d8fe6a123c/p1hpsu3j9p1lu7v4v1nrcom9g13.png',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '9d3bab61-68d3-42a1-8c9a-cec16b5e2bbc'::uuid, '94b91f1f-33e1-4d1d-a0eb-1865375fbf38'::uuid, 'Casio', 'casio', NULL, 'https://static.zenmarket.jp/images/misc/4edacc375e904a50930a8aaa247e5220/p1hpsu3j9qeod1avdv61sp8m0214.png',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'fb0c9cdb-44ca-44ef-a2c6-6d88552eea8c'::uuid, '94b91f1f-33e1-4d1d-a0eb-1865375fbf38'::uuid, 'Minase', 'minase', NULL, 'https://static.zenmarket.jp/images/misc/c99ffd980b004fdc96cd2055249a0dde/p1hpsu3j9qiba1pg6r2ahvi2th15.png',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '17800b46-dabd-4e3d-bb8b-efa5cefda6ef'::uuid, '94b91f1f-33e1-4d1d-a0eb-1865375fbf38'::uuid, 'Knot', 'knot', NULL, 'https://static.zenmarket.jp/images/misc/9eaa93aaa7644e44a642ee3dda11f958/p1hpsu3j9q2gp1e4rd9q135rc16.png',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '9e4dfea2-c753-4dcd-bfc7-5047cbae0dc0'::uuid, '94b91f1f-33e1-4d1d-a0eb-1865375fbf38'::uuid, 'Citizen', 'citizen', NULL, 'https://static.zenmarket.jp/images/misc/92c384d58d7d4f8b905ab9734f04454a/p1hpsu4bus1fovmvbomrfpm1lct1e.png',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '3d15b0b3-1d12-4294-95ce-0c7ab7eca734'::uuid, NULL, 'Косметика и уход', 'beauty', 'Кожа, волосы, тело', 'https://static.zenmarket.jp/images/common-landing-pages/zeec1wic.brs',
  13, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '21eabd58-6f65-4be8-acfe-bd5ae82c39bb'::uuid, '3d15b0b3-1d12-4294-95ce-0c7ab7eca734'::uuid, 'БАДы', 'бады', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/323axv11.1qt',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '607bf66d-704d-4343-ab00-9bedf6deb216'::uuid, '3d15b0b3-1d12-4294-95ce-0c7ab7eca734'::uuid, 'Уход за глазами', 'уход-за-глазами', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/q00sowdr.u4q',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '38d5d73e-18bb-4bb8-9f62-a0bc54006693'::uuid, '3d15b0b3-1d12-4294-95ce-0c7ab7eca734'::uuid, 'Уход за кожей', 'уход-за-кожей', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/zeec1wic.brs',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'b1b32c18-2542-44cc-960d-8da8177fdf7f'::uuid, '3d15b0b3-1d12-4294-95ce-0c7ab7eca734'::uuid, 'Уход за волосами', 'уход-за-волосами', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/xkh00udc.4ak',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '5a1f4674-431a-4da0-a7a4-b4aad77019fd'::uuid, '3d15b0b3-1d12-4294-95ce-0c7ab7eca734'::uuid, 'Уход за телом', 'уход-за-телом', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/mktfg4yq.4jg',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '3a199cd0-3d5c-4cb9-9eb8-801f971c79b7'::uuid, '3d15b0b3-1d12-4294-95ce-0c7ab7eca734'::uuid, 'Бьюти-устройства', 'бьюти-устройства', NULL, 'https://static.zenmarket.jp/images/misc/b6b0b07569a04e23afd7f91858081305/p1hpsu0cum1vqoe1s19b211uk1bl7s.png',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '26809ea3-8acd-4061-9b52-36efbe91df3b'::uuid, NULL, 'БАДы и добавки', 'supplements', 'Красота и здоровье', 'https://static.zenmarket.jp/images/common-landing-pages/323axv11.1qt',
  14, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '80ad2495-827c-4716-95dd-7ba21b11249e'::uuid, '26809ea3-8acd-4061-9b52-36efbe91df3b'::uuid, 'БАДы', 'бады', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/323axv11.1qt',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '0e05731a-0779-4afa-bf69-d1c7ab657770'::uuid, '26809ea3-8acd-4061-9b52-36efbe91df3b'::uuid, 'Уход за глазами', 'уход-за-глазами', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/q00sowdr.u4q',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'd62adf0e-6702-48bc-9b2f-faa8e62d4054'::uuid, '26809ea3-8acd-4061-9b52-36efbe91df3b'::uuid, 'Уход за кожей', 'уход-за-кожей', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/zeec1wic.brs',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'f2224676-631f-4795-990d-10b4128b2425'::uuid, '26809ea3-8acd-4061-9b52-36efbe91df3b'::uuid, 'Уход за волосами', 'уход-за-волосами', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/xkh00udc.4ak',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '7df20c81-455c-4e5f-b3c1-5d8ef9dc12a7'::uuid, '26809ea3-8acd-4061-9b52-36efbe91df3b'::uuid, 'Уход за телом', 'уход-за-телом', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/mktfg4yq.4jg',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'ff98d9d1-def9-4c76-bf6b-36a9e761cf97'::uuid, '26809ea3-8acd-4061-9b52-36efbe91df3b'::uuid, 'Бьюти-устройства', 'бьюти-устройства', NULL, 'https://static.zenmarket.jp/images/misc/b6b0b07569a04e23afd7f91858081305/p1hpsu0cum1vqoe1s19b211uk1bl7s.png',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'b4b00cb9-90de-4a9c-ad8a-8fbc72a7506e'::uuid, NULL, 'Инструменты', 'instruments', 'Гитары, клавиши, DJ', 'https://static.zenmarket.jp/images/common-landing-pages/noootdcm.esx',
  15, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '6bedaa99-0970-4aa6-a9a9-28825f42e4c1'::uuid, 'b4b00cb9-90de-4a9c-ad8a-8fbc72a7506e'::uuid, 'Гитары', 'гитары', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/noootdcm.esx',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'd441b103-cdd8-4b3c-9541-415e46e78894'::uuid, 'b4b00cb9-90de-4a9c-ad8a-8fbc72a7506e'::uuid, 'Бас-гитары', 'бас-гитары', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/cvsyfq5q.txu',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '3db13e70-78c9-48ce-8d78-2690cca711e5'::uuid, 'b4b00cb9-90de-4a9c-ad8a-8fbc72a7506e'::uuid, 'Клавишные, синтезаторы', 'клавишные-синтезаторы', NULL, 'https://static.zenmarket.jp/images/misc/9607d5ee8bcb4b35a0e48838847d342d/p1hpsu54b91hsh16m41ss1qm68us1g.png',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '1401e63e-7412-4e8f-ab6d-bc47964251ca'::uuid, 'b4b00cb9-90de-4a9c-ad8a-8fbc72a7506e'::uuid, 'Струнные', 'струнные', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/4wn3bz1t.wpl',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '97bad737-b0a4-44cc-9b60-b3af5e63e6a9'::uuid, 'b4b00cb9-90de-4a9c-ad8a-8fbc72a7506e'::uuid, 'Духовые', 'духовые', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/dfgbnaan.plm',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'f9aff03f-209e-4ecf-adc8-690cfd21a310'::uuid, 'b4b00cb9-90de-4a9c-ad8a-8fbc72a7506e'::uuid, 'DJ-оборудование', 'dj-оборудование', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/2w2225qn.twv',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '6d7e3834-5f76-47aa-9004-902f3dba6f14'::uuid, NULL, 'Камеры', 'cameras', 'Фото и оптика', NULL,
  16, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'ff2b13f6-64ef-42a8-bfed-1aa17ad270ec'::uuid, '6d7e3834-5f76-47aa-9004-902f3dba6f14'::uuid, 'Гитары', 'гитары', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/noootdcm.esx',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'f562e06a-0100-4da9-aee1-328d64e22fd9'::uuid, '6d7e3834-5f76-47aa-9004-902f3dba6f14'::uuid, 'Бас-гитары', 'бас-гитары', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/cvsyfq5q.txu',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '67f1229d-2a49-4b15-852f-4597cf5fe511'::uuid, '6d7e3834-5f76-47aa-9004-902f3dba6f14'::uuid, 'Клавишные, синтезаторы', 'клавишные-синтезаторы', NULL, 'https://static.zenmarket.jp/images/misc/9607d5ee8bcb4b35a0e48838847d342d/p1hpsu54b91hsh16m41ss1qm68us1g.png',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '768e13e1-35a0-4da5-a1ac-8eafcefc4443'::uuid, '6d7e3834-5f76-47aa-9004-902f3dba6f14'::uuid, 'Струнные', 'струнные', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/4wn3bz1t.wpl',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'eb68301f-4807-4c89-93f8-1dad7fa5d117'::uuid, '6d7e3834-5f76-47aa-9004-902f3dba6f14'::uuid, 'Духовые', 'духовые', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/dfgbnaan.plm',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'adc59f1c-04f4-4812-8cbf-ad81f45d26f1'::uuid, '6d7e3834-5f76-47aa-9004-902f3dba6f14'::uuid, 'DJ-оборудование', 'dj-оборудование', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/2w2225qn.twv',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'b056fed3-fc37-45eb-9d79-b145937538b8'::uuid, NULL, 'Снеки и сладости', 'snacks', 'KitKat и сладости', NULL,
  17, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'b63f6277-f045-40bf-9007-0e6e66e2b4df'::uuid, 'b056fed3-fc37-45eb-9d79-b145937538b8'::uuid, 'БАДы', 'бады', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/323axv11.1qt',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'ff7157b0-dbe4-43b6-a190-f9a5dc8a39fe'::uuid, 'b056fed3-fc37-45eb-9d79-b145937538b8'::uuid, 'Уход за глазами', 'уход-за-глазами', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/q00sowdr.u4q',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '93566196-5a56-43ef-ad3f-f7fdb4269aff'::uuid, 'b056fed3-fc37-45eb-9d79-b145937538b8'::uuid, 'Уход за кожей', 'уход-за-кожей', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/zeec1wic.brs',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '0628e55a-c5db-477e-aec3-e64119ba00d4'::uuid, 'b056fed3-fc37-45eb-9d79-b145937538b8'::uuid, 'Уход за волосами', 'уход-за-волосами', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/xkh00udc.4ak',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '0978778d-0bba-4c4a-8a29-7e57372b5778'::uuid, 'b056fed3-fc37-45eb-9d79-b145937538b8'::uuid, 'Уход за телом', 'уход-за-телом', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/mktfg4yq.4jg',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '2190fd37-1e97-49a4-85bf-613d858faee3'::uuid, 'b056fed3-fc37-45eb-9d79-b145937538b8'::uuid, 'Бьюти-устройства', 'бьюти-устройства', NULL, 'https://static.zenmarket.jp/images/misc/b6b0b07569a04e23afd7f91858081305/p1hpsu0cum1vqoe1s19b211uk1bl7s.png',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'b29affad-980c-428c-8992-dd468f0cf655'::uuid, NULL, 'Игры', 'games', 'PC и консоли', NULL,
  18, TRUE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '1e72cc31-0bb9-469d-a68d-d99987a428be'::uuid, 'b29affad-980c-428c-8992-dd468f0cf655'::uuid, 'Pokemon', 'pokemon', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/a1w1bj2f.dob',
  1, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '45823054-9d1d-460a-8d95-3e24fb5182fb'::uuid, 'b29affad-980c-428c-8992-dd468f0cf655'::uuid, 'Yu-Gi-Oh', 'yu-gi-oh', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/ssicxmhi.gao',
  2, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '58579c69-cf75-4ef6-9680-be0ff400f9ed'::uuid, 'b29affad-980c-428c-8992-dd468f0cf655'::uuid, 'Dragon Ball', 'dragon-ball', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/yclrozvb.3cs',
  3, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'a890bc2f-b273-4e2c-b06c-128aefb0183c'::uuid, 'b29affad-980c-428c-8992-dd468f0cf655'::uuid, 'One Piece', 'one-piece', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/edjeonan.lc2',
  4, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  'c940f060-fd30-49b4-aa83-7618ac68536b'::uuid, 'b29affad-980c-428c-8992-dd468f0cf655'::uuid, 'Kamen Rider', 'kamen-rider', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/5h1jmodp.hss',
  5, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
INSERT INTO categories (
  "Id","ParentId","Name","Slug","Description","ImageUrl","SortOrder","IsPopular","IsActive","CreatedAt","UpdatedAt","IsDeleted","DeletedAt"
) VALUES (
  '3f19ec4e-c7d9-4c29-9610-3b2057acfd31'::uuid, 'b29affad-980c-428c-8992-dd468f0cf655'::uuid, 'Weiss Schwarz', 'weiss-schwarz', NULL, 'https://static.zenmarket.jp/images/common-landing-pages/s31ueh2w.qqt',
  6, FALSE, TRUE, '2026-08-05T22:51:58.727Z'::timestamptz, NULL, FALSE, NULL
);
SELECT c."Name" AS root, COUNT(ch."Id") AS children FROM categories c LEFT JOIN categories ch ON ch."ParentId" = c."Id" WHERE c."ParentId" IS NULL AND c."IsDeleted" = false GROUP BY c."Id", c."Name", c."SortOrder" ORDER BY c."SortOrder";
COMMIT;