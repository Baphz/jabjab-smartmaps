"use client";

import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useAppTheme } from "@/components/theme/AppThemeProvider";

type ThemeModeToggleProps = {
  size?: "small" | "middle" | "large";
  shape?: "circle" | "round" | "default";
};

export default function ThemeModeToggle({
  size = "small",
  shape = "circle",
}: ThemeModeToggleProps) {
  const { mode, toggleMode } = useAppTheme();

  return (
    <Tooltip title={mode === "dark" ? "Mode terang" : "Mode gelap"}>
      <Button
        size={size}
        shape={shape}
        icon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
        onClick={toggleMode}
      />
    </Tooltip>
  );
}
