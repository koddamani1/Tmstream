# Tamil Movies & Series - Stremio Addon

Stream Tamil movies and series from 1TamilMV and 1TamilBlasters with automatic scraping and TorBox integration.

## 🚀 Quick Start

**Want 24/7 automatic scraping for FREE?** → [QUICK-START.md](QUICK-START.md)

### Add to Stremio

1. Open Stremio
2. Go to Addons → Click "+"
3. Enter: `https://tmstream.vercel.app/manifest.json`
4. Install and enjoy!

Or configure first: [https://tmstream.vercel.app/configure](https://tmstream.vercel.app/configure)

## ✨ Features

- 🎬 **Tamil Movies** - Latest releases from 1TamilMV
- 📺 **Tamil Series** - Web series and TV shows
- 🌍 **Hollywood Multi-Audio** - Hollywood movies with Tamil/Hindi audio
- 🎯 **HD Quality** - 4K, 1080p, 720p, and more
- ⚡ **TorBox Integration** - Debrid streaming support
- 🔄 **Automatic Updates** - Continuous scraping every 10-30 minutes
- 📊 **Rich Metadata** - Quality, codec, audio, language, file size info

## 📋 Catalogs

- **Tamil Movies** - All Tamil movie releases
- **Tamil HD Movies** - High quality 1080p and 4K releases
- **Hollywood (Multi Audio)** - Hollywood movies with Tamil/Hindi audio
- **Tamil Series** - Web series and TV shows

## 🎯 Stream Information

Each stream shows:
- 📹 **Quality**: 4K, 1080p, 720p, 480p, CAM, etc.
- 💿 **Source**: BluRay, WEB-DL, HDRip, etc.
- 🎬 **Codec**: HEVC, H.264, AV1
- 🗣️ **Languages**: Tamil, Telugu, Hindi, English, etc.
- 🔊 **Audio**: Atmos, DTS, AAC, DD+
- 💾 **File Size**: Formatted size (e.g., 2.8 GB)

## 🔧 Deployment Options

### Option 1: Vercel + Railway (Recommended)
- ✅ **24/7 automatic scraping**
- ✅ **Always fresh content**
- ✅ **~$7/month** (Railway) + Free (Vercel)
- 📖 Guide: [QUICK-START.md](QUICK-START.md)

### Option 2: Vercel + Render (100% Free)
- ✅ **Completely free**
- ⚠️ **Sleeps after 15 min** (use UptimeRobot)
- ✅ **Good for budget users**
- 📖 Guide: [QUICK-START.md](QUICK-START.md)

### Option 3: Vercel + GitHub Actions (Free)
- ✅ **100% free**
- ⚠️ **Updates every 6 hours** (not continuous)
- ✅ **No external services needed**
- 📖 Guide: [SCRAPING.md](SCRAPING.md)

### Option 4: Self-Hosted
- ✅ **Full control**
- ✅ **Continuous scraping**
- ⚠️ **Requires VPS/server**
- 📖 Guide: [DEPLOYMENT.md](DEPLOYMENT.md)

## 📚 Documentation

- **[QUICK-START.md](QUICK-START.md)** - Get 24/7 scraping in 5 minutes
- **[CONTINUOUS-SCRAPING.md](CONTINUOUS-SCRAPING.md)** - Detailed scraping setup
- **[SCRAPING.md](SCRAPING.md)** - All scraping options explained
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide for all platforms

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Or use PM2
pm2 start server.js --name tmstream
```

Server runs on `http://localhost:5000`

### Endpoints:
- `/manifest.json` - Stremio manifest
- `/catalog/:type/:id.json` - Catalog listings
- `/stream/:type/:id.json` - Stream links
- `/health` - Health check and cache stats
- `/export-cache` - Export cache data
- `/scrape` - Trigger manual scrape

## 🔑 Optional Configuration

### TorBox (Debrid Streaming)
1. Get API key from [torbox.app](https://torbox.app)
2. Add to environment: `TORBOX_API_KEY=your_key`
3. Or configure in Stremio addon settings

### Metadata Enhancement
- `OMDB_API_KEY` - Better movie metadata from [omdbapi.com](http://www.omdbapi.com/apikey.aspx)
- `FANART_API_KEY` - Posters and backgrounds from [fanart.tv](https://fanart.tv/get-an-api-key/)

## 📊 Current Status

Check live status:
- **Health**: [https://tmstream.vercel.app/health](https://tmstream.vercel.app/health)
- **Configure**: [https://tmstream.vercel.app/configure](https://tmstream.vercel.app/configure)

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## ⚠️ Disclaimer

This addon is for educational purposes only. The addon does not host any content - it only provides links to publicly available torrents. Users are responsible for ensuring they have the right to access any content.

## 🙏 Credits

- Inspired by [MediaFusion](https://github.com/mhdzumair/MediaFusion)
- Data sources: 1TamilMV, 1TamilBlasters
- Built with [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk)

---

**Made with ❤️ for Tamil content lovers**
