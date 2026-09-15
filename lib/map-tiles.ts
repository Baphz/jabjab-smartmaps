export function getCartoTileUrl(style: "voyager" | "light_all") {
  const apiKey = process.env.NEXT_PUBLIC_CARTO_BASEMAP_API_KEY?.trim();
  const url = `https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}{r}.png`;

  return apiKey ? `${url}?key=${encodeURIComponent(apiKey)}` : url;
}
