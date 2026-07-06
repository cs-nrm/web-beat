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

export async function getArticles(cat) {
    const data = await fetchAPI( 'posts?_embed&per_page=70&categories='+cat );

    return data;
}

// Cachea por URL dentro del mismo proceso de build — evita repetir la misma
// consulta (ej. "últimos 5 posts de la categoría X") en cada página que
// renderiza un componente "More*".
const fetchCache = new Map();

export async function fetchCached(url) {
    if (!fetchCache.has(url)) {
        fetchCache.set(url, fetch(url).then((res) => res.json()));
    }
    return fetchCache.get(url);
}

/*export async function conn() {
    const res = await fetch('',{

    });

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
}*/
