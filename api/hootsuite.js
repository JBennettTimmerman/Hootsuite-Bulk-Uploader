// Vercel Serverless Function — Hootsuite API Proxy
// Forwards requests from the browser to Hootsuite's API,
// bypassing CORS restrictions that block direct browser calls.

export default async function handler(req, res) {
  // Allow requests from your Vercel app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hootsuite-Path, X-Hootsuite-Method, X-Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // The target Hootsuite path is passed via a custom header
    // e.g. X-Hootsuite-Path: /v1/messages
    const hootsuitePath = req.headers['x-hootsuite-path'];
    const hootsuiteMethod = req.headers['x-hootsuite-method'] || req.method;
    const contentType = req.headers['x-content-type'] || 'application/json;charset=utf-8';

    if (!hootsuitePath) {
      return res.status(400).json({ error: 'Missing X-Hootsuite-Path header' });
    }

    const targetUrl = `https://platform.hootsuite.com${hootsuitePath}`;
    const authHeader = req.headers['authorization'];

    // Build fetch options
    const fetchOptions = {
      method: hootsuiteMethod,
      headers: {
        'Authorization': authHeader,
        'Content-Type': contentType,
      },
    };

    // Forward body for POST/PUT requests
    if (['POST', 'PUT'].includes(hootsuiteMethod) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    // Make the request to Hootsuite
    const hootsuiteRes = await fetch(targetUrl, fetchOptions);
    const responseText = await hootsuiteRes.text();

    // Forward Hootsuite's status code and response
    res.status(hootsuiteRes.status);
    res.setHeader('Content-Type', 'application/json');

    // Try to parse as JSON, otherwise return raw text
    try {
      const json = JSON.parse(responseText);
      return res.json(json);
    } catch {
      return res.send(responseText);
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
}
