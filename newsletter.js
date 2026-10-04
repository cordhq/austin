// /api/newsletter.js - Vercel Serverless Function
//
// Receives newsletter signups from the footer form on index.html.
//
// Where do the emails go? Set at least one of these in Vercel -> Settings -> Environment Variables:
//   NEWSLETTER_WEBHOOK_URL  A URL that accepts a JSON POST: { email, source, subscribed_at }.
//                           Works with Make.com, Zapier, Formspree, a Google Sheets/Apps Script web app, etc.
//   WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID  (same ones /api/whatsapp uses)
//                           Sends each new signup to OWNER_WHATSAPP as a WhatsApp message.
// If neither is set, signups are only written to the Vercel function logs.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  // Honeypot: real visitors never fill this hidden field, bots usually do.
  if (body.website) return res.status(200).json({ ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
  }

  const record = { email, source: 'website-footer', subscribed_at: new Date().toISOString() };
  console.log('Newsletter signup', email);

  const HOOK = process.env.NEWSLETTER_WEBHOOK_URL;
  const WA_TOKEN = process.env.WHATSAPP_TOKEN;
  const WA_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const OWNER = process.env.OWNER_WHATSAPP || '2347084441471';

  let hookOk = false, waOk = false;

  if (HOOK) {
    try {
      const r = await fetch(HOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) });
      hookOk = r.ok;
      if (!r.ok) console.error('Newsletter webhook returned', r.status);
    } catch (e) { console.error('Newsletter webhook failed', e.message); }
  }

  if (WA_TOKEN && WA_ID) {
    try {
      const r = await fetch(`https://graph.facebook.com/v19.0/${WA_ID}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: OWNER, type: 'text', text: { body: `New newsletter signup: ${email}` } })
      });
      waOk = r.ok;
    } catch (e) { console.error('Newsletter WhatsApp notify failed', e.message); }
  }

  const configured = !!(HOOK || (WA_TOKEN && WA_ID));
  if (configured && !hookOk && !waOk) {
    return res.status(502).json({ ok: false, error: 'Could not save your subscription right now. Please try again.' });
  }
  return res.status(200).json({ ok: true, stored: hookOk || waOk });
}
