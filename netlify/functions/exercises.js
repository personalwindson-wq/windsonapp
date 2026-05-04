// Netlify Function — proxy para ExerciseDB (RapidAPI)
// A chave fica em variável de ambiente no servidor, nunca exposta ao browser.

exports.handler = async function (event) {
  const name = (event.queryStringParameters || {}).name || '';

  if (!name || name.length < 2) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Parâmetro "name" obrigatório.' }) };
  }

  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Serviço de exercícios indisponível.' }) };
  }

  try {
    const url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(name)}?limit=3&offset=0`;
    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
      }
    });

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: 'Erro na API de exercícios.' }) };
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=604800' // cache 7 dias no CDN
      },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro interno.' }) };
  }
};
