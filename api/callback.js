// Vercel Serverless Function — OAuth Callback
// Receives the authorization code from Hootsuite, exchanges it for tokens,
// then sends them back to the parent window via postMessage and closes the popup.

export default async function handler(req, res) {
  const { code, state, error, error_description } = req.query;

  // Build the redirect URI (must match what was used in /api/auth)
  const redirectUri = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/callback`;

  // Handle errors from Hootsuite
  if (error) {
    return res.status(200).send(buildPopupResponse(null, `${error}: ${error_description || 'Unknown error'}`));
  }

  if (!code) {
    return res.status(200).send(buildPopupResponse(null, 'No authorization code received'));
  }

  try {
    const clientId     = process.env.HOOTSUITE_CLIENT_ID;
    const clientSecret = process.env.HOOTSUITE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(200).send(buildPopupResponse(null, 'Server configuration error — missing credentials'));
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://platform.hootsuite.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id:    clientId,
        client_secret: clientSecret,
      }).toString()
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || `HTTP ${tokenRes.status}`;
      return res.status(200).send(buildPopupResponse(null, errMsg));
    }

    // Success — send token back to parent window and close popup
    return res.status(200).send(buildPopupResponse({
      access_token:  tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_in:    tokenData.expires_in || null,
    }));

  } catch (err) {
    return res.status(200).send(buildPopupResponse(null, err.message));
  }
}

function buildPopupResponse(tokenData, error = null) {
  const payload = error
    ? JSON.stringify({ type: 'HOOTSUITE_TOKEN', error })
    : JSON.stringify({ type: 'HOOTSUITE_TOKEN', ...tokenData });

  return `<!DOCTYPE html>
<html>
<head><title>Hootsuite Login</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f2ee;">
  <div style="text-align:center;padding:40px;background:white;border-radius:12px;border:1px solid #e2dfd8;max-width:320px;">
    ${error
      ? `<div style="color:#a32d2d;font-size:16px;font-weight:500;">✗ Login Failed</div>
         <div style="color:#7a776e;font-size:13px;margin-top:8px;">${error}</div>
         <button onclick="window.close()" style="margin-top:16px;padding:8px 20px;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:white;">Close</button>`
      : `<div style="color:#2b5f3e;font-size:16px;font-weight:500;">✓ Login Successful</div>
         <div style="color:#7a776e;font-size:13px;margin-top:8px;">Closing window...</div>`
    }
  </div>
  <script>
    try {
      window.opener.postMessage(${payload}, window.location.origin);
    } catch(e) {}
    ${error ? '' : 'setTimeout(() => window.close(), 800);'}
  </script>
</body>
</html>`;
}
