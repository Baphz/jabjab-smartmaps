import { theme, type ThemeConfig } from "antd";

export type AppThemeMode = "light" | "dark";

const sharedTheme: ThemeConfig = {
  token: {
    colorPrimary: "#2563eb",
    colorInfo: "#2563eb",
    colorSuccess: "#16a34a",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    borderRadius: 16,
    fontSize: 13,
    fontSizeLG: 15,
    fontSizeSM: 12,
    fontFamily: "var(--font-plus-jakarta-sans), sans-serif",
    wireframe: false,
  },
  components: {
    Card: {
      borderRadiusLG: 20,
      headerHeight: 44,
      headerHeightSM: 40,
      headerFontSize: 15,
      headerFontSizeSM: 14,
      bodyPadding: 16,
      bodyPaddingSM: 12,
      headerPadding: 16,
      headerPaddingSM: 12,
    },
    Button: {
      borderRadius: 12,
      controlHeight: 36,
      controlHeightSM: 30,
      fontWeight: 600,
    },
    Input: {
      borderRadius: 12,
      controlHeight: 36,
      controlHeightSM: 30,
    },
    InputNumber: {
      borderRadius: 12,
      controlHeight: 36,
      controlHeightSM: 30,
    },
    Select: {
      borderRadius: 12,
      controlHeight: 36,
      controlHeightSM: 30,
    },
    Tag: {
      fontSize: 12,
      lineHeight: 1.2,
    },
  },
};

export function getAntdThemeConfig(mode: AppThemeMode): ThemeConfig {
  const isDark = mode === "dark";

  return {
    ...sharedTheme,
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      ...sharedTheme.token,
      colorBgBase: isDark ? "#08101d" : "#f5f8fb",
      colorBgLayout: isDark ? "#08101d" : "#eef4f7",
      colorBgContainer: isDark ? "#0f172a" : "#f8fbff",
      colorFillAlter: isDark ? "#162235" : "#edf5ff",
      colorTextBase: isDark ? "#e2e8f0" : "#0f172a",
      colorBorderSecondary: isDark ? "#243446" : "#d9e1e8",
    },
    components: {
      ...sharedTheme.components,
      Table: {
        borderColor: isDark ? "#243446" : "#d9e1e8",
        headerBg: isDark ? "#111c2f" : "#f7f8fa",
      },
    },
  };
}
