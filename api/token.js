// Vercel Serverless Function — Token Exchange / Refresh
// Handles token refresh requests from the browser securely server-side.
// Client secret never exposed to the browser.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const clientId     = process.env.HOOTSUITE_CLIENT_ID;
    const clientSecret = process.env.HOOTSUITE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { grant_type, refresh_token } = req.body;

    if (!grant_type || grant_type !== 'refresh_token' || !refresh_token) {
      return res.status(400).json({ error: 'Invalid request — grant_type and refresh_token required' });
    }

    const tokenRes = await fetch('https://platform.hootsuite.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token,
        client_id:     clientId,
        client_secret: clientSecret,
      }).toString()
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.status(tokenRes.status).json({ error: data.error_description || data.error || 'Token refresh failed' });
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
