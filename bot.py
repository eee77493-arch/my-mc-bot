import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes, CallbackQueryHandler, MessageHandler, filters

# --- إعداداتك الخاصة ---
TOKEN = '8370024778:AAE-qgTieanQV-5iC5nKXJSsMrT95HuMSyM'
OWNER_ID = 8073536688 

# متغيرات النظام
bot_config = {
    'name': 'MyBot_MC',
    'protection': 'معطلة ❌',
    'status': 'متصل ✅'
}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    # واجهة العضو (إضافة، حذف، تشغيل، إطفاء)
    user_buttons = [
        [InlineKeyboardButton("🌐 إضافة سيرفر", callback_data='add_srv'), 
         InlineKeyboardButton("🗑️ حذف سيرفر", callback_data='del_srv')],
        [InlineKeyboardButton("🚀 تشغيل البوت", callback_data='run_mc'), 
         InlineKeyboardButton("🛑 إطفاء البوت", callback_data='stop_mc')],
        [InlineKeyboardButton("📊 حالة البوت", callback_data='user_status')]
    ]
    
    # زر لوحة المالك (يظهر لك فقط)
    if user_id == OWNER_ID:
        user_buttons.append([InlineKeyboardButton("⚙️ **لوحة المالك العربية**", callback_data='owner_panel')])
    
    await update.message.reply_text(
        "👋 أهلاً بك في نظام تشغيل بيدرو || 2026\nالمطور: @G2_ZL",
        reply_markup=InlineKeyboardMarkup(user_buttons),
        parse_mode='Markdown'
    )

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()

    # --- لوحة المالك (كما في الصورة) ---
    if query.data == 'owner_panel':
        if user_id != OWNER_ID: return
        
        owner_kb = [
            [InlineKeyboardButton("طرد الكل", callback_data='kick_all'), 
             InlineKeyboardButton("تفعيل الحماية", callback_data='toggle_prot')],
            [InlineKeyboardButton("إدارة الاشتراك", callback_data='sub_manage'), 
             InlineKeyboardButton("قائمة الحظر", callback_data='ban_list')],
            [InlineKeyboardButton("إرسال إعلان", callback_data='broadcast'), 
             InlineKeyboardButton("حالة النظام", callback_data='sys_status')],
            [InlineKeyboardButton("🆔 تغيير الاسم", callback_data='change_name'),
             InlineKeyboardButton("🔙 رجوع", callback_data='back_home')]
        ]
        await query.edit_message_text(
            "⚙️ **لوحة المالك العربية**\nتحكم في إعدادات النظام بالكامل:",
            reply_markup=InlineKeyboardMarkup(owner_kb),
            parse_mode='Markdown'
        )

    # --- تنفيذ الأوامر ---
    elif query.data == 'sys_status':
        await query.edit_message_text(f"📊 حالة النظام: {bot_config['status']}\n🛡️ الحماية: {bot_config['protection']}\n🆔 اسم البوت: {bot_config['name']}")

    elif query.data == 'change_name':
        await query.edit_message_text("ارسل الآن الاسم الجديد الذي تريد ظهوره داخل السيرفر:")
        context.user_data['action'] = 'waiting_name'

    elif query.data == 'back_home':
        await start(query, context)

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != OWNER_ID: return
    
    if context.user_data.get('action') == 'waiting_name':
        bot_config['name'] = update.message.text
        context.user_data['action'] = None
        await update.message.reply_text(f"✅ تم تغيير اسم البوت بنجاح إلى: {bot_config['name']}")

if __name__ == '__main__':
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(button_handler))
    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_text))
    app.run_polling()
