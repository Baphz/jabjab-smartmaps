// components/SmartMap.tsx
"use client";

import dynamic from "next/dynamic";
import type { SmartMapInnerProps } from "./SmartMapInner";

// SmartMapInner hanya dijalankan di client
const SmartMapInner = dynamic(() => import("./SmartMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-slate-200">
      Memuat peta...
    </div>
  ),
});

export type { LabTypeDTO, LabWithTypes } from "./SmartMapInner";

export default function SmartMap(props: SmartMapInnerProps) {
  return (
    <div className="h-full w-full">
      <SmartMapInner {...props} />
    </div>
  );
}
