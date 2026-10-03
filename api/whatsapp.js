// /api/whatsapp.js - Vercel Serverless Function
// POST from SunergyX shop with order JSON
// Env vars: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, OWNER_WHATSAPP

export default async function handler(req, res) {
  // CORS for your shop domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = req.body || {};
  const { customer, items, total_formatted, whatsapp_message, wa_number, ref, timestamp } = body;

  console.log('New order', ref, customer?.name);

  const OWNER_NUMBER = process.env.OWNER_WHATSAPP || wa_number || '2347084441471';
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  let waResult = null;

  // 1) Try WhatsApp Cloud API if configured
  if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
    try {
      const waRes = await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: OWNER_NUMBER,
          type: 'text',
          text: { body: (whatsapp_message || 'New order').slice(0, 4000) }
        })
      });
      waResult = await waRes.json();
      console.log('WhatsApp API response', waResult);
    } catch (e) {
      console.error('WhatsApp API error', e);
      waResult = { error: e.message };
    }
  }

  // 2) Always return wa.me link as fallback + log order
  const waLink = `https://wa.me/${OWNER_NUMBER}?text=${encodeURIComponent(whatsapp_message || 'New order ' + ref)}`;

  // Optional: save to Vercel KV / DB / email here

  return res.status(200).json({
    ok: true,
    message: 'Order received',
    wa_link: waLink,
    whatsapp_api: waResult,
    order: {
      ref,
      timestamp,
      customer,
      total: total_formatted,
      items_count: items?.length || 0
    }
  });
}
