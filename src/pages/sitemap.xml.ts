/**
 * `/sitemap.xml` — el índice, y sus hijos por `?seccion=&pagina=`.
 *
 * Lo genera el CMS; aquí solo se sirve bajo nuestro dominio. Ver `lib/feeds.ts`,
 * que explica por qué tiene que ser así y no al revés.
 */
import type { APIRoute } from 'astro';
import { proxyFeed } from '@/lib/feeds';

export const prerender = false;

export const GET: APIRoute = ({ url }) => proxyFeed('sitemap.xml', url);
