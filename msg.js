const {
    downloadContentFromMessage,
    getContentType,
    proto
} = require('baileys');
const fs = require('fs');

const downloadMediaMessage = async (m, filename) => {
    if (m.type === 'viewOnceMessage') {
        m.type = m.msg.type;
    }
    
    let stream;
    let buffer = Buffer.from([]);
    
    if (m.type === 'imageMessage') {
        stream = await downloadContentFromMessage(m.msg, 'image');
    } else if (m.type === 'videoMessage') {
        stream = await downloadContentFromMessage(m.msg, 'video');
    } else if (m.type === 'audioMessage') {
        stream = await downloadContentFromMessage(m.msg, 'audio');
    } else if (m.type === 'stickerMessage') {
        stream = await downloadContentFromMessage(m.msg, 'sticker');
    } else if (m.type === 'documentMessage') {
        stream = await downloadContentFromMessage(m.msg, 'document');
    } else {
        return null;
    }
    
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    
    return buffer;
};

const sms = (conn, m) => {
    if (m.key) {
        m.id = m.key.id;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = m.fromMe ? conn.user.id.split(':')[0] + '@s.whatsapp.net' : 
                   m.isGroup ? m.key.participant : m.key.remoteJid;
    }
    
    if (m.message) {
        m.type = getContentType(m.message);
        m.msg = (m.type === 'viewOnceMessage') ? 
                m.message[m.type].message[getContentType(m.message[m.type].message)] : 
                m.message[m.type];
        
        if (m.msg) {
            m.body = (m.type === 'conversation') ? m.msg :
                     (m.type === 'extendedTextMessage') ? m.msg.text :
                     (m.type === 'imageMessage') ? m.msg.caption :
                     (m.type === 'videoMessage') ? m.msg.caption : '';
            
            m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null;
            
            if (m.quoted) {
                m.quoted.type = getContentType(m.quoted);
                m.quoted.id = m.msg.contextInfo.stanzaId;
                m.quoted.sender = m.msg.contextInfo.participant;
                m.quoted.msg = (m.quoted.type === 'viewOnceMessage') ? 
                               m.quoted[m.quoted.type].message[getContentType(m.quoted[m.quoted.type].message)] : 
                               m.quoted[m.quoted.type];
            }
        }
    }
    
    // Reply functions
    m.reply = (text) => conn.sendMessage(m.chat, { text }, { quoted: m });
    
    m.replyImage = (image, caption) => conn.sendMessage(m.chat, { 
        image: image, 
        caption: caption 
    }, { quoted: m });
    
    m.replyVideo = (video, caption) => conn.sendMessage(m.chat, { 
        video: video, 
        caption: caption 
    }, { quoted: m });
    
    m.replyAudio = (audio, ptt = false) => conn.sendMessage(m.chat, { 
        audio: audio, 
        ptt: ptt,
        mimetype: 'audio/mp4'
    }, { quoted: m });
    
    m.replySticker = (sticker) => conn.sendMessage(m.chat, { 
        sticker: sticker 
    }, { quoted: m });
    
    m.react = (emoji) => conn.sendMessage(m.chat, {
        react: { text: emoji, key: m.key }
    });
    
    m.download = () => downloadMediaMessage(m);
    
    return m;
};

module.exports = { sms, downloadMediaMessage };