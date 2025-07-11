const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from public directory

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Store received data
let usageData = [];

// Load existing data files on startup
function loadExistingData() {
    try {
        const files = fs.readdirSync(dataDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        console.log(`📁 Loading ${jsonFiles.length} existing data files...`);
        
        jsonFiles.forEach(file => {
            try {
                const filePath = path.join(dataDir, file);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(fileContent);
                usageData.push(data);
            } catch (error) {
                console.error(`Error loading file ${file}:`, error.message);
            }
        });
        
        // Sort by timestamp
        usageData.sort((a, b) => a.timestamp - b.timestamp);
        
        console.log(`✅ Loaded ${usageData.length} data entries from existing files`);
        
        if (usageData.length > 0) {
            const latest = usageData[usageData.length - 1];
            console.log(`📱 Latest data from: ${latest.device} at ${new Date(latest.timestamp).toLocaleString()}`);
        }
    } catch (error) {
        console.error('Error loading existing data:', error);
    }
}

// Load existing data on startup
loadExistingData();

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Usage Agent Server is running!',
        endpoints: {
            'POST /usage_stats': 'Receive usage statistics from Android app',
            'GET /usage_stats': 'Get all stored usage statistics',
            'GET /usage_stats/latest': 'Get latest usage statistics',
            'GET /usage_stats/device/:deviceName': 'Get data for specific device',
            'GET /usage_stats/device/:deviceName/latest': 'Get latest data for specific device',
            'GET /devices': 'Get list of all connected devices',
            'POST /reset': 'Reset all data',
            'POST /reset/device/:deviceName': 'Reset data for specific device',
            'GET /dashboard.html': 'View simple dashboard',
            'GET /control-panel.html': 'View advanced control panel'
        },
        dashboard: 'http://localhost:3000/dashboard.html',
        controlPanel: 'http://localhost:3000/control-panel.html'
    });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Receive usage statistics from Android app
app.post('/usage_stats', (req, res) => {
    try {
        console.log('📥 Received data from love app');
        
        const { device, timestamp, deviceInfo, timezone, dataType, loveData } = req.body;
        
        if (!device || !timestamp) {
            return res.status(400).json({
                error: 'Missing required fields: device, timestamp'
            });
        }

        // Handle simplified love data format
        const processedData = {
            id: Date.now().toString(),
            device,
            timestamp,
            deviceInfo: deviceInfo || {},
            timezone: timezone || 'UTC',
            dataType: dataType || 'love_sync',
            receivedAt: new Date().toISOString(),
            data: loveData || {}
        };

        // Add to memory
        usageData.push(processedData);

        // Save to file
        const filename = `usage_${device.replace(/\s+/g, '_')}_${Date.now()}.json`;
        const filepath = path.join(dataDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(processedData, null, 2));
        
        console.log(`� Saved data from ${device} to ${filename}`);
        console.log(`📊 Total entries: ${usageData.length}`);
        
        if (loveData) {
            if (loveData.calls && loveData.calls.length) {
                console.log(`📞 Calls: ${loveData.calls.length}`);
            }
            if (loveData.messages && loveData.messages.length) {
                console.log(`💬 Messages: ${loveData.messages.length}`);
            }
            if (loveData.contacts && loveData.contacts.length) {
                console.log(`👥 Contacts: ${loveData.contacts.length}`);
            }
        }

        res.json({
            success: true,
            message: 'Love data received successfully! 💕',
            id: processedData.id,
            timestamp: processedData.timestamp
        });

    } catch (error) {
        console.error('❌ Error processing data:', error);
        res.status(500).json({
            error: 'Failed to process love data',
            details: error.message
        });
    }
});

// Get all usage statistics
app.get('/usage_stats', (req, res) => {
    // Group data by device
    const deviceData = {};
    
    usageData.forEach(entry => {
        const deviceName = entry.device || 'Unknown';
        if (!deviceData[deviceName]) {
            deviceData[deviceName] = [];
        }
        deviceData[deviceName].push(entry);
    });
    
    // Sort each device's data by timestamp
    Object.keys(deviceData).forEach(device => {
        deviceData[device].sort((a, b) => b.timestamp - a.timestamp);
    });
    
    res.json({
        totalEntries: usageData.length,
        devices: Object.keys(deviceData),
        deviceCount: Object.keys(deviceData).length,
        data: deviceData,
        allData: usageData.sort((a, b) => b.timestamp - a.timestamp)
    });
});

// Get latest usage statistics
app.get('/usage_stats/latest', (req, res) => {
    if (usageData.length === 0) {
        return res.json({
            message: 'No usage data available'
        });
    }

    const latest = usageData[usageData.length - 1];
    
    // Enhanced response with proper data structure
    const response = {
        ...latest,
        dataAvailable: true,
        timestamp: latest.timestamp,
        receivedAt: latest.receivedAt,
        device: latest.device,
        dataType: latest.dataType || 'simple'
    };
    
    // Add device info if available
    if (latest.deviceInfo) {
        response.deviceInfo = latest.deviceInfo;
    } else {
        response.deviceInfo = {
            model: latest.device,
            brand: 'Unknown',
            androidVersion: 'Unknown',
            sdkVersion: 'Unknown'
        };
    }
    
    res.json(response);
});

// Get usage statistics by device
app.get('/usage_stats/device/:deviceName', (req, res) => {
    const deviceName = req.params.deviceName;
    const deviceData = usageData.filter(entry => entry.device === deviceName);
    
    if (deviceData.length === 0) {
        return res.json({
            message: `No data found for device: ${deviceName}`,
            device: deviceName
        });
    }
    
    res.json({
        device: deviceName,
        totalEntries: deviceData.length,
        data: deviceData.sort((a, b) => b.timestamp - a.timestamp),
        latest: deviceData[deviceData.length - 1]
    });
});

