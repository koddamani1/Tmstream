# TorBox Setup Guide

## Why TorBox?

Stremio cannot play raw magnet links directly in browser/mobile apps. TorBox converts magnet links to direct streaming URLs.

**TorBox Free Tier:**
- ✅ 1GB download per day
- ✅ No credit card required
- ✅ Instant streaming
- ✅ Works on all devices

## Step 1: Get TorBox API Key

1. **Sign up for TorBox:**
   - Go to [torbox.app](https://torbox.app)
   - Click "Sign Up"
   - Create account (email + password)
   - Verify your email

2. **Get API Key:**
   - Log in to TorBox
   - Go to **Settings** → **API**
   - Copy your **API Key** (looks like: `abc123def456...`)

## Step 2: Configure Addon

### Option A: Use Configuration Page (Recommended)

1. **Open configuration page:**
   - Go to: [https://tmstream-scraper.onrender.com/configure](https://tmstream-scraper.onrender.com/configure)

2. **Configure settings:**
   - **Debrid Provider**: Select **"TorBox"**
   - **TorBox API Key**: Paste your API key
   - Select your preferred catalogs
   - Select quality filters (4K, 1080p, 720p, etc.)

3. **Install in Stremio:**
   - Click **"Install in Stremio"** button
   - Or copy the manifest URL and add manually

### Option B: Manual Configuration

If you prefer to configure manually:

1. **Create config object:**
   ```json
   {
     "debridProvider": "torbox",
     "torboxKey": "YOUR_API_KEY_HERE",
     "catalogs": ["tamil-movies", "tamil-movies-hd", "hollywood-multi", "tamil-series"],
     "qualities": ["4k", "1080p", "720p"],
     "languages": ["tamil", "telugu", "hindi", "english"],
     "maxResults": 10
   }
   ```

2. **Encode to Base64:**
   - Use online tool: [base64encode.org](https://www.base64encode.org/)
   - Encode your JSON config

3. **Create manifest URL:**
   ```
   https://tmstream-scraper.onrender.com/YOUR_BASE64_CONFIG/manifest.json
   ```

4. **Add to Stremio:**
   - Open Stremio
   - Addons → "+" → Paste URL → Install

## Step 3: Verify It Works

1. **Open Stremio**
2. **Go to Discover** → **Tamil Movies**
3. **Click on a movie**
4. **Click on a stream**
5. **Should play immediately!** ✅

## Troubleshooting

### Problem: Still says "Video is not supported"

**Solution:**
1. Remove old addon from Stremio
2. Clear Stremio cache:
   - Desktop: Settings → Advanced → Clear Cache
   - Mobile: App Settings → Clear Data
3. Reinstall addon with TorBox configuration

### Problem: TorBox streams not showing

**Solution:**
1. Verify API key is correct
2. Check TorBox dashboard for quota
3. Try a different movie/quality

### Problem: "TorBox quota exceeded"

**Solution:**
- Free tier: 1GB/day limit
- Wait 24 hours for reset
- Or upgrade to paid plan (~$3/month for unlimited)

## Alternative: Use Stremio Desktop

If you don't want to use TorBox:

1. **Install Stremio Desktop:**
   - Download from [stremio.com](https://www.stremio.com/downloads)

2. **Magnet links will work automatically** on desktop
   - Stremio has built-in torrent engine
   - No debrid service needed

**Note:** This only works on desktop, not mobile/web.

## Comparison

| Method | Cost | Works On | Speed |
|--------|------|----------|-------|
| **TorBox Free** | Free (1GB/day) | All devices | Fast |
| **TorBox Paid** | ~$3/month | All devices | Very Fast |
| **Stremio Desktop** | Free | Desktop only | Medium |
| **Real-Debrid** | ~€3/month | All devices | Very Fast |

## Recommendation

**Start with TorBox Free:**
1. Get 1GB/day free streaming
2. Test if it works for you
3. Upgrade if you need more

**Or use Stremio Desktop:**
- If you only watch on computer
- No debrid service needed
- Completely free

## Need Help?

Check these resources:
- TorBox Support: [torbox.app/support](https://torbox.app/support)
- Stremio Discord: [discord.gg/stremio](https://discord.gg/stremio)
- Addon Issues: [GitHub Issues](https://github.com/koddamani1/Tmstream/issues)
