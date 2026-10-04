/* ============================================================================
   SUNERGYX — DELIVERY ZONES & FEES
   ============================================================================
   Edit this in admin.html -> "Delivery / Shipping" -> Download shipping.js,
   then replace this file on your website. products.js is NOT touched.

   index.html reads this file to build the "Delivery" dropdown at checkout.
   The customer pays exactly the "fee" below (Naira, no commas/symbols).

   - group: heading in the dropdown (rows with the same text are grouped)
   - label: option text (the fee is appended automatically)
   - fee:   price in Naira. Use 0 for free / pickup.
   - note:  optional small note shown when that option is selected

   NOTE: the fees below are STARTER VALUES - change them to your real prices.
   ============================================================================ */

window.SUNERGYX_SHIPPING = [
  { "group": "Pickup", "label": "Pickup at Store — 18 Sarah Faboyede Street, Bucknor Ejigbo, Lagos", "fee": 0 },

  { "group": "Lagos", "label": "Lagos Mainland Delivery", "fee": 15000 },
  { "group": "Lagos", "label": "Lagos Island / Lekki / Ajah Delivery", "fee": 20000 },

  { "group": "Abuja (FCT)", "label": "Abuja Delivery", "fee": 50000, "note": "Fee may change for bulky or heavy orders (batteries, large inverters)." },
  { "group": "Rivers", "label": "Port Harcourt Delivery", "fee": 50000, "note": "Fee may change for bulky or heavy orders (batteries, large inverters)." },
  { "group": "Oyo", "label": "Ibadan Delivery", "fee": 35000 },

  { "group": "Other States", "label": "Other States (Interstate Delivery)", "fee": 60000, "note": "We will confirm the final delivery fee with you on WhatsApp." }
];
