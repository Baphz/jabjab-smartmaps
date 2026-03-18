CREATE TABLE "AppSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "appName" TEXT,
  "shortName" TEXT,
  "logoUrl" TEXT,
  "logoAlt" TEXT,
  "faviconUrl" TEXT,
  "regionLabel" TEXT,
  "organizationName" TEXT,
  "footerTagline" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
