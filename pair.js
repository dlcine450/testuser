const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const router = express.Router();
const pino = require('pino');
const moment = require('moment-timezone');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    getContentType,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    downloadContentFromMessage,
    DisconnectReason,
    Browsers
} = require('baileys');

// ==================== CONFIG ====================
const config = {
    BOT_NAME: '𝐒𝐇𝐀𝐍𝐔𝐖𝐀 𝐌𝐈𝐍𝐈 𝐕2',
    OWNER_NAME: '𝐒𝐡𝐚𝐧𝐮𝐤𝐚 𝐒𝐡𝐚𝐦𝐞𝐞𝐧',
    OWNER_NUMBER: '94724389699',
    BOT_VERSION: '6.0.0',
    BOT_FOOTER: '> 𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝐒𝐇𝐀𝐍𝐔𝐖𝐀 𝐌𝐈𝐍𝐈',
    PREFIX: '.',
    GROUP_LINK: 'https://chat.whatsapp.com/GnYQAKjoW8QD0vZL5abDk7',
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029VbCMX3K7j6fxob6STf3C',
    AUTO_VIEW_STATUS: true,
    AUTO_LIKE_STATUS: true,
    AUTO_RECORDING: true,
    AUTO_LIKE_EMOJI: ['🔥', '❤️', '🥰', '💋', '✨', '🌟', '💫'],
    MONGO_URI: process.env.MONGO_URI || 'mongodb+srv://nilapuldiluinda_db_user:Rad02JiIM4PtOxR2@cluster0.xdfsht7.mongodb.net/?appName=Cluster0',
    MONGO_DB_NAME: 'shanuwav2',
    GEMINI_API_KEY: 'AIzaSyB6ZQwLHZFHxDCbBFJtc0GIN2ypdlga4vw',
    OPENWEATHER_API_KEY: '2d61a72574c11c4f36173b627f8cb177',
    TIMEZONE: 'Asia/Colombo',
    MENU_IMAGE: 'https://i.imgur.com/menu-image.jpg',
    ALIVE_IMAGE: 'https://i.imgur.com/alive-image.jpg',
    MAX_RETRIES: 3
};

// ==================== MONGO SETUP ====================
let mongoClient, mongoDB;
let sessionsCol, numbersCol, adminsCol, configsCol;

