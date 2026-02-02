# Deployment Guide

This guide explains how to deploy your Shopify Remix app so it's accessible from your Hydrogen storefront.

## Quick Overview

1. **Deploy to a hosting provider** (Railway, Fly.io, Render, etc.)
2. **Update your app URL** in Shopify Partners dashboard
3. **Set environment variables** on your hosting provider
4. **Update your Hydrogen app** to use the production URL

---

## Option 1: Railway (Recommended - Easiest)

Railway is the easiest option with a good free tier.

### Steps:

1. **Sign up**: Go to https://railway.app and sign up with GitHub

2. **Create new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account and select this repository

3. **Configure environment variables**:
   In Railway, go to your project → Variables tab, add:
   ```
   SHOPIFY_API_KEY=your_api_key
   SHOPIFY_API_SECRET=your_api_secret
   SCOPES=write_products,write_draft_orders
   SHOPIFY_APP_URL=https://your-app-name.up.railway.app
   DATABASE_URL=file:./dev.sqlite  # Or use Railway's PostgreSQL
   NODE_ENV=production
   ```

4. **Deploy**:
   - Railway will automatically detect your `package.json` and deploy
   - It will run `npm run build` and `npm start`
   - Your app will be available at `https://your-app-name.up.railway.app`

5. **Update Shopify app URL**:
   - Go to https://partners.shopify.com
   - Find your app "quotes-test"
   - Go to "App setup" → "App URL"
   - Change from `https://example.com` to `https://your-app-name.up.railway.app`
   - Update "Allowed redirection URL(s)" to include your Railway URL

6. **Update your Hydrogen app**:
   ```env
   PUBLIC_DRAFT_ORDER_API_URL=https://your-app-name.up.railway.app
   ```

---

## Option 2: Fly.io

Fly.io is great for global deployment.

### Steps:

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**:
   ```bash
   fly auth login
   ```

3. **Create app**:
   ```bash
   fly launch
   ```
   Follow the prompts to create your app.

4. **Set secrets**:
   ```bash
   fly secrets set SHOPIFY_API_KEY=your_api_key
   fly secrets set SHOPIFY_API_SECRET=your_api_secret
   fly secrets set SCOPES=write_products,write_draft_orders
   fly secrets set SHOPIFY_APP_URL=https://your-app-name.fly.dev
   ```

5. **Deploy**:
   ```bash
   fly deploy
   ```

6. **Update Shopify app URL** (same as Railway steps above)

---

## Option 3: Render

Render has a good free tier.

### Steps:

1. **Sign up**: Go to https://render.com

2. **Create new Web Service**:
   - Connect your GitHub repository
   - Select "Web Service"
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

3. **Set environment variables** (same as Railway)

4. **Deploy** - Render will automatically deploy

---

## Database Considerations

Your app uses SQLite by default (`file:./dev.sqlite`), which works for single-instance deployments but **won't work** if you need multiple instances or want persistence.

### For Production, use PostgreSQL:

1. **Railway**: Add a PostgreSQL service, it will give you a `DATABASE_URL`

2. **Update Prisma schema**:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```

---

## Environment Variables Checklist

Make sure these are set on your hosting provider:

```env
# Required
SHOPIFY_API_KEY=your_api_key_from_partners_dashboard
SHOPIFY_API_SECRET=your_api_secret_from_partners_dashboard
SCOPES=write_products,write_draft_orders
SHOPIFY_APP_URL=https://your-deployed-url.com
DATABASE_URL=your_database_url

# Optional
NODE_ENV=production
ALLOWED_ORIGINS=https://your-hydrogen-store.myshopify.com
```

---

## After Deployment

1. **Test your API**:
   ```bash
   curl -X POST https://your-deployed-url.com/api/quotes \
     -H "Content-Type: application/json" \
     -d '{
       "shop": "dev-hydrogen-2.myshopify.com",
       "email": "test@example.com",
       "lineItems": [{"variantId": "gid://shopify/ProductVariant/123", "quantity": 1}]
     }'
   ```

2. **Reinstall your app** on your Shopify store:
   - Go to Shopify admin → Apps
   - Uninstall and reinstall to get the new URL

3. **Update Hydrogen app**:
   - Change `PUBLIC_DRAFT_ORDER_API_URL` to your production URL
   - Redeploy your Hydrogen app

---

## Troubleshooting

### "App URL mismatch" error
- Make sure `SHOPIFY_APP_URL` matches exactly what's in Shopify Partners dashboard
- Check for trailing slashes

### "Session not found" error
- Reinstall the app after updating the URL
- Check that your database is accessible

### CORS errors
- Set `ALLOWED_ORIGINS` environment variable with your Hydrogen store URL

---

## Quick Deploy Script (Railway)

If using Railway, you can also use their CLI:

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

Then set your environment variables in the Railway dashboard.

---

## Recommended: Railway

For simplicity, I recommend **Railway** because:
- ✅ Easiest setup
- ✅ Free tier available
- ✅ Automatic deployments from GitHub
- ✅ Built-in PostgreSQL option
- ✅ Good documentation

Your app will be live at: `https://your-app-name.up.railway.app`

Then update your Hydrogen app's `.env`:
```env
PUBLIC_DRAFT_ORDER_API_URL=https://your-app-name.up.railway.app
```
