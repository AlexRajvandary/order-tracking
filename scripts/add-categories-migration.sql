START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260805224733_AddCategories') THEN
    CREATE TABLE categories (
        "Id" uuid NOT NULL,
        "ParentId" uuid,
        "Name" character varying(200) NOT NULL,
        "Slug" character varying(200) NOT NULL,
        "Description" character varying(1000),
        "ImageUrl" character varying(2000),
        "SortOrder" integer NOT NULL,
        "IsPopular" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "UpdatedAt" timestamp with time zone,
        "IsDeleted" boolean NOT NULL,
        "DeletedAt" timestamp with time zone,
        CONSTRAINT "PK_categories" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_categories_categories_ParentId" FOREIGN KEY ("ParentId") REFERENCES categories ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260805224733_AddCategories') THEN
    CREATE INDEX "IX_categories_IsPopular" ON categories ("IsPopular") WHERE "IsDeleted" = false AND "IsPopular" = true;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260805224733_AddCategories') THEN
    CREATE INDEX "IX_categories_ParentId" ON categories ("ParentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260805224733_AddCategories') THEN
    CREATE UNIQUE INDEX "IX_categories_ParentId_Slug" ON categories ("ParentId", "Slug") WHERE "IsDeleted" = false;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260805224733_AddCategories') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260805224733_AddCategories', '10.0.9');
    END IF;
END $EF$;
COMMIT;

