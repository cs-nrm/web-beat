import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://beatdigital.mx',
	integrations: [mdx(), sitemap()],
});

const API_URL = import.meta.env.PUBLIC_API_URL;

export async function fetchAPI( query='' ) {
    const res = await fetch( `${API_URL}/${query}` );

    if ( res.ok ) {
        return res.json();
    } else {
        const error = await res.json();

        throw new Error(
            '❗ Failed to fetch API for ' + query + "\n" +
            'Code: ' + error.code + "\n" +
            'Message: ' + error.message + "\n"
        );
    }
}

export async function getArticles() {
    const data = await fetchAPI( 'articles/?per_page=50' );

    return data;
}
