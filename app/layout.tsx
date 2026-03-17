import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ClerkProvider } from "@clerk/nextjs";
import { App as AntdApp, ConfigProvider } from "antd";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { siteContent } from "@/lib/site-content";
import "antd/dist/reset.css";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: siteContent.metadata.title,
  description: siteContent.metadata.description,
};

const antdTheme = {
  token: {
    colorPrimary: "#2563eb",
    colorInfo: "#2563eb",
    colorSuccess: "#16a34a",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    colorBgBase: "#f5f8fb",
    colorBgLayout: "#eef4f7",
    colorBgContainer: "#f8fbff",
    colorFillAlter: "#edf5ff",
    colorTextBase: "#0f172a",
    colorBorderSecondary: "#d9e1e8",
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
    Table: {
      borderColor: "#d9e1e8",
      headerBg: "#f7f8fa",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || null;

  const appContent = (
    <AntdRegistry>
      <ConfigProvider theme={antdTheme} componentSize="small">
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  );

  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body>
        {clerkPublishableKey ? (
          <ClerkProvider
            publishableKey={clerkPublishableKey}
            afterSignOutUrl="/login"
          >
            {appContent}
          </ClerkProvider>
        ) : (
          appContent
        )}
      </body>
    </html>
  );
}
