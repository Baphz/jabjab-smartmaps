import "server-only";

import { extractSupabaseStorageObjectPath } from "@/lib/drive-file";
import {
  deleteSupabaseStorageObject,
  isSupabaseStorageConfigured,
} from "@/lib/supabase-storage";
import { prisma } from "@/lib/prisma";

export function collectLabStorageObjectPaths(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => extractSupabaseStorageObjectPath(value))
        .filter((value): value is string => Boolean(value))
    )
  );
}

async function isStorageObjectStillReferenced(objectPath: string) {
  const found = await prisma.lab.findFirst({
    where: {
      OR: [
        { labPhotoUrl: { contains: objectPath } },
        { head1PhotoUrl: { contains: objectPath } },
        { head2PhotoUrl: { contains: objectPath } },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(found);
}

export async function cleanupUnusedLabStorageFiles(objectPaths: string[]) {
  if (!isSupabaseStorageConfigured()) {
    return;
  }

  for (const objectPath of objectPaths) {
    const stillReferenced = await isStorageObjectStillReferenced(objectPath);

    if (stillReferenced) {
      continue;
    }

    try {
      await deleteSupabaseStorageObject(objectPath);
    } catch (error) {
      console.warn("Gagal menghapus file Supabase Storage yang tidak terpakai:", {
        objectPath,
        error,
      });
    }
  }
}
