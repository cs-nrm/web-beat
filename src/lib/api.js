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