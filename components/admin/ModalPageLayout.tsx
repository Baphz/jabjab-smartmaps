"use client";

import { CloseOutlined } from "@ant-design/icons";
import { Button, Card, Space, Typography } from "antd";
import { ReactNode } from "react";
import { siteContent } from "@/lib/site-content";

const { Paragraph: TypographyParagraph, Title: TypographyTitle } = Typography;

interface ModalPageLayoutProps {
  title: string;
  children: ReactNode;
  backHref: string;
}

export function ModalPageLayout({
  title,
  children,
  backHref,
}: ModalPageLayoutProps) {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Card
          variant="borderless"
          className="rounded-3xl border border-sky-100 bg-sky-50/70 shadow-[0_18px_38px_rgba(15,23,42,0.05)]"
          styles={{ body: { padding: 18 } }}
        >
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <Space orientation="vertical" size={4}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {siteContent.admin.modalSubtitle}
              </div>
              <TypographyTitle level={3} style={{ marginBottom: 0 }}>
                {title}
              </TypographyTitle>
              <TypographyParagraph
                style={{ marginBottom: 0, color: "#64748b" }}
              >
                Kelola detail data pada halaman kerja ini lalu tutup untuk kembali ke dashboard.
              </TypographyParagraph>
            </Space>

            <Button href={backHref} icon={<CloseOutlined />}>
              Tutup
            </Button>
          </div>

          <div>{children}</div>
        </Card>
      </div>
    </main>
  );
}
