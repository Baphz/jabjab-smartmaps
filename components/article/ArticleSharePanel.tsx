"use client";

import {
  CloseOutlined,
  CopyOutlined,
  LinkOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { Button, message } from "antd";
import { useEffect, useRef, useState } from "react";
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
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shareTitle = summary ? `${title} — ${summary}` : title;
  const formattedUrl = url.replace(/^https?:\/\//, "");

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!containerRef.current?.contains(target)) {
        setExpanded(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpanded(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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

      <div
        ref={containerRef}
        className={`smartmaps-article-share-floating${expanded ? " is-expanded" : ""}`}
      >
        <div className="smartmaps-article-share-flyout" aria-hidden={!expanded}>
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
              <span className="smartmaps-article-share-url-label">
                <LinkOutlined />
                Link publik
              </span>
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
        </div>

        <button
          type="button"
          className="smartmaps-article-share-fab"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-label={expanded ? "Tutup panel bagikan" : "Bagikan artikel"}
        >
          {expanded ? <CloseOutlined /> : <ShareAltOutlined />}
        </button>
      </div>
    </>
  );
}
