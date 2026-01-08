const TelegramBot = require('node-telegram-bot-api');
const mineflayer = require('mineflayer');
const fs = require('fs');
const { pathfinder, goals } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin; // إضافة مكتبة PVP

// --- الإعدادات الأساسية (2026) ---
const TOKEN = '8254514163:AAFGdimzWIF5UuxjJYzuHPkzs9-oaz-prpc'; 
const OWNER_ID = 8073536688; 
const OWNER_USER = "@G2_ZL"; 
const DB_FILE = 'database.json';

// --- نظام قاعدة البيانات ---
let db = {
    admins: [OWNER_ID],
    channels: ['@G2_ZLbot'],
    users: [],
    blockedUsers: 0,
    welcomeMsg: `اهلا بك يا {name} في بوت تشغيل سيرفرات اترينوس 24 ساعة 🚀\n\nمالك البوت: ${OWNER_USER}`,
    serverData: { ip: null, port: 25565, name: 'G2_Player' },
    buttonTexts: { 
        run: '▶️ تشغيل', stop: '⏹ إيقاف', players: '👥 المتصلين', 
        chat: '💬 مراقب الشات', set_ip: '➕ إضافة سيرفر', stats: '📊 الإحصائيات',
        pvp: '⚔️ تفعيل PVP' // نص زر PVP
    }
};

if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE));
const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

const tBot = new TelegramBot(TOKEN, { polling: true });
let mcBot = null;
let isRunning = false;
let chatSpyActive = {}; 
let inputState = {};
let pvpActive = false; // حالة تفعيل الـ PVP

// --- التحقق من الاشتراك ---
async function isSubscribed(chatId) {
    if (db.admins.includes(chatId)) return true;
    try {
        const res = await tBot.getChatMember(db.channels[0], chatId);
        return ['member', 'administrator', 'creator'].includes(res.status);
    } catch (e) { return false; }
}

// --- لوحات التحكم ---
const userMenu = (chatId) => {
    const status = isRunning ? "🟢 متصل" : "🔴 متوقف";
    let keyboard = [
        [{ text: db.buttonTexts.run, callback_data: 'run' }, { text: db.buttonTexts.stop, callback_data: 'stop' }],
        [{ text: db.buttonTexts.players, callback_data: 'mc_players' }, { text: db.buttonTexts.chat, callback_data: 'toggle_chat' }],
        [{ text: db.buttonTexts.set_ip, callback_data: 'set_ip' }],
        [{ text: pvpActive ? "⚔️ إيقاف PVP" : db.buttonTexts.pvp, callback_data: 'toggle_pvp' }] // زر تفعيل/إيقاف PVP
    ];
    if (db.admins.includes(chatId)) {
        keyboard.push([{ text: "👨‍💻 لوحة المالك", callback_data: 'open_admin' }]);
    }
    return { reply_markup: { inline_keyboard: keyboard } };
};

const adminMenu = () => ({
    reply_markup: {
        inline_keyboard: [
            [{ text: "📊 الإحصائيات", callback_data: 'adm_stats' }, { text: "📝 الترحيب", callback_data: 'adm_welcome' }],
            [{ text: "🔙 عودة", callback_data: 'back_user' }]
        ]
    }
});

// --- معالجة الرسائل ---
tBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (!msg.text) return;

    if (!db.users.includes(chatId)) {
        db.users.push(chatId); saveDB();
        tBot.sendMessage(chatId, db.welcomeMsg.replace("{name}", msg.from.first_name));
    }

    if (msg.text === '/start') {
        if (!(await isSubscribed(chatId))) return tBot.sendMessage(chatId, `❌ يجب أن تشترك في القناة أولاً: ${db.channels[0]}`);
        tBot.sendMessage(chatId, "🛠 لوحة التحكم الرئيسية:", userMenu(chatId));
    }

    if (inputState[chatId]) {
        if (inputState[chatId].type === 'ip') {
            const p = msg.text.split(':');
            db.serverData.ip = p[0].trim(); 
            db.serverData.port = parseInt(p[1]) || 25565;
            saveDB(); 
            tBot.sendMessage(chatId, "✅ تم حفظ بيانات السيرفر.", userMenu(chatId));
        }
        delete inputState[chatId];
    }
});

