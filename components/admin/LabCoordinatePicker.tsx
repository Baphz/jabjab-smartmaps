"use client";

import { Spin } from "antd";
import dynamic from "next/dynamic";

type LabCoordinatePickerProps = {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
  title?: string;
  helperText?: string;
  resetLabel?: string;
  height?: number;
  showOverlay?: boolean;
  showCoordinateBadge?: boolean;
};

const LabCoordinatePickerInner = dynamic(
  () => import("./LabCoordinatePickerInner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] w-full items-center justify-center rounded-[18px] bg-slate-50">
        <Spin description="Memuat peta koordinat..." size="large" />
      </div>
    ),
  }
);

export default function LabCoordinatePicker(props: LabCoordinatePickerProps) {
  return (
    <div className="h-full w-full">
      <LabCoordinatePickerInner {...props} />
    </div>
  );
}
