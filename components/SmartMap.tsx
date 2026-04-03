"use client";

import { Spin } from "antd";
import dynamic from "next/dynamic";
import { siteContent } from "@/lib/site-content";
import type { SmartMapInnerProps } from "./SmartMapInner";

const SmartMapInner = dynamic(() => import("./SmartMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-50">
      <Spin description={siteContent.publicHome.map.loadingLabel} size="large" />
    </div>
  ),
});

export type { LabTypeDTO, LabWithTypes, MapLayerFilter } from "./SmartMapInner";

export default function SmartMap(props: SmartMapInnerProps) {
  return (
    <div className="h-full w-full">
      <SmartMapInner {...props} />
    </div>
  );
}