// --- معالجة الأزرار ---
tBot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'run') {
        if (!db.serverData.ip) return tBot.sendMessage(chatId, "❌ أضف IP السيرفر أولاً!");
        startMC(chatId);
    }
    else if (data === 'stop') {
        if (mcBot) { mcBot.quit(); isRunning = false; tBot.sendMessage(chatId, "🔴 تم فصل البوت عن السيرفر."); }
    }
    else if (data === 'mc_players' && isRunning) {
        const p = Object.keys(mcBot.players);
        tBot.sendMessage(chatId, `👥 المتصلين (${p.length}):\n- ${p.join('\n- ')}`);
    }
    else if (data === 'toggle_chat') {
        chatSpyActive[chatId] = !chatSpyActive[chatId];
        tBot.answerCallbackQuery(query.id, { text: chatSpyActive[chatId] ? "✅ مراقب الشات مفعل" : "❌ مراقب الشات معطل" });
    }
    else if (data === 'set_ip') {
        inputState[chatId] = { type: 'ip' };
        tBot.sendMessage(chatId, "أرسل IP السيرفر والمنفذ بهذا الشكل -> `ip:port` :");
    }
    else if (data === 'toggle_pvp') { // زر تفعيل/إيقاف PVP
        if (!isRunning) return tBot.answerCallbackQuery(query.id, { text: "⚠️ البوت غير متصل بالسيرفر." });
        pvpActive = !pvpActive;
        tBot.answerCallbackQuery(query.id, { text: pvpActive ? "⚔️ تم تفعيل وضع PVP" : "🛡️ تم إيقاف وضع PVP" });
        if (pvpActive) {
            startPVP(chatId);
        } else {
            stopPVP(chatId);
        }
        tBot.editMessageReplyMarkup(query.message.chat.id, query.message.message_id, { reply_markup: userMenu(chatId).reply_markup });
    }
    else if (data === 'open_admin') {
        tBot.editMessageText("👨‍💻 لوحة المالك:", { chat_id: chatId, message_id: query.message.message_id, ...adminMenu() });
    }
    else if (data === 'back_user') {
        tBot.editMessageText("🛠 لوحة التحكم:", { chat_id: chatId, message_id: query.message.message_id, ...userMenu(chatId) });
    }
});

// --- وظيفة Minecraft Bot ---
function startMC(chatId) {
    if (isRunning) return tBot.sendMessage(chatId, "⚠️ البوت يعمل بالفعل!");
    
    tBot.sendMessage(chatId, "⏳ جارٍ محاولة الدخول للسيرفر...");
    
    mcBot = mineflayer.createBot({
        host: db.serverData.ip,
        port: db.serverData.port,
        username: db.serverData.name,
        version: false 
    });

    mcBot.loadPlugin(pathfinder);
    mcBot.loadPlugin(pvp); // تحميل plugin الـ PVP

    mcBot.on('spawn', () => {
        isRunning = true;
        tBot.sendMessage(chatId, "✅ البوت دخل السيرفر بنجاح! السيرفر لن يغلق الآن.");
        
        // Anti-AFK
        setInterval(() => {
            if (isRunning) {
                mcBot.setControlState('jump', true);
                setTimeout(() => mcBot.setControlState('jump', false), 500);
            }
        }, 60000); // يقفز كل دقيقة

        // مراقبة اللاعبين لبدء PVP
        mcBot.on('playerJoined', (player) => {
            if (pvpActive && player.username !== mcBot.username) {
                tBot.sendMessage(chatId, `⚔️ لاعب جديد ${player.username} دخل، يتم تفعيل وضع PVP.`);
                mcBot.pvp.attack(player);
            }
        });

        mcBot.on('playerLeft', (player) => {
            if (pvpActive && mcBot.pvp.target && mcBot.pvp.target.username === player.username) {
                tBot.sendMessage(chatId, `🛡️ اللاعب ${player.username} غادر، يتم إيقاف الهجوم.`);
                mcBot.pvp.stop();
            }
        });
    });

    mcBot.on('chat', (username, message) => {
        if (username === mcBot.username) return;
        Object.keys(chatSpyActive).forEach(id => {
            if (chatSpyActive[id]) tBot.sendMessage(id, `💬 [MC] ${username}: ${message}`);
        });
    });

    mcBot.on('error', (err) => {
        isRunning = false;
        tBot.sendMessage(chatId, `❌ خطأ في الاتصال: ${err.message}`);
    });

    mcBot.on('end', () => {
        isRunning = false;
        pvpActive = false; // إيقاف PVP عند فصل البوت
        tBot.sendMessage(chatId, "⚠️ تم فصل البوت من السيرفر.");
    });
}

// وظائف PVP
function startPVP(chatId) {
    if (!mcBot || !isRunning) return;
    
    // البحث عن أقرب لاعب والهجوم عليه
    const target = mcBot.nearestEntity((entity) => {
        return entity.type === 'player' && entity.username !== mcBot.username;
    });

    if (target) {
        mcBot.pvp.attack(target);
        tBot.sendMessage(chatId, `⚔️ بدأ الهجوم على اللاعب: ${target.username}`);
    } else {
        tBot.sendMessage(chatId, "🔎 لا يوجد لاعبون قريبون للهجوم عليهم.");
    }
}

function stopPVP(chatId) {
    if (!mcBot || !isRunning) return;
    mcBot.pvp.stop();
    tBot.sendMessage(chatId, "🛡️ تم إيقاف وضع الهجوم.");
}


console.log("✅ البوت يعمل بنجاح 2026...");
