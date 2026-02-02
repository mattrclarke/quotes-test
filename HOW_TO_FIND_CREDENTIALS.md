# How to Find Your Shopify App Credentials

## For Development (Already Working!)

✅ **You DON'T need to set these manually in development!**

When you run `shopify app dev`, the Shopify CLI automatically provides:
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SCOPES` (from `shopify.app.toml`)
- `SHOPIFY_APP_URL` (from the tunnel URL)

That's why your app works locally without a `.env` file!

---

## For Production Deployment

You need to get these values from **Shopify Partners Dashboard**:

### Step 1: Go to Shopify Partners

1. Go to: https://partners.shopify.com
2. Log in with your Shopify Partners account
3. Click on **"Apps"** in the left sidebar
4. Find your app: **"quotes-test"** (or click on it)

### Step 2: Get Your API Credentials

1. In your app, click on **"Settings"** → **"Credentials"**
2. You'll see:
   - **Client ID** (this is `SHOPIFY_API_KEY`)
   - **Secret** (this is `SHOPIFY_API_SECRET`)

   ⚠️ **Important**: The Secret might be hidden - click "Reveal" or "Show" to see it

### Step 3: Get Your App URL

After you deploy to Railway/Fly.io/etc:

1. Still in **"App setup"**
2. Find **"App URL"** field
3. This should be set to your production URL (e.g., `https://your-app.up.railway.app`)
4. Also check **"Allowed redirection URL(s)"** - add your production URL there too

### Step 4: SCOPES

The `SCOPES` value comes from your `shopify.app.toml` file:
```
scopes = "write_products,write_draft_orders"
```

So set: `SCOPES=write_products,write_draft_orders`

---

## Quick Reference

| Variable | Where to Find |
|----------|---------------|
| `SHOPIFY_API_KEY` | Partners Dashboard → Your App → Settings → Credentials → **Client ID** |
| `SHOPIFY_API_SECRET` | Partners Dashboard → Your App → Settings → Credentials → **Secret** |
| `SCOPES` | From `shopify.app.toml` → `scopes = "write_products,write_draft_orders"` |
| `SHOPIFY_APP_URL` | Your deployed URL (e.g., `https://your-app.up.railway.app`) |
| `DATABASE_URL` | Provided by your hosting service (Railway/Fly.io/etc) |

---

## Visual Guide

```
Shopify Partners Dashboard
└── Apps
    └── quotes-test
        └── Settings
            ├── Credentials
            │   ├── Client ID ← SHOPIFY_API_KEY
            │   └── Secret ← SHOPIFY_API_SECRET
            └── (App URL and redirect URLs are in other sections)
```

---

## Your Current App Info

From your `shopify.app.toml`, I can see:
- **App Name**: quotes-test
- **Client ID**: 73b65bd6514a7bdba0f3421f81c552fe
- **Scopes**: write_products,write_draft_orders

The Client ID is different from the API Key - you need the API Key and Secret from the Partners dashboard.

---

## After Deployment

Once you deploy and get your production URL:

1. **Update Shopify Partners**:
   - App URL: `https://your-app.up.railway.app`
   - Allowed redirection URL(s): `https://your-app.up.railway.app/api/auth`

2. **Set environment variables** on Railway/Fly.io:
   ```
   SHOPIFY_API_KEY=<from partners dashboard>
   SHOPIFY_API_SECRET=<from partners dashboard>
   SCOPES=write_products,write_draft_orders
   SHOPIFY_APP_URL=https://your-app.up.railway.app
   DATABASE_URL=<from railway postgres service>
   ```

3. **Reinstall your app** on your Shopify store so it uses the new production URL

---

## Need Help?

If you can't find these values:
1. Make sure you're logged into the correct Shopify Partners account
2. Make sure you're looking at the correct app ("quotes-test")
3. Check that you have the right permissions (you need to be the app owner or have admin access)