async function initMongo() {
    try {
        if (mongoClient && mongoClient.topology && mongoClient.topology.isConnected) return;
        
        mongoClient = new MongoClient(config.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        await mongoClient.connect();
        mongoDB = mongoClient.db(config.MONGO_DB_NAME);
        
        sessionsCol = mongoDB.collection('sessions');
        numbersCol = mongoDB.collection('numbers');
        adminsCol = mongoDB.collection('admins');
        configsCol = mongoDB.collection('configs');
        
        console.log('✅ MongoDB Connected Successfully');
    } catch (e) {
        console.error('❌ MongoDB Connection Error:', e);
    }
}

// ==================== MONGO FUNCTIONS ====================
async function saveCredsToMongo(number, creds) {
    try {
        await initMongo();
        const sanitized = number.replace(/[^0-9]/g, '');
        await sessionsCol.updateOne(
            { number: sanitized },
            { $set: { creds, updatedAt: new Date() } },
            { upsert: true }
        );
    } catch (e) {
        console.error('saveCredsToMongo error:', e);
    }
}

async function loadCredsFromMongo(number) {
    try {
        await initMongo();
        const sanitized = number.replace(/[^0-9]/g, '');
        return await sessionsCol.findOne({ number: sanitized });
    } catch (e) {
        console.error('loadCredsFromMongo error:', e);
        return null;
    }
}

async function removeSessionFromMongo(number) {
    try {
        await initMongo();
        const sanitized = number.replace(/[^0-9]/g, '');
        await sessionsCol.deleteOne({ number: sanitized });
    } catch (e) {
        console.error('removeSessionFromMongo error:', e);
    }
}

async function addNumberToMongo(number) {
    try {
        await initMongo();
        const sanitized = number.replace(/[^0-9]/g, '');
        await numbersCol.updateOne(
            { number: sanitized },
            { $set: { number: sanitized, addedAt: new Date() } },
            { upsert: true }
        );
    } catch (e) {
        console.error('addNumberToMongo error:', e);
    }
}

async function getAllNumbersFromMongo() {
    try {
        await initMongo();
        const docs = await numbersCol.find({}).toArray();
        return docs.map(d => d.number);
    } catch (e) {
        console.error('getAllNumbersFromMongo error:', e);
        return [];
    }
}

async function addAdminToMongo(jid) {
    try {
        await initMongo();
        await adminsCol.updateOne(
            { jid },
            { $set: { jid, addedAt: new Date() } },
            { upsert: true }
        );
    } catch (e) {
        console.error('addAdminToMongo error:', e);
    }
}

async function removeAdminFromMongo(jid) {
    try {
        await initMongo();
        await adminsCol.deleteOne({ jid });
    } catch (e) {
        console.error('removeAdminFromMongo error:', e);
    }
}

async function loadAdminsFromMongo() {
    try {
        await initMongo();
        const docs = await adminsCol.find({}).toArray();
        return docs.map(d => d.jid);
    } catch (e) {
        console.error('loadAdminsFromMongo error:', e);
        return [];
    }
}

async function saveConfigToMongo(number, botConfig) {
    try {
        await initMongo();
        const sanitized = number.replace(/[^0-9]/g, '');
        await configsCol.updateOne(
            { number: sanitized },
            { $set: { config: botConfig, updatedAt: new Date() } },
            { upsert: true }
        );
    } catch (e) {
        console.error('saveConfigToMongo error:', e);
    }
}

async function loadConfigFromMongo(number) {
    try {
        await initMongo();
        const sanitized = number.replace(/[^0-9]/g, '');
        const doc = await configsCol.findOne({ number: sanitized });
        return doc ? doc.config : null;
    } catch (e) {
        console.error('loadConfigFromMongo error:', e);
        return null;
    }
}

// ==================== UTILITY FUNCTIONS ====================
function getTimeStamp() {
    return moment().tz(config.TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
}

function formatMessage(title, content, footer = config.BOT_FOOTER) {
    return `*${title}*\n\n${content}\n\n${footer}`;
}

function extractYouTubeId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function downloadQuotedMedia(quoted) {
    if (!quoted) return null;
    
    const qTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
    const qType = qTypes.find(t => quoted[t]);
    if (!qType) return null;
    
    const messageType = qType.replace(/Message$/i, '').toLowerCase();
    const stream = await downloadContentFromMessage(quoted[qType], messageType);
    
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    
    return {
        buffer,
        mime: quoted[qType].mimetype || '',
        caption: quoted[qType].caption || quoted[qType].fileName || '',
        fileName: quoted[qType].fileName || ''
    };
}

// ==================== ACTIVE SESSIONS MAP ====================
const activeSockets = new Map();
const socketCreationTime = new Map();

// ==================== JOIN GROUP FUNCTION ====================
async function joinGroup(socket) {
    try {
        const inviteCodeMatch = config.GROUP_LINK.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/);
        if (!inviteCodeMatch) return { status: 'failed', error: 'Invalid group link' };
        
        const inviteCode = inviteCodeMatch[1];
        const response = await socket.groupAcceptInvite(inviteCode);
        
        if (response) {
            return { status: 'success', gid: response };
        } else {
            return { status: 'failed', error: 'Could not join group' };
        }
    } catch (error) {
        return { status: 'failed', error: error.message };
    }
}

// ==================== STATUS HANDLERS ====================
function setupStatusHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg?.key || msg.key.remoteJid !== 'status@broadcast') return;
        
        try {
            if (config.AUTO_RECORDING) {
                await socket.sendPresenceUpdate('recording', msg.key.remoteJid);
            }
            
            if (config.AUTO_VIEW_STATUS) {
                await socket.readMessages([msg.key]);
            }
            
            if (config.AUTO_LIKE_STATUS) {
                const randomEmoji = config.AUTO_LIKE_EMOJI[Math.floor(Math.random() * config.AUTO_LIKE_EMOJI.length)];
                await socket.sendMessage(msg.key.remoteJid, {
                    react: { text: randomEmoji, key: msg.key }
                });
            }
        } catch (error) {
            console.error('Status handler error:', error);
        }
    });
}

