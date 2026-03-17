import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { resolveLabRegionFromAddress } from "../lib/wilayah-indonesia.ts";

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

async function main() {
  const labs = await prisma.lab.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
    },
  });

  let mappedCount = 0;
  const unresolved: string[] = [];

  for (const lab of labs) {
    const resolved = await resolveLabRegionFromAddress(lab.address);

    await prisma.lab.update({
      where: { id: lab.id },
      data: {
        address: resolved.address,
        addressDetail: resolved.addressDetail,
        provinceId: resolved.provinceId,
        provinceName: resolved.provinceName,
        cityId: resolved.cityId,
        cityName: resolved.cityName,
        cityType: resolved.cityType,
        districtId: resolved.districtId,
        districtName: resolved.districtName,
        villageId: resolved.villageId,
        villageName: resolved.villageName,
        villageType: resolved.villageType,
      },
    });

    if (resolved.provinceId || resolved.cityId || resolved.districtId) {
      mappedCount += 1;
    } else {
      unresolved.push(`${lab.name} :: ${lab.address}`);
    }

    console.log(
      `[mapped] ${lab.name} -> ${resolved.provinceName ?? "-"} / ${resolved.cityName ?? "-"} / ${resolved.districtName ?? "-"} / ${resolved.villageName ?? "-"}`
    );
  }

  console.log("");
  console.log(
    JSON.stringify(
      {
        total: labs.length,
        mappedCount,
        unresolvedCount: unresolved.length,
        unresolved,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
