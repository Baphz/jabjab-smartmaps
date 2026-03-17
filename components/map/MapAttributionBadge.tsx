"use client";

type MapAttributionBadgeProps = {
  className?: string;
};

export default function MapAttributionBadge({
  className = "",
}: MapAttributionBadgeProps) {
  return (
    <div
      className={`group pointer-events-auto relative ${className}`.trim()}
      tabIndex={0}
      aria-label="Attribution map untuk OpenStreetMap dan CARTO"
    >
      <div className="rounded-[12px] border border-slate-200/90 bg-white/86 px-2.5 py-1 text-[10.5px] text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur">
        <span className="font-medium text-slate-600">OpenStreetMap</span>
        <span className="mx-1 text-slate-300">·</span>
        <span className="font-medium text-slate-600">CARTO</span>
      </div>

      <div className="pointer-events-none absolute bottom-[calc(100%+8px)] right-0 hidden min-w-[230px] rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500 shadow-[0_14px_32px_rgba(15,23,42,0.12)] group-hover:block group-focus-within:block">
        Data peta{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto font-medium text-slate-700 hover:text-sky-700"
        >
          OpenStreetMap
        </a>{" "}
        · Tiles{" "}
        <a
          href="https://carto.com/"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto font-medium text-slate-700 hover:text-sky-700"
        >
          CARTO
        </a>
      </div>
    </div>
  );
}