// ==================== COMMAND HANDLERS ====================
function setupCommandHandlers(socket, sessionNumber) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg?.message || msg.key.remoteJid === 'status@broadcast') return;
        
        // Get message content
        const type = getContentType(msg.message);
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || from;
        const senderNumber = sender.split('@')[0];
        const isOwner = senderNumber === config.OWNER_NUMBER.replace(/[^0-9]/g, '');
        
        let body = '';
        if (type === 'conversation') body = msg.message.conversation;
        else if (type === 'extendedTextMessage') body = msg.message.extendedTextMessage.text;
        else if (type === 'imageMessage') body = msg.message.imageMessage.caption;
        else if (type === 'videoMessage') body = msg.message.videoMessage.caption;
        
        if (!body || !body.startsWith(config.PREFIX)) return;
        
        const args = body.slice(config.PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        // Load user config
        const userConfig = await loadConfigFromMongo(sessionNumber) || {};
        const botName = userConfig.botName || config.BOT_NAME;
        
        // ==================== COMMANDS ====================
        try {
            switch (command) {
                // ===== BASIC COMMANDS =====
                case 'menu':
                case 'help': {
                    await socket.sendMessage(from, { react: { text: '📋', key: msg.key } });
                    
                    const uptime = Math.floor((Date.now() - (socketCreationTime.get(sessionNumber) || Date.now())) / 1000);
                    const hours = Math.floor(uptime / 3600);
                    const minutes = Math.floor((uptime % 3600) / 60);
                    
                    const menuText = `
╭─❏ *${botName}* ❏─╮
│ 👑 *Owner*: ${config.OWNER_NAME}
│ 📞 *Number*: ${config.OWNER_NUMBER}
│ ⏱️ *Uptime*: ${hours}h ${minutes}m
│ 📦 *Version*: ${config.BOT_VERSION}
╰─────────────❏

━━━━━━❰ *📋 MENU* ❱━━━━━━

╭─❏ *🤖 AI COMMANDS* ❏─╮
│ • ${config.PREFIX}ai [question]
│ • ${config.PREFIX}aiimg [prompt]
│ • ${config.PREFIX}gemini [question]
╰─────────────❏

╭─❏ *📥 DOWNLOAD* ❏─╮
│ • ${config.PREFIX}song [name/url]
│ • ${config.PREFIX}video [name/url]
│ • ${config.PREFIX}tiktok [url]
│ • ${config.PREFIX}fb [url]
│ • ${config.PREFIX}ig [url]
│ • ${config.PREFIX}yt [url]
╰─────────────❏

╭─❏ *🎨 CREATIVE* ❏─╮
│ • ${config.PREFIX}sticker [reply]
│ • ${config.PREFIX}emojimix [emoji1+emoji2]
│ • ${config.PREFIX}quotely [text]
╰─────────────❏

╭─❏ *🔧 TOOLS* ❏─╮
│ • ${config.PREFIX}weather [city]
│ • ${config.PREFIX}translate [text]
│ • ${config.PREFIX}define [word]
│ • ${config.PREFIX}calc [expression]
╰─────────────❏

╭─❏ *📊 INFO* ❏─╮
│ • ${config.PREFIX}ping
│ • ${config.PREFIX}alive
│ • ${config.PREFIX}owner
│ • ${config.PREFIX}uptime
╰─────────────❏

╭─❏ *👥 GROUP* ❏─╮
│ • ${config.PREFIX}tagall [message]
│ • ${config.PREFIX}hidetag [message]
│ • ${config.PREFIX}link
│ • ${config.PREFIX}listadmin
╰─────────────❏

╭─❏ *📰 NEWS* ❏─╮
│ • ${config.PREFIX}adanews
│ • ${config.PREFIX}sirasanews
│ • ${config.PREFIX}gossip
╰─────────────❏

╭─❏ *⚙️ SETTINGS* ❏─╮
│ • ${config.PREFIX}setname [name]
│ • ${config.PREFIX}setprefix [symbol]
│ • ${config.PREFIX}autoview [on/off]
╰─────────────❏

> ${config.BOT_FOOTER}
`.trim();
                    
                    await socket.sendMessage(from, {
                        image: { url: config.MENU_IMAGE },
                        caption: menuText
                    }, { quoted: msg });
                    break;
                }
                
                case 'alive': {
                    await socket.sendMessage(from, { react: { text: '💚', key: msg.key } });
                    
                    const uptime = Math.floor((Date.now() - (socketCreationTime.get(sessionNumber) || Date.now())) / 1000);
                    const hours = Math.floor(uptime / 3600);
                    const minutes = Math.floor((uptime % 3600) / 60);
                    
                    const aliveText = `
╭─❏ *🤖 BOT STATUS* ❏─╮
│ 📛 *Name*: ${botName}
│ 👑 *Owner*: ${config.OWNER_NAME}
│ ⏱️ *Uptime*: ${hours}h ${minutes}m
│ 📊 *Version*: ${config.BOT_VERSION}
│ 🌐 *Platform*: ${process.env.PLATFORM || 'Local'}
╰─────────────❏

📢 *Channel*: ${config.CHANNEL_LINK}
👥 *Group*: ${config.GROUP_LINK}

✨ *I'm alive and ready to serve you!*
`.trim();
                    
                    await socket.sendMessage(from, {
                        image: { url: config.ALIVE_IMAGE },
                        caption: aliveText
                    }, { quoted: msg });
                    break;
                }
                
                case 'ping': {
                    const start = Date.now();
                    await socket.sendMessage(from, { text: '🏓 *Pinging...*' }, { quoted: msg });
                    const end = Date.now();
                    const latency = end - start;
                    
                    await socket.sendMessage(from, {
                        text: `🏓 *Pong!*\n📡 *Latency*: ${latency}ms\n🕒 *Time*: ${getTimeStamp()}`
                    }, { quoted: msg });
                    break;
                }
                
                case 'owner': {
                    const vcard = 
                        'BEGIN:VCARD\n' +
                        'VERSION:3.0\n' +
                        `FN:${config.OWNER_NAME}\n` +
                        `TEL;type=CELL;type=VOICE;waid=${config.OWNER_NUMBER}:+${config.OWNER_NUMBER}\n` +
                        'END:VCARD';
                    
                    await socket.sendMessage(from, {
                        contacts: {
                            displayName: config.OWNER_NAME,
                            contacts: [{ vcard }]
                        }
                    }, { quoted: msg });
                    
                    await socket.sendMessage(from, {
                        text: `👑 *Owner Information*\n\n📛 *Name*: ${config.OWNER_NAME}\n📞 *Number*: wa.me/${config.OWNER_NUMBER}\n📢 *Channel*: ${config.CHANNEL_LINK}\n👥 *Group*: ${config.GROUP_LINK}`
                    }, { quoted: msg });
                    break;
                }
                
                // ===== AI COMMANDS =====
                case 'ai':
                case 'gemini': {
                    const query = args.join(' ');
                    if (!query) {
                        return await socket.sendMessage(from, {
                            text: '❌ *Please provide a question!*\n\nExample: `.ai What is WhatsApp bot?`'
                        }, { quoted: msg });
                    }
                    
                    await socket.sendMessage(from, { react: { text: '🤖', key: msg.key } });
                    await socket.sendMessage(from, { text: '⏳ *Thinking...*' }, { quoted: msg });
                    
                    try {
                        const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
                        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
                        const result = await model.generateContent(query);
                        const response = result.response.text();
                        
                        await socket.sendMessage(from, {
                            text: `🤖 *AI Response*\n\n${response}\n\n> Powered by Gemini AI`
                        }, { quoted: msg });
                    } catch (error) {
                        console.error('AI Error:', error);
                        await socket.sendMessage(from, {
                            text: '❌ *AI service error. Please try again later.*'
                        }, { quoted: msg });
                    }
                    break;
                }
                
                case 'aiimg': {
                    const prompt = args.join(' ');
                    if (!prompt) {
                        return await socket.sendMessage(from, {
                            text: '❌ *Please provide a prompt!*\n\nExample: `.aiimg beautiful sunset`'
                        }, { quoted: msg });
                    }
                    
                    await socket.sendMessage(from, { react: { text: '🎨', key: msg.key } });
                    await socket.sendMessage(from, { text: '⏳ *Generating image...*' }, { quoted: msg });
                    
                    try {
                        const response = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`, {
                            responseType: 'arraybuffer'
                        });
                        
                        await socket.sendMessage(from, {
                            image: Buffer.from(response.data),
                            caption: `🎨 *AI Generated Image*\n\n📝 *Prompt*: ${prompt}\n\n> Powered by Pollinations AI`
                        }, { quoted: msg });
                    } catch (error) {
                        console.error('AI Image Error:', error);
                        await socket.sendMessage(from, {
                            text: '❌ *Failed to generate image. Try again later.*'
                        }, { quoted: msg });
                    }
                    break;
                }
                
                // ===== DOWNLOAD COMMANDS =====
                case 'song':
                case 'ytmp3': {
                    const query = args.join(' ');
                    if (!query) {
                        return await socket.sendMessage(from, {
                            text: '❌ *Please provide a song name or YouTube URL!*\n\nExample: `.song shape of you`'
                        }, { quoted: msg });
                    }
                    
                    await socket.sendMessage(from, { react: { text: '🎵', key: msg.key } });
                    await socket.sendMessage(from, { text: '⏳ *Searching and downloading...*' }, { quoted: msg });
                    
                    try {
                        let videoUrl = query;
                        if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
                            const searchRes = await axios.get(`https://weeb-api.vercel.app/ytsearch?query=${encodeURIComponent(query)}`);
                            if (!searchRes.data || !searchRes.data.length) throw new Error('No results');
                            videoUrl = `https://youtube.com/watch?v=${searchRes.data[0].id}`;
                        }
                        
                        const apiUrl = `https://weeb-api.vercel.app/ytmp3?url=${encodeURIComponent(videoUrl)}`;
                        const response = await axios.get(apiUrl);
                        
                        if (!response.data || !response.data.link) throw new Error('Download link not found');
                        
                        await socket.sendMessage(from, {
                            audio: { url: response.data.link },
                            mimetype: 'audio/mp4',
                            fileName: `${response.data.title || 'song'}.mp3`
                        }, { quoted: msg });
                    } catch (error) {
                        console.error('Song download error:', error);
                        await socket.sendMessage(from, {
                            text: '❌ *Failed to download song. Try again later.*'
                        }, { quoted: msg });
                    }
                    break;
                }
                
                case 'video':
                case 'ytmp4': {
                    const query = args.join(' ');
                    if (!query) {
                        return await socket.sendMessage(from, {
                            text: '❌ *Please provide a video name or YouTube URL!*\n\nExample: `.video funny cats`'
                        }, { quoted: msg });
                    }
                    
                    await socket.sendMessage(from, { react: { text: '🎬', key: msg.key } });
                    await socket.sendMessage(from, { text: '⏳ *Searching and downloading...*' }, { quoted: msg });
                    
                    try {
                        let videoUrl = query;
                        if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
                            const searchRes = await axios.get(`https://weeb-api.vercel.app/ytsearch?query=${encodeURIComponent(query)}`);
                            if (!searchRes.data || !searchRes.data.length) throw new Error('No results');
                            videoUrl = `https://youtube.com/watch?v=${searchRes.data[0].id}`;
                        }
                        
                        const apiUrl = `https://weeb-api.vercel.app/ytmp4?url=${encodeURIComponent(videoUrl)}`;
                        const response = await axios.get(apiUrl);
                        
                        if (!response.data || !response.data.link) throw new Error('Download link not found');
                        
                        await socket.sendMessage(from, {
                            video: { url: response.data.link },
                            caption: `🎬 *${response.data.title || 'Video'}*\n\n> Downloaded by ${botName}`
                        }, { quoted: msg });
                    } catch (error) {
                        console.error('Video download error:', error);
                        await socket.sendMessage(from, {
                            text: '❌ *Failed to download video. Try again later.*'
                        }, { quoted: msg });
                    }
                    break;
                }
                
                case 'tiktok':
                case 'tt': {
                    const url = args[0];
                    if (!url || !url.includes('tiktok.com')) {
                        return await socket.sendMessage(from, {
                            text: '❌ *Please provide a valid TikTok URL!*\n\nExample: `.tiktok https://tiktok.com/@user/video/123456`'
                        }, { quoted: msg });
                    }
                    
                    await socket.sendMessage(from, { react: { text: '🎵', key: msg.key } });
                    await socket.sendMessage(from, { text: '⏳ *Downloading TikTok video...*' }, { quoted: msg });
                    
                    try {
                        const response = await axios.get(`https://weeb-api.vercel.app/tiktok?url=${encodeURIComponent(url)}`);
                        
                        if (!response.data || !response.data.video) throw new Error('Download failed');
                        
                        await socket.sendMessage(from, {
                            video: { url: response.data.video },
                            caption: `🎵 *TikTok Video*\n\n👤 *Author*: ${response.data.author || 'Unknown'}\n💬 *Caption*: ${response.data.title || ''}\n\n> Downloaded by ${botName}`
                        }, { quoted: msg });
                    } catch (error) {
                        console.error('TikTok download error:', error);
                        await socket.sendMessage(from, {
                            text: '❌ *Failed to download TikTok video. Try again later.*'
                        }, { quoted: msg });
                    }
                    break;
                }
                
                // ===== WEATHER COMMAND =====
                case 'weather': {
                    const city = args.join(' ');
                    if (!city) {
                        return await socket.sendMessage(from, {
                            text: '❌ *Please provide a city name!*\n\nExample: `.weather Colombo`'
                        }, { quoted: msg });
                    }
                    
                    await socket.sendMessage(from, { react: { text: '🌤️', key: msg.key } });
                    
                    try {
                        const response = await axios.get(
                            `http://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${config.OPENWEATHER_API_KEY}&units=metric`
                        );
                        
                        const data = response.data;
                        const weatherText = `
╭─❏ *🌤️ WEATHER REPORT* ❏─╮
│ 📍 *City*: ${data.name}, ${data.sys.country}
│ 🌡️ *Temp*: ${data.main.temp}°C
│ 🤔 *Feels Like*: ${data.main.feels_like}°C
│ 💧 *Humidity*: ${data.main.humidity}%
│ 🌬️ *Wind*: ${data.wind.speed} m/s
│ ☁️ *Weather*: ${data.weather[0].main}
│ 📝 *Description*: ${data.weather[0].description}
╰─────────────❏
`.trim();
                        
                        await socket.sendMessage(from, { text: weatherText }, { quoted: msg });
                    } catch (error) {
                        console.error('Weather error:', error);
                        await socket.sendMessage(from, {
                            text: '❌ *City not found or API error. Try again.*'
                        }, { quoted: msg });
                    }
                    break;
                }
                
                // ===== STICKER COMMAND =====
                case 'sticker':
                case 's': {
                    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
                        return await socket.sendMessage(from, {
                            text: '❌ *Please reply to an image or video!*\n\nExample: Reply to an image with `.sticker`'
                        }, { quoted: msg });
                    }
                    
                    await socket.sendMessage(from, { react: { text: '🎨', key: msg.key } });
                    await socket.sendMessage(from, { text: '⏳ *Creating sticker...*' }, { quoted: msg });
                    
                    try {
                        const media = await downloadQuotedMedia(quoted);
                        if (!media) throw new Error('Failed to download media');
                        
                        await socket.sendMessage(from, {
                            sticker: media.buffer
                        }, { quoted: msg });
                    } catch (error) {
                        console.error('Sticker error:', error);
                        await socket.sendMessage(from, {
                            text: '❌ *Failed to create sticker. Try again.*'
                        }, { quoted: msg });
                    }
                    break;
                }
                
                // ===== GROUP COMMANDS =====
                case 'tagall': {
                    if (!from.endsWith('@g.us')) {
                        return await socket.sendMessage(from, {
                            text: '❌ *This command only works in groups!*'
                        }, { quoted: msg });
                    }
                    
                    const message = args.join(' ') || '📢 *Attention everyone!*';
                    
                    try {
                        const groupMetadata = await socket.groupMetadata(from);
                        const participants = groupMetadata.participants;
                        const mentions = participants.map(p => p.id);
                        
                        let text = `╭─❏ *📢 GROUP ANNOUNCEMENT* ❏─╮\n│ 💬 *Message*: ${message}\n│ 👥 *Members*: ${participants.length}\n╰─────────────❏\n\n`;
                        
                        participants.forEach((p, i) => {
                            text += `${i + 1}. @${p.id.split('@')[0]}\n`;
                        });
                        
                        await socket.sendMessage(from, {
                            text: text,
                            mentions: mentions
                        }, { quoted: msg });
                    } catch (error) {
                        console.error('Tagall error:', error);
                        await socket.sendMessage(from, {
                            text: '❌ *Failed to tag all members.*'
                        }, { quoted: msg });
                    }
                    break;
                }
                
                // ===== ADMIN COMMANDS =====
                case 'addadmin': {
                    if (!isOwner) {
                        return await socket.sendMessage(from, {
                            text: '❌ *Only owner can use this command!*'
                        }, { quoted: msg });
                    }
                    
                    const target = args[0];
                    if (!target) {
                        return await socket.sendMessage(from, {
                            text: '❌ *Please provide a number!*\n\nExample: `.addadmin 94724389699`'
                        }, { quoted: msg });
                    }
                    
                    const jid = target.includes('@') ? target : `${target.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
                    await addAdminToMongo(jid);
                    
                    await socket.sendMessage(from, {
                        text: `✅ *Admin added successfully!*\n\n📱 *JID*: ${jid}`
                    }, { quoted: msg });
                    break;
                }
                
                case 'deladmin': {
                    if (!isOwner) {
                        return await socket.sendMessage(from, {
                            text: '❌ *Only owner can use this command!*'
                        }, { quoted: msg });
                    }
                    
                    const target = args[0];
                    if (!target) {
                        return await socket.sendMessage(from, {
                            text: '❌ *Please provide a number!*\n\nExample: `.deladmin 94724389699`'
                        }, { quoted: msg });
                    }
                    
                    const jid = target.includes('@') ? target : `${target.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
                    await removeAdminFromMongo(jid);
                    
                    await socket.sendMessage(from, {
                        text: `✅ *Admin removed successfully!*\n\n📱 *JID*: ${jid}`
                    }, { quoted: msg });
                    break;
                }
                
                case 'listadmin': {
                    const admins = await loadAdminsFromMongo();
                    
                    if (!admins || admins.length === 0) {
                        return await socket.sendMessage(from, {
                            text: '📭 *No admins found.*'
                        }, { quoted: msg });
                    }
                    
                    let text = '╭─❏ *👑 ADMIN LIST* ❏─╮\n';
                    admins.forEach((admin, i) => {
                        text += `│ ${i + 1}. ${admin}\n`;
                    });
                    text += '╰─────────────❏';
                    
                    await socket.sendMessage(from, { text }, { quoted: msg });
                    break;
                }
                
                // ===== SETTINGS COMMANDS =====
                case 'setname': {
                    if (senderNumber !== sessionNumber && !isOwner) {
                        return await socket.sendMessage(from, {
                            text: '❌ *Only session owner can change bot name!*'
                        }, { quoted: msg });
                    }
                    
                    const newName = args.join(' ');
                    if (!newName) {
                        return await socket.sendMessage(from, {
                            text: '❌ *Please provide a name!*\n\nExample: `.setname SHANUWA BOT V2`'
                        }, { quoted: msg });
                    }
                    
                    const userConfig = await loadConfigFromMongo(sessionNumber) || {};
                    userConfig.botName = newName;
                    await saveConfigToMongo(sessionNumber, userConfig);
                    
                    await socket.sendMessage(from, {
                        text: `✅ *Bot name updated!*\n\n📛 *New Name*: ${newName}`
                    }, { quoted: msg });
                    break;
                }
                
                // ===== DEFAULT =====
                default:
                    // Unknown command - ignore
                    break;
            }
        } catch (error) {
            console.error('Command error:', error);
            await socket.sendMessage(from, {
                text: '❌ *An error occurred while processing your command.*'
            }, { quoted: msg });
        }
    });
}

