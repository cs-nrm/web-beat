/**
 * `/news-sitemap.xml` — el feed de Google News.
 *
 * Mismo reparto que el sitemap: el CMS genera, este dominio sirve.
 */
import type { APIRoute } from 'astro';
import { proxyFeed } from '@/lib/feeds';

export const prerender = false;

export const GET: APIRoute = ({ url }) => proxyFeed('news-sitemap.xml', url);
