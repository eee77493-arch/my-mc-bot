import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes, CallbackQueryHandler, MessageHandler, filters

# --- إعدادات المالك ---
TOKEN = '8370024778:AAE-qgTieanQV-5iC5nKXJSsMrT95HuMSyM'
OWNER_ID = 8073536688 

# مخزن البيانات العام
global_settings = {
    'bot_name': 'MyBot_MC',
    'system_status': 'يعمل بنجاح ✅'
}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    # أزرار العضو (إضافة، حذف، تشغيل، إطفاء)
    user_kb = [
        [InlineKeyboardButton("🌐 إضافة سيرفر", callback_data='add_srv'), InlineKeyboardButton("🗑️ حذف سيرفر", callback_data='del_srv')],
        [InlineKeyboardButton("🚀 تشغيل البوت", callback_data='run_mc'), InlineKeyboardButton("🛑 إطفاء البوت", callback_data='stop_mc')],
        [InlineKeyboardButton("📊 حالة البوت العامة", callback_data='status')]
    ]
    
    # زر لوحة المالك يظهر لك أنت فقط
    if user_id == OWNER_ID:
        user_kb.append([InlineKeyboardButton("👑 لوحة التحكم الملكية (30 ميزة)", callback_data='mega_panel')])
    
    await update.message.reply_text(
        f"👋 أهلاً بك {update.effective_user.first_name} في نظام التشغيل المطور.\nالاسم المعتمد داخل ماين كرافت: {global_settings['bot_name']}",
        reply_markup=InlineKeyboardMarkup(user_kb)
    )

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()

    if query.data == 'mega_panel':
        if user_id != OWNER_ID: return
        # توزيع الـ 30 ميزة في لوحة المالك
        mega_kb = [
            [InlineKeyboardButton("📝 تغيير اسم البوت", callback_data='set_name'), InlineKeyboardButton("🎨 لون الاسم", callback_data='clr'), InlineKeyboardButton("🛡️ الحماية", callback_data='prot')],
            [InlineKeyboardButton("🚫 حظر عضو", callback_data='ban'), InlineKeyboardButton("✅ فك حظر", callback_data='unban'), InlineKeyboardButton("📋 قائمة الحظر", callback_data='blist')],
            [InlineKeyboardButton("📢 إرسال إعلان", callback_data='bc'), InlineKeyboardButton("👤 داتا الأعضاء", callback_data='data'), InlineKeyboardButton("📊 إحصائيات", callback_data='stats')],
            [InlineKeyboardButton("🔄 ريستارت", callback_data='rb'), InlineKeyboardButton("🧹 تنظيف", callback_data='cln'), InlineKeyboardButton("📉 سيرفر Render", callback_data='rnd')],
            [InlineKeyboardButton("⏳ الاشتراك", callback_data='sub'), InlineKeyboardButton("➕ يوم", callback_data='a_d'), InlineKeyboardButton("➖ يوم", callback_data='r_d')],
            [InlineKeyboardButton("🛠️ صيانة", callback_data='mnt'), InlineKeyboardButton("🔓 فتح", callback_data='opn'), InlineKeyboardButton("🔒 قفل", callback_data='lck')],
            [InlineKeyboardButton("🌐 الـ IP", callback_data='ip'), InlineKeyboardButton("🔌 البورت", callback_data='prt'), InlineKeyboardButton("📡 بينج", callback_data='png')],
            [InlineKeyboardButton("💬 ترحيب", callback_data='wel'), InlineKeyboardButton("📜 سجلات", callback_data='log'), InlineKeyboardButton("⚠️ تنبيه", callback_data='alt')],
            [InlineKeyboardButton("📤 رفع", callback_data='up'), InlineKeyboardButton("📥 تحميل", callback_data='dl'), InlineKeyboardButton("🗑️ فورمات", callback_data='fmt')],
            [InlineKeyboardButton("🛑 طرد الكل", callback_data='kick_all'), InlineKeyboardButton("💎 نسخة Pro", callback_data='pro'), InlineKeyboardButton("🔙 رجوع", callback_data='back')]
        ]
        await query.edit_message_text("👑 **لوحة التحكم الشاملة للمالك**\nأنت الآن تتحكم في كامل النظام:", reply_markup=InlineKeyboardMarkup(mega_kb), parse_mode='Markdown')

    elif query.data == 'set_name':
        await query.edit_message_text("ارسل الآن الاسم الجديد الذي سيتم اعتماده لجميع مستخدمي البوت:")
        context.user_data['action'] = 'waiting_name'

    elif query.data == 'back':
        await start(query, context)

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != OWNER_ID: return
    
    if context.user_data.get('action') == 'waiting_name':
        global_settings['bot_name'] = update.message.text
        context.user_data['action'] = None
        await update.message.reply_text(f"✅ تم تغيير اسم البut عند الجميع إلى: {global_settings['bot_name']}")

if __name__ == '__main__':
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(button_handler))
    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_text))
    print("Bot is LIVE...")
    app.run_polling()