// ==================== AUTO RESTART HANDLER ====================
function setupAutoRestart(socket, number) {
    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const isLoggedOut = statusCode === 401;
            
            if (isLoggedOut) {
                console.log(`User ${number} logged out. Cleaning up...`);
                await removeSessionFromMongo(number);
                activeSockets.delete(number);
                socketCreationTime.delete(number);
            } else {
                console.log(`Connection closed for ${number}. Reconnecting...`);
                await delay(5000);
                activeSockets.delete(number);
                socketCreationTime.delete(number);
            }
        }
    });
}

// ==================== PAIRING FUNCTION ====================
async function createSession(number, res) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(os.tmpdir(), `session_${sanitizedNumber}`);
    
    // Load from MongoDB if exists
    try {
        const mongoDoc = await loadCredsFromMongo(sanitizedNumber);
        if (mongoDoc?.creds) {
            fs.ensureDirSync(sessionPath);
            fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(mongoDoc.creds, null, 2));
        }
    } catch (e) {
        console.warn('Failed to load from MongoDB:', e);
    }
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const logger = pino({ level: 'fatal' });
    
    try {
        const socket = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            printQRInTerminal: false,
            logger,
            browser: Browsers.ubuntu('Chrome')
        });
        
        socketCreationTime.set(sanitizedNumber, Date.now());
        
        // Setup handlers
        setupStatusHandlers(socket);
        setupCommandHandlers(socket, sanitizedNumber);
        setupAutoRestart(socket, sanitizedNumber);
        
        // Save creds to MongoDB
        socket.ev.on('creds.update', async () => {
            try {
                await saveCreds();
                const credsFile = await fs.readFile(path.join(sessionPath, 'creds.json'), 'utf8');
                await saveCredsToMongo(sanitizedNumber, JSON.parse(credsFile));
            } catch (e) {
                console.error('Failed to save creds:', e);
            }
        });
        
        // Generate pairing code if not registered
        if (!socket.authState.creds.registered) {
            let code;
            for (let i = 0; i < config.MAX_RETRIES; i++) {
                try {
                    await delay(1500);
                    code = await socket.requestPairingCode(sanitizedNumber);
                    break;
                } catch (e) {
                    if (i === config.MAX_RETRIES - 1) throw e;
                    await delay(2000);
                }
            }
            
            if (!res.headersSent) {
                res.json({ code });
            }
        }
        
        // Connection open handler
        socket.ev.on('connection.update', async (update) => {
            const { connection } = update;
            
            if (connection === 'open') {
                try {
                    await delay(3000);
                    
                    // Join group
                    await joinGroup(socket);
                    
                    // Add to active sessions
                    activeSockets.set(sanitizedNumber, socket);
                    await addNumberToMongo(sanitizedNumber);
                    
                    // Send welcome message
                    const userJid = jidNormalizedUser(socket.user.id);
                    const welcomeMsg = formatMessage(
                        '🎉 *Welcome to SHANUWA MINI BOT!*',
                        `✅ *Successfully Connected!*\n\n📱 *Number*: ${sanitizedNumber}\n🕒 *Time*: ${getTimeStamp()}\n\nType *${config.PREFIX}menu* to see all commands.`,
                        config.BOT_FOOTER
                    );
                    
                    await socket.sendMessage(userJid, { text: welcomeMsg });
                    
                    console.log(`✅ Bot connected: ${sanitizedNumber}`);
                } catch (e) {
                    console.error('Connection open error:', e);
                }
            }
        });
        
        return socket;
    } catch (error) {
        console.error('Session creation error:', error);
        socketCreationTime.delete(sanitizedNumber);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to create session' });
        }
        throw error;
    }
}

