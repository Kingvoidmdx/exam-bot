const { Telegraf, Markup } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

async function checkJoined(ctx) {
  try {
    const group = await ctx.telegram.getChatMember('@king_void_exams', ctx.from.id);
    const channel = await ctx.telegram.getChatMember('@king_void_updates', ctx.from.id);
    if (['left', 'kicked'].includes(group.status) || ['left', 'kicked'].includes(channel.status)) {
      await ctx.reply(
        '⚠️ Join our groups first to use the bot 🙏',
        Markup.inlineKeyboard([
          [Markup.button.url('Join Group', 'https://t.me/king_void_exams')],
          [Markup.button.url('Join Channel', 'https://t.me/king_void_updates')],
          [Markup.button.callback('✅ I Joined', 'check_join')]
        ])
      );
      return false;
    }
    return true;
  } catch (e) {
    ctx.reply('Make sure bot is admin in both groups first.');
    return false;
  }
}

bot.start(async (ctx) => {
  if (await checkJoined(ctx)) {
    ctx.reply('Welcome to 𝐊𝐈𝐍𝐆_𝐕𝐎𝐈𝐃<>𝐄𝐗𝐀𝐌-𝐁𝐎𝐓 🇳🇬\n\nUse: /jamb Maths 2021');
  }
});

bot.action('check_join', async (ctx) => {
  if (await checkJoined(ctx)) {
    ctx.reply('Verified ✅ You can now use the bot!');
  }
});

bot.command('premium', (ctx) => {
  ctx.reply(
    `💎 PREMIUM - ₦500/month\n\nPay to:\nOPAY: 9154472946\n\nSend proof to @Kingvoid_dev77 or WhatsApp: 2348036377933`,
    Markup.inlineKeyboard([[Markup.button.url('Chat Admin', 'https://t.me/Kingvoid_dev77')]])
  );
});

bot.launch();
console.log('EXAM BOT LIVE');
