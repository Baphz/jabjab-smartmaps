"use client";

import { Card, Typography } from "antd";
import type { ReactNode } from "react";

const { Paragraph: TypographyParagraph, Title: TypographyTitle } = Typography;

type AdminSectionIntroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  footer?: ReactNode;
};

export default function AdminSectionIntro({
  eyebrow = "Workspace",
  title,
  description,
  action,
  footer,
}: AdminSectionIntroProps) {
  return (
    <Card
      variant="borderless"
      className="rounded-3xl border border-emerald-100 bg-emerald-50/60 shadow-[0_18px_38px_rgba(15,23,42,0.05)]"
      styles={{ body: { padding: 18 } }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {eyebrow}
          </div>
          <TypographyTitle level={3} style={{ marginTop: 4, marginBottom: 4 }}>
            {title}
          </TypographyTitle>
          <TypographyParagraph
            style={{
              marginBottom: 0,
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.55,
              maxWidth: 780,
            }}
          >
            {description}
          </TypographyParagraph>
          {footer ? <div className="mt-3">{footer}</div> : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </Card>
  );
}