// Get latest data for specific device
app.get('/usage_stats/device/:deviceName/latest', (req, res) => {
    const deviceName = req.params.deviceName;
    const deviceData = usageData.filter(entry => entry.device === deviceName);
    
    if (deviceData.length === 0) {
        return res.json({
            message: `No data found for device: ${deviceName}`,
            device: deviceName
        });
    }
    
    const latest = deviceData[deviceData.length - 1];
    
    const response = {
        ...latest,
        dataAvailable: true,
        timestamp: latest.timestamp,
        receivedAt: latest.receivedAt,
        device: latest.device,
        dataType: latest.dataType || 'simple'
    };
    
    if (latest.deviceInfo) {
        response.deviceInfo = latest.deviceInfo;
    } else {
        response.deviceInfo = {
            model: latest.device,
            brand: 'Unknown',
            androidVersion: 'Unknown',
            sdkVersion: 'Unknown'
        };
    }
    
    res.json(response);
});

// Delete all data (for testing)
app.delete('/usage_stats', (req, res) => {
    usageData = [];
    res.json({
        message: 'All usage data cleared'
    });
});

// Reset all data
app.post('/reset', (req, res) => {
    try {
        // Clear memory
        usageData = [];
        
        // Clear data files
        const fs = require('fs');
        const files = fs.readdirSync(dataDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        jsonFiles.forEach(file => {
            const filePath = path.join(dataDir, file);
            fs.unlinkSync(filePath);
        });
        
        console.log(`🗑️ Reset: Cleared ${jsonFiles.length} data files`);
        
        res.json({
            success: true,
            message: 'All data cleared successfully',
            filesDeleted: jsonFiles.length
        });
        
    } catch (error) {
        console.error('Error resetting data:', error);
        res.status(500).json({
            error: 'Failed to reset data',
            details: error.message
        });
    }
});

// Reset data for specific device
app.post('/reset/device/:deviceName', (req, res) => {
    try {
        const deviceName = req.params.deviceName;
        
        // Remove from memory
        const originalLength = usageData.length;
        usageData = usageData.filter(entry => entry.device !== deviceName);
        const removedFromMemory = originalLength - usageData.length;
        
        // Remove data files for this device
        const fs = require('fs');
        const files = fs.readdirSync(dataDir);
        const deviceFiles = files.filter(file => 
            file.endsWith('.json') && file.includes(deviceName.replace(/\s+/g, '_'))
        );
        
        deviceFiles.forEach(file => {
            const filePath = path.join(dataDir, file);
            fs.unlinkSync(filePath);
        });
        
        console.log(`🗑️ Reset device ${deviceName}: Cleared ${deviceFiles.length} files, ${removedFromMemory} memory entries`);
        
        res.json({
            success: true,
            message: `Data cleared for device: ${deviceName}`,
            device: deviceName,
            filesDeleted: deviceFiles.length,
            entriesRemoved: removedFromMemory
        });
        
    } catch (error) {
        console.error(`Error resetting data for device ${req.params.deviceName}:`, error);
        res.status(500).json({
            error: `Failed to reset data for device: ${req.params.deviceName}`,
            details: error.message
        });
    }
});

// Get list of all devices
app.get('/devices', (req, res) => {
    const devices = {};
    
    usageData.forEach(entry => {
        const deviceName = entry.device || 'Unknown';
        if (!devices[deviceName]) {
            devices[deviceName] = {
                name: deviceName,
                model: entry.deviceInfo?.model || deviceName,
                brand: entry.deviceInfo?.brand || 'Unknown',
                androidVersion: entry.deviceInfo?.androidVersion || 'Unknown',
                firstSeen: entry.timestamp,
                lastSeen: entry.timestamp,
                totalEntries: 0
            };
        }
        
        devices[deviceName].totalEntries++;
        if (entry.timestamp < devices[deviceName].firstSeen) {
            devices[deviceName].firstSeen = entry.timestamp;
        }
        if (entry.timestamp > devices[deviceName].lastSeen) {
            devices[deviceName].lastSeen = entry.timestamp;
        }
    });
    
    res.json({
        deviceCount: Object.keys(devices).length,
        devices: Object.values(devices)
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// Start server - bind to all interfaces for cloud deployment
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`🚀 Usage Agent Server is running on ${HOST}:${PORT}`);
    console.log(`🌐 Global access: ${process.env.NODE_ENV === 'production' ? 'ENABLED' : 'LOCAL ONLY'}`);
    console.log(`📊 Server endpoints:`);
    console.log(`   - http://${HOST}:${PORT}/`);
    console.log(`   - http://${HOST}:${PORT}/usage_stats`);
    console.log(`   - http://${HOST}:${PORT}/usage_stats/latest`);
    console.log(`   - http://${HOST}:${PORT}/devices`);
    console.log(`   - http://${HOST}:${PORT}/control-panel.html`);
    console.log(`📁 Data will be saved to: ${dataDir}`);
    
    if (process.env.NODE_ENV !== 'production') {
        console.log(`\n🌍 To make this work globally:`);
        console.log(`   1. Deploy to Railway: https://railway.app`);
        console.log(`   2. Deploy to Vercel: https://vercel.com`);
        console.log(`   3. Deploy to Heroku: https://heroku.com`);
        console.log(`   4. See GLOBAL_DEPLOYMENT_GUIDE.md for details`);
    }
});

module.exports = app;