// ==================== EXPRESS ROUTES ====================

// Pairing endpoint
router.get('/', async (req, res) => {
    const { number } = req.query;
    
    if (!number) {
        return res.status(400).json({ error: 'Number is required' });
    }
    
    const sanitized = number.replace(/[^0-9]/g, '');
    
    if (activeSockets.has(sanitized)) {
        return res.json({ 
            status: 'already_connected',
            message: 'This number is already connected'
        });
    }
    
    try {
        await createSession(number, res);
    } catch (error) {
        console.error('Pairing error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to create session' });
        }
    }
});

// Get active sessions
router.get('/active', (req, res) => {
    res.json({
        botName: config.BOT_NAME,
        count: activeSockets.size,
        numbers: Array.from(activeSockets.keys()),
        timestamp: getTimeStamp()
    });
});

// Reconnect all bots
router.get('/reconnect', async (req, res) => {
    try {
        const numbers = await getAllNumbersFromMongo();
        const results = [];
        
        for (const number of numbers) {
            if (activeSockets.has(number)) {
                results.push({ number, status: 'already_connected' });
                continue;
            }
            
            try {
                const mockRes = { headersSent: false, json: () => {} };
                await createSession(number, mockRes);
                results.push({ number, status: 'reconnecting' });
            } catch (e) {
                results.push({ number, status: 'failed', error: e.message });
            }
            
            await delay(1000);
        }
        
        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get bot stats
router.get('/stats', (req, res) => {
    res.json({
        botName: config.BOT_NAME,
        owner: config.OWNER_NAME,
        version: config.BOT_VERSION,
        activeSessions: activeSockets.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: getTimeStamp()
    });
});

// Initialize MongoDB on startup
initMongo().catch(console.error);

module.exports = router;