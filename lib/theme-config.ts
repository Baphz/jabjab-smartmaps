import { theme, type ThemeConfig } from "antd";

export type AppThemeMode = "light" | "dark";

const sharedTheme: ThemeConfig = {
  token: {
    colorPrimary: "#2f6fed",
    colorInfo: "#2f6fed",
    colorSuccess: "#2fa67c",
    colorWarning: "#d9a441",
    colorError: "#d95c5c",
    borderRadius: 16,
    fontSize: 13,
    fontSizeLG: 15,
    fontSizeSM: 12,
    fontFamily: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
      colorBgBase: isDark ? "#0b1220" : "#f3f6fb",
      colorBgLayout: isDark ? "#0f1728" : "#edf3fa",
      colorBgContainer: isDark ? "#162136" : "#ffffff",
      colorFillAlter: isDark ? "#1b2740" : "#edf3fa",
      colorTextBase: isDark ? "#e6edf7" : "#0f172a",
      colorBorderSecondary: isDark ? "#33435d" : "#d8e1eb",
    },
    components: {
      ...sharedTheme.components,
      Table: {
        borderColor: isDark ? "#33435d" : "#d8e1eb",
        headerBg: isDark ? "#1b2740" : "#f7f9fc",
      },
    },
  };
}
