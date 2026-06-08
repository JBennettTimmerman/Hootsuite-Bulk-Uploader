// Debug endpoint — shows what redirect_uri is being built
// Visit /api/debug to see the exact URL that needs to be registered in Hootsuite
// DELETE this file once the issue is resolved

export default function handler(req, res) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['host'];
  const redirectUri = `${proto}://${host}/api/callback`;
  const clientId = process.env.HOOTSUITE_CLIENT_ID;

  return res.status(200).json({
    redirectUri,
    proto,
    host,
    clientIdSet: !!clientId,
    clientIdPreview: clientId ? clientId.substring(0, 8) + '...' : 'NOT SET'
  });
}
