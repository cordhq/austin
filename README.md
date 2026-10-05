# SunergyX v3 - Editable Tiles Offline + Vercel Ready

## New in v3: Category Tiles Editable Offline

- Open /admin.html (not linked from the public site) for the tile editor
- Edit title, image URL, or upload image (stored as base64, works offline)
- Toggle visibility, reorder Up/Down
- Save All Tiles Offline -> saved in localStorage `sunergyx_category_tiles_v3`
- Export/Import JSON for backup
- Works without internet after first load - uploaded images persist offline

## Deploy to Vercel

1. Upload this folder/zip to https://vercel.com/new
2. Set Env Vars:
   - OWNER_WHATSAPP=2347084441471
   - Optional: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
3. Deploy
4. After deploy, open /admin.html and set webhook URL to https://YOUR-PROJECT.vercel.app/api/whatsapp

## Structure
- index.html (storefront)
- admin.html (category tile editor + Paystack key + WhatsApp webhook settings)
- app.js (storefront logic)
- products.js, style.css, hero-solar.jpg
- api/whatsapp.js (serverless)
- vercel.json, package.json

## Newsletter (footer signup)
- Form posts to /api/newsletter (api/newsletter.js).
- To actually receive the emails, set ONE of these in Vercel Environment Variables:
  - NEWSLETTER_WEBHOOK_URL = a Make / Zapier / Formspree / Google Sheets web-app URL that accepts a JSON POST { email, source, subscribed_at }
  - WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID (already used by /api/whatsapp) -> each signup is sent to OWNER_WHATSAPP
- With neither set, signups only appear in the Vercel function logs.

## Terms of Service
- The Terms live in index.html (id="termsModal") and open from the footer, the checkout line and the link #terms.
- Edit the wording there if your warranty/returns rules change. Have a lawyer review it before relying on it.

## Refund and Shipping policies
- Both open from the footer (and the checkout line) as pop-ups in index.html: id="refundModal" and id="shippingModal". Direct links: /#refund-policy and /#shipping-policy.
- The delivery fee table in the Shipping Policy is read from shipping.js, so it always matches checkout.
- Search index.html for "CONFIRM" to find the business rules I chose (48-hour return window, 1-3 working day processing, who pays return delivery). Change them to your real rules.

## Hero video
- The hero in index.html is a looping muted video (Cloudinary URL) with hero-solar.jpg as the poster/fallback.
- It does not autoplay for visitors with "reduce motion" or Data Saver on; they see the poster image instead.
