"use client";

import { CopyOutlined } from "@ant-design/icons";
import { Button, message } from "antd";
import {
  FacebookIcon,
  FacebookShareButton,
  LinkedinIcon,
  LinkedinShareButton,
  TelegramIcon,
  TelegramShareButton,
  WhatsappIcon,
  WhatsappShareButton,
  XIcon,
  TwitterShareButton,
} from "react-share";

type ArticleSharePanelProps = {
  url: string;
  title: string;
  summary?: string | null;
};

function ShareIconButton({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="smartmaps-article-share-action">
      {children}
      <span className="smartmaps-article-share-action-label">{label}</span>
    </div>
  );
}

export default function ArticleSharePanel({
  url,
  title,
  summary,
}: ArticleSharePanelProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const shareTitle = summary ? `${title} — ${summary}` : title;
  const formattedUrl = url.replace(/^https?:\/\//, "");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      messageApi.success("Link artikel berhasil disalin.");
    } catch {
      messageApi.error("Gagal menyalin link artikel.");
    }
  }

  return (
    <>
      {contextHolder}

      <div className="smartmaps-article-share-panel">
        <div className="smartmaps-article-share-head">
          <div>
            <div className="smartmaps-overline">Bagikan</div>
            <h3 className="smartmaps-title-card mt-1">Bagikan Artikel</h3>
          </div>

          <Button
            icon={<CopyOutlined />}
            className="smartmaps-article-share-copy-button rounded-full"
            onClick={handleCopy}
          >
            Salin Link
          </Button>
        </div>

        <div className="smartmaps-article-share-url">
          <span className="smartmaps-article-share-url-label">Link publik</span>
          <span className="smartmaps-article-share-url-value">{formattedUrl}</span>
        </div>

        <div className="smartmaps-article-share-actions">
          <WhatsappShareButton url={url} title={shareTitle}>
            <ShareIconButton label="WhatsApp">
              <WhatsappIcon size={28} round />
            </ShareIconButton>
          </WhatsappShareButton>

          <TelegramShareButton url={url} title={shareTitle}>
            <ShareIconButton label="Telegram">
              <TelegramIcon size={28} round />
            </ShareIconButton>
          </TelegramShareButton>

          <TwitterShareButton url={url} title={shareTitle}>
            <ShareIconButton label="X">
              <XIcon size={28} round />
            </ShareIconButton>
          </TwitterShareButton>

          <FacebookShareButton url={url} hashtag="#SmartMapsLabkesda">
            <ShareIconButton label="Facebook">
              <FacebookIcon size={28} round />
            </ShareIconButton>
          </FacebookShareButton>

          <LinkedinShareButton url={url} title={title} summary={summary ?? ""}>
            <ShareIconButton label="LinkedIn">
              <LinkedinIcon size={28} round />
            </ShareIconButton>
          </LinkedinShareButton>
        </div>
      </div>
    </>
  );
}
