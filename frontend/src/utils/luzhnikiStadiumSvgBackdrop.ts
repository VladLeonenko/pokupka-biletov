/**
 * Подложка стадиона для canvas: только поле/сектора, без подписей «Ложа …» и без circle[place-name].
 */
export function stripLuzhnikiStadiumSvgForCanvasBackdrop(svgHtml: string): string {
  if (!svgHtml?.trim()) return svgHtml;
  let out = svgHtml;
  out = out.replace(/<text\b[^>]*>[\s\S]*?<\/text>/gi, '');
  out = out.replace(/<tspan\b[^>]*\/>/gi, '');
  out = out.replace(/<tspan\b[^>]*>[\s\S]*?<\/tspan>/gi, '');
  out = out.replace(/<circle\b[^>]*\bplace-name=[^>]*\/?>/gi, '');
  out = out.replace(/<circle\b[^>]*\bplace-name=[^>]*>[\s\S]*?<\/circle>/gi, '');
  out = out.replace(/<g\b[^>]*\bid=["']luzhniki-pilot-seats["'][^>]*>[\s\S]*?<\/g>/gi, '');
  out = out.replace(/<g\b[^>]*\bid=["']pbilet-strict-seat-geodesy["'][^>]*>[\s\S]*?<\/g>/gi, '');
  return out;
}
