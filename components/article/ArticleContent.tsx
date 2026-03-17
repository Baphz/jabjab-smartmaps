type ArticleContentProps = {
  html: string;
};

export default function ArticleContent({ html }: ArticleContentProps) {
  return (
    <div
      className="smartmaps-article-content text-[15px] leading-8 text-slate-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
