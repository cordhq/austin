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
