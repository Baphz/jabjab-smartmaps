"use client";

import { SignIn } from "@clerk/nextjs";
import { Card, Space, Typography } from "antd";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ThemeModeToggle from "@/components/theme/ThemeModeToggle";
import type { AppBranding } from "@/lib/app-branding";
import { siteContent } from "@/lib/site-content";

const { Title: TypographyTitle } = Typography;

const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full max-w-none",
    card: "w-full max-w-none border-0 bg-transparent shadow-none",
    page: "mx-auto w-full max-w-[440px]",
    main: "mx-auto w-full max-w-[440px]",
    header: "hidden",
    form: "w-full",
    formField: "w-full",
    formFieldRow: "w-full",
    formFieldInput: "w-full",
    formButtonPrimary: "w-full",
    otpCodeFieldInput: "h-14 w-11 min-w-11 rounded-[14px]",
  },
};

export function LoginForm({ branding }: { branding: AppBranding }) {
  const searchParams = useSearchParams();

  const redirectUrl =
    searchParams.get("redirect_url") ??
    searchParams.get("callbackUrl") ??
    searchParams.get("from") ??
    "/admin";

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[520px] items-center">
        <Card
          variant="borderless"
          className="w-full overflow-visible rounded-[28px] border border-sky-200 bg-white shadow-[0_24px_54px_rgba(15,23,42,0.08)]"
          styles={{ body: { padding: 24 } }}
        >
          <Space orientation="vertical" size={20} style={{ width: "100%" }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="smartmaps-logo-frame"
                  style={{
                    position: "relative",
                    height: 60,
                    width: 60,
                    overflow: "hidden",
                    borderRadius: 18,
                  }}
                >
                  <Image
                    src={branding.logoUrl}
                    alt={branding.logoAlt}
                    fill
                    sizes="60px"
                    unoptimized
                    className="object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <TypographyTitle level={2} style={{ margin: 0 }}>
                    {siteContent.login.title}
                  </TypographyTitle>
                </div>
              </div>

              <ThemeModeToggle />
            </div>

            <div className="smartmaps-clerk">
              <SignIn
                appearance={clerkAppearance}
                routing="path"
                path="/login"
                fallbackRedirectUrl={redirectUrl}
                signUpUrl="/sign-up"
                withSignUp={false}
              />
            </div>

            <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/95 px-3.5 py-3 text-xs text-slate-500">
              <span>© {new Date().getFullYear()} {branding.appName}</span>
              <Link
                href="/"
                className="font-medium text-slate-600 transition hover:text-slate-900"
              >
                {siteContent.login.backToMapLabel}
              </Link>
            </div>
          </Space>
        </Card>
      </div>
    </main>
  );
}
