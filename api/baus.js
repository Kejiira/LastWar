// api/baus.js — Vercel (Node runtime)
// Lê/grava baus_lastwar.json no seu repo via GitHub Contents API.

module.exports = async (req, res) => {
  try {
    const token  = process.env.GITHUB_TOKEN;     // PAT com Contents: Read/Write
    const owner  = process.env.GITHUB_OWNER;     // ex.: "seu-usuario"
    const repo   = process.env.GITHUB_REPO;      // ex.: "seu-repo"
    const branch = process.env.GITHUB_BRANCH || 'main';
    const path   = 'baus_lastwar.json';

    if (!token || !owner || !repo) {
      return res.status(500).json({ error: 'Defina GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO (e opcional GITHUB_BRANCH).' });
    }

    const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'lastwar-grid-map'
    };

    if (req.method === 'GET') {
      const r = await fetch(`${baseUrl}?ref=${branch}`, { headers });
      if (r.status === 404) return res.status(200).json([]); // se não existir, retorna vazio
      if (!r.ok) return res.status(r.status).json({ error: 'Falha ao ler do GitHub', detail: await r.text() });

      const data = await r.json();
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      try { return res.status(200).json(JSON.parse(content)); }
      catch { return res.status(200).json([]); }
    }

    if (req.method === 'POST') {
      // Em Vercel (Node), JSON já vem em req.body quando Content-Type: application/json
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = null; }
      }
      if (!Array.isArray(body)) {
        return res.status(400).json({ error: 'Payload deve ser um array JSON' });
      }

      // pega sha atual (se existir)
      let sha;
      {
        const r = await fetch(`${baseUrl}?ref=${branch}`, { headers });
        if (r.ok) {
          const data = await r.json();
          sha = data.sha;
        }
      }

      const newContent = Buffer.from(JSON.stringify(body, null, 2), 'utf8').toString('base64');

      const commitRes = await fetch(baseUrl, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'update: baus_lastwar.json',
          content: newContent,
          sha,
          branch
        })
      });

      if (!commitRes.ok) {
        return res.status(commitRes.status).json({ error: 'Falha ao salvar no GitHub', detail: await commitRes.text() });
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method Not Allowed');
  } catch (e) {
    return res.status(500).json({ error: 'Erro inesperado', detail: String(e) });
  }
};
