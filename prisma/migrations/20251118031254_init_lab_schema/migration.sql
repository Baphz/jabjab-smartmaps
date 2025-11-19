-- CreateTable
CREATE TABLE "LabType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "LabType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lab" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "labPhotoUrl" TEXT NOT NULL,
    "head1Name" TEXT,
    "head1PhotoUrl" TEXT,
    "head2Name" TEXT,
    "head2PhotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LabToLabType" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LabToLabType_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabType_name_key" ON "LabType"("name");

-- CreateIndex
CREATE INDEX "_LabToLabType_B_index" ON "_LabToLabType"("B");

-- AddForeignKey
ALTER TABLE "_LabToLabType" ADD CONSTRAINT "_LabToLabType_A_fkey" FOREIGN KEY ("A") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LabToLabType" ADD CONSTRAINT "_LabToLabType_B_fkey" FOREIGN KEY ("B") REFERENCES "LabType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
