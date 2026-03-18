"use client";

import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useAppTheme } from "@/components/theme/AppThemeProvider";

type ThemeModeToggleProps = {
  size?: "small" | "middle" | "large";
  shape?: "circle" | "round" | "default";
  className?: string;
};

export default function ThemeModeToggle({
  size = "small",
  shape = "default",
  className,
}: ThemeModeToggleProps) {
  const { mode, toggleMode } = useAppTheme();

  return (
    <Tooltip title={mode === "dark" ? "Mode terang" : "Mode gelap"}>
      <Button
        size={size}
        shape={shape}
        className={["smartmaps-theme-toggle", className].filter(Boolean).join(" ")}
        icon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
        onClick={toggleMode}
      />
    </Tooltip>
  );
}
