# 🚂 Railway Deployment Instructions

Your code is now on Railway! Follow these steps to complete the deployment:

## Step 1: Add PostgreSQL Database

1. Go to your Railway project dashboard
2. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
3. Wait for it to provision (~30 seconds)

## Step 2: Add Nakama Server Service

1. Click **"New"** → **"Empty Service"**
2. Name it: `nakama-server`
3. Go to **Settings** → **Source** → Connect to your GitHub repo
4. Under **Root Directory**: Enter `server`
5. Under **Custom Start Command**: Enter:
   ```
   /nakama/nakama --config /nakama/data/local.yml
   ```

### Environment Variables for Nakama:
Click **"Variables"** tab and add:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

## Step 3: Get Your Nakama Domain

1. In the Nakama service, go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy the domain (e.g., `nakama-server-production-xxxx.up.railway.app`)
4. **IMPORTANT**: Save this domain - you'll need it for the client!

## Step 4: Update Client Configuration

You need to update the client to connect to your Railway Nakama server:

### Option A: Update game.js directly
Edit `client/src/game.js` line 7-11:
```javascript
const CONFIG = {
    serverUrl: 'YOUR-NAKAMA-DOMAIN.up.railway.app',  // Paste your Railway domain here
    serverPort: '443',
    serverKey: 'defaultkey',
    useSSL: true  // Change to true for Railway
};
```

### Option B: Deploy client separately
1. Click **"New"** → **"Empty Service"**
2. Name it: `tictactoe-client`
3. **Settings** → **Source** → Your GitHub repo
4. **Root Directory**: `client/src`
5. **Start Command**: `python3 -m http.server $PORT`

Then create `client/src/config.js`:
```javascript
const CONFIG = {
    serverUrl: 'YOUR-NAKAMA-DOMAIN.up.railway.app',
    serverPort: '443',
    serverKey: 'defaultkey',
    useSSL: true
};
```

And update `index.html` to load it before game.js.

## Step 5: Commit & Push Changes

```bash
cd /Users/vsscharan/Desktop/tic-tak-toe-lilagames

# Update the config in game.js with your Railway domain
# Then commit and push:

git add .
git commit -m "Update config for Railway deployment"
git push origin main
```

Railway will automatically redeploy!

## Step 6: Test Your Live Game!

1. Get your client URL from Railway (either the Nakama domain or separate client service)
2. Open it in two browsers
3. Play the game online! 🎮

## Troubleshooting

### Can't connect to server
- Check that DATABASE_URL is set in Nakama service
- Verify the Nakama domain in CONFIG matches your Railway domain
- Check logs: Railway dashboard → Select service → **"Deployments"** → Click latest → **"View Logs"**

### Database errors
- Ensure PostgreSQL service is running
- Check DATABASE_URL is correctly linked

### Client not loading
- Verify serverUrl in CONFIG points to your Nakama Railway domain
- Make sure useSSL is set to `true`
- Check browser console for errors (F12)

## Your Railway URLs

After setup, you'll have:
- **Nakama Server**: `https://nakama-server-production-xxxx.up.railway.app`
- **Client** (if separate): `https://tictactoe-client-production-xxxx.up.railway.app`
- **Admin Console**: `https://nakama-server-production-xxxx.up.railway.app:7351`

## Cost

Railway free tier includes:
- $5 credit per month
- Should be enough for development/testing
- Upgrade to Developer plan ($20/month) for production

## Next Steps

1. ✅ Add PostgreSQL
2. ✅ Configure Nakama service
3. ✅ Get Nakama domain
4. ⏳ Update client config with domain
5. ⏳ Push changes
6. ⏳ Test the live game!

---

**Need help?** Check Railway logs or the troubleshooting section above.
