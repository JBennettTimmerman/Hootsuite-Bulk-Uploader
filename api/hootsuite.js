// Vercel Serverless Function — Hootsuite API Proxy
// Forwards requests from the browser to Hootsuite's API and S3,
// bypassing CORS restrictions that block direct browser calls.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // allow large image uploads
    },
  },
};

export default async function handler(req, res) {
  // Allow requests from your Vercel app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hootsuite-Path, X-Hootsuite-Method, X-Content-Type, X-Target-Url');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const hootsuiteMethod = req.headers['x-hootsuite-method'] || req.method;
    const contentType     = req.headers['x-content-type'] || req.headers['content-type'] || 'application/json;charset=utf-8';
    const authHeader      = req.headers['authorization'];

    // X-Target-Url is used for full URLs (e.g. S3 upload URLs)
    // X-Hootsuite-Path is used for Hootsuite API paths (e.g. /v1/messages)
    const targetUrl = req.headers['x-target-url']
      ? req.headers['x-target-url']
      : `https://platform.hootsuite.com${req.headers['x-hootsuite-path']}`;

    if (!req.headers['x-target-url'] && !req.headers['x-hootsuite-path']) {
      return res.status(400).json({ error: 'Missing X-Hootsuite-Path or X-Target-Url header' });
    }

    // Build fetch options
    const fetchOptions = {
      method: hootsuiteMethod,
      headers: {},
    };

    // Only add Authorization for Hootsuite API calls, not S3
    if (req.headers['x-hootsuite-path'] && authHeader) {
      fetchOptions.headers['Authorization'] = authHeader;
    }

    // Handle body — support both JSON and binary (image) uploads
    if (['POST', 'PUT'].includes(hootsuiteMethod) && req.body) {
      const isS3Upload = !!req.headers['x-target-url'];
      if (isS3Upload) {
        // For S3, body is base64-encoded image data sent from the browser
        const base64Data = req.body.data;
        const mimeType   = req.body.mimeType;
        if (base64Data) {
          const buffer = Buffer.from(base64Data, 'base64');
          fetchOptions.body = buffer;
          fetchOptions.headers['Content-Type'] = mimeType;
          fetchOptions.headers['Content-Length'] = buffer.length;
        }
      } else {
        // For Hootsuite API, forward JSON body
        fetchOptions.body = JSON.stringify(req.body);
        fetchOptions.headers['Content-Type'] = contentType;
      }
    }

    // Make the proxied request
    const proxiedRes = await fetch(targetUrl, fetchOptions);
    const responseText = await proxiedRes.text();

    // Forward status code
    res.status(proxiedRes.status);
    res.setHeader('Content-Type', 'application/json');

    // Try to parse as JSON, otherwise return raw text
    try {
      const json = JSON.parse(responseText);
      return res.json(json);
    } catch {
      return res.send(responseText || '{}');
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
}
