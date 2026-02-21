const fs = require('fs');

module.exports = {
    // ===== BOT BASIC INFO =====
    BOT_NAME: '𝐒𝐇𝐀𝐍𝐔𝐖𝐀 𝐌𝐈𝐍𝐈 𝐕2',
    OWNER_NAME: '𝐒𝐡𝐚𝐧𝐮𝐤𝐚 𝐒𝐡𝐚𝐦𝐞𝐞𝐧',
    OWNER_NUMBER: '94724389699',
    BOT_VERSION: '6.0.0',
    BOT_FOOTER: '> 𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝐒𝐇𝐀𝐍𝐔𝐖𝐀 𝐌𝐈𝐍𝐈',
    PREFIX: '.',

    // ===== SOCIAL LINKS =====
    GROUP_LINK: 'https://chat.whatsapp.com/GnYQAKjoW8QD0vZL5abDk7',
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029VbCMX3K7j6fxob6STf3C',

    // ===== AUTO FEATURES =====
    AUTO_VIEW_STATUS: true,
    AUTO_LIKE_STATUS: true,
    AUTO_RECORDING: true,
    AUTO_LIKE_EMOJI: ['🔥', '❤️', '🥰', '💋', '✨', '🌟', '💫', '⭐', '💙', '💜', '🩷', '🧡', '💚'],

    // ===== DATABASE (MongoDB) =====
    MONGO_URI: process.env.MONGO_URI || 'mongodb+srv://nilapuldiluinda_db_user:Rad02JiIM4PtOxR2@cluster0.xdfsht7.mongodb.net/?appName=Cluster0',
    MONGO_DB_NAME: 'shanuwav2',

    // ===== ADMIN & SESSION =====
    MAX_RETRIES: 3,
    SESSION_TIMEOUT: 300000, // 5 minutes
    
    // ===== IMAGES & MEDIA =====
    MENU_IMAGE: 'https://i.imgur.com/your-menu-image.jpg',
    ALIVE_IMAGE: 'https://i.imgur.com/your-alive-image.jpg',
    WELCOME_IMAGE: 'https://i.imgur.com/your-welcome-image.jpg',
    GOODBYE_IMAGE: 'https://i.imgur.com/your-goodbye-image.jpg',
    
    // ===== API KEYS =====
    GEMINI_API_KEY: 'AIzaSyB6ZQwLHZFHxDCbBFJtc0GIN2ypdlga4vw',
    OPENWEATHER_API_KEY: '2d61a72574c11c4f36173b627f8cb177',
    
    // ===== SYSTEM =====
    TIMEZONE: 'Asia/Colombo',
    LANG: 'si', // si = Sinhala, en = English
};