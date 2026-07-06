import { formatFecha, parseToDate } from './formatters.js';

export async function getQuePlanPosts({ per_page = 80, category = 818 } = {}) {
  const url = `https://beatdigital.com.mx/wp-json/wp/v2/posts?_embed&per_page=${per_page}&_fields=title,slug,content,acf,yoast_head_json,_links,_embedded&categories=${category}&filter[orderby]=acf[inicio]&order=asc`;
  const res = await fetch(url);
  if (!res.ok) return [];
  let posts = await res.json();

  posts.sort(function (a, b) {
    const ah = a?.acf?.hora_inicio || '';
    const bh = b?.acf?.hora_inicio || '';
    return ah > bh ? 1 : ah < bh ? -1 : 0;
  });

  posts.forEach((p) => {
    p.fecha_inicio_formateada = formatFecha(p.acf?.fecha_inicio || p.acf?.fecha_inicio_raw || p.fecha_inicio || '');
    p.fecha_fin_formateada = formatFecha(p.acf?.fecha_fin || p.acf?.fecha_fin_raw || p.fecha_fin || '');
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  posts = posts.filter((p) => {
    const raw = p.acf?.fecha_fin || p.acf?.fecha_inicio || '';
    if (!raw) return true;
    const d = parseToDate(raw);
    if (!d) return true;
    d.setHours(0, 0, 0, 0);
    return d >= today;
  });

  return posts;
}
