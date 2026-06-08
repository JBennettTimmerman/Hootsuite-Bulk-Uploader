// Vercel Serverless Function — OAuth Authorization Redirect
// Redirects the browser to Hootsuite's OAuth login page.
// The client_id is stored as a Vercel environment variable (HOOTSUITE_CLIENT_ID).

export default function handler(req, res) {
  const clientId = process.env.HOOTSUITE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h3 style="color:#a32d2d;">Configuration Error</h3>
        <p>HOOTSUITE_CLIENT_ID environment variable is not set in Vercel.</p>
        <p>Go to your Vercel project → Settings → Environment Variables and add it.</p>
      </body></html>
    `);
  }

  const state = req.query.state || '12345678';
  const redirectUri = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/callback`;

  const authUrl = new URL('https://platform.hootsuite.com/oauth2/auth');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'offline');
  authUrl.searchParams.set('state', state);

  return res.redirect(302, authUrl.toString());
}
