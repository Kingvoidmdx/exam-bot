const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');

const bot = new Telegraf(process.env.BOT_TOKEN);

// ===== 1. FORCE JOIN MIDDLEWARE =====
async function mustJoin(ctx, next) {
  try {
    const userId = ctx.from.id;
    const group = await ctx.telegram.getChatMember('@king_void_exams', userId);
    const channel = await ctx.telegram.getChatMember('@king_void_updates', userId);
    
    if (['left', 'kicked'].includes(group.status) || ['left', 'kicked'].includes(channel.status)) {
      return ctx.reply(
        '⚠️ Oga you must join our family first 🙏',
        Markup.inlineKeyboard([
          [Markup.button.url('Join Group', 'https://t.me/king_void_exams')],
          [Markup.button.url('Join Channel', 'https://t.me/king_void_updates')],
          [Markup.button.callback('✅ I Have Joined', 'verify_join')]
        ])
      );
    }
    return next();
  } catch (error) {
    return ctx.reply('❌ Bot must be admin in both groups. Contact @Kingvoid_dev77');
  }
}

bot.action('verify_join', mustJoin, (ctx) => {
  ctx.editMessageText('✅ Verified! Welcome to 𝐊𝐈𝐍𝐆_𝐕𝐎𝐈𝐃<>𝐄𝐗𝐀𝐌-𝐁𝐎𝐓 🇳🇬\n\nCommands:\n/jamb Maths 2021\n/waec English 2020\n/neco Physics 2019\n/premium');
});

// ===== 2. START COMMAND =====
bot.start(mustJoin, (ctx) => {
  ctx.replyWithPhoto(
    { url: 'https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1777247490603-2c6087d7.jpg' },
    {
      caption: `Welcome to 𝐊𝐈𝐍𝐆_𝐕𝐎𝐈𝐃<>𝐄𝐗𝐀𝐌-𝐁𝐎𝐓 🇳🇬\n\n📚 Real JAMB/WAEC/NECO past questions\n🖼️ Questions as images + poll options\n🤖 AI explanations for premium users\n\n*Usage:*\n/jamb Mathematics 2021\n/waec English 2020\n/neco Chemistry 2019\n\n/premium - Unlock unlimited`,
      parse_mode: 'Markdown'
    }
  );
});

// ===== 3. JAMB COMMAND: /jamb Maths 2021 =====
bot.command('jamb', mustJoin, async (ctx) => {
  const text = ctx.message.text.split(' ');
  if (text.length < 3) return ctx.reply('❌ Usage: /jamb Subject Year\nExample: /jamb Mathematics 2021');
  
  const subject = text[1];
  const year = text[2];
  
  await ctx.reply(`🔍 Fetching JAMB ${subject} ${year} from myschool.ng...`);
  
  try {
    // TODO: Replace with Grok API scrape later
    const qData = await getQuestion('jamb', subject, year);
    
    // Send as image
    const img = await makeQuestionImage(`JAMB ${year} - ${subject}\n\n${qData.question}`);
    await ctx.replyWithPhoto({ source: img });
    
    // Send as poll A-E
    await ctx.sendPoll(
      `Pick correct answer:`,
      qData.options,
      { type: 'quiz', correct_option_id: qData.correct, is_anonymous: false, explanation: 'Upgrade to Premium for AI explanation 💎' }
    );
    
  } catch (e) {
    ctx.reply('❌ Failed to fetch. Site may be down or question not found. Try another year.');
  }
});

// ===== 4. WAEC COMMAND =====
bot.command('waec', mustJoin, async (ctx) => {
  const text = ctx.message.text.split(' ');
  if (text.length < 3) return ctx.reply('❌ Usage: /waec Subject Year\nExample: /waec English 2020');
  
  const subject = text[1];
  const year = text[2];
  await ctx.reply(`🔍 Fetching WAEC ${subject} ${year}...`);
  
  const qData = await getQuestion('waec', subject, year);
  const img = await makeQuestionImage(`WAEC ${year} - ${subject}\n\n${qData.question}`);
  await ctx.replyWithPhoto({ source: img });
  await ctx.sendPoll(`Pick correct answer:`, qData.options, { type: 'quiz', correct_option_id: qData.correct, is_anonymous: false });
});

// ===== 5. NECO COMMAND =====
bot.command('neco', mustJoin, async (ctx) => {
  const text = ctx.message.text.split(' ');
  if (text.length < 3) return ctx.reply('❌ Usage: /neco Subject Year\nExample: /neco Physics 2019');
  
  const subject = text[1];
  const year = text[2];
  await ctx.reply(`🔍 Fetching NECO ${subject} ${year}...`);
  
  const qData = await getQuestion('neco', subject, year);
  const img = await makeQuestionImage(`NECO ${year} - ${subject}\n\n${qData.question}`);
  await ctx.replyWithPhoto({ source: img });
  await ctx.sendPoll(`Pick correct answer:`, qData.options, { type: 'quiz', correct_option_id: qData.correct, is_anonymous: false });
});

// ===== 6. PREMIUM COMMAND =====
bot.command('premium', mustJoin, (ctx) => {
  ctx.replyWithMarkdown(
    `💎 *KING-VOID PREMIUM - ₦500/month*\n\n✅ Unlimited questions daily\n✅ AI explanation for every answer\n✅ UTME score predictor\n✅ All subjects + years\n\n*Pay to:*\nBank: OPAY\nAcct: 9154472946\nName: KING VOID\n\n*After payment:*\nSend proof to @Kingvoid_dev77 or WhatsApp: 2348036377933\n\nYou’ll be activated in 5 mins.`,
    Markup.inlineKeyboard([
      [Markup.button.url('💬 Chat Admin', 'https://t.me/Kingvoid_dev77')],
      [Markup.button.url('📱 WhatsApp', 'https://wa.me/2348036377933')]
    ])
  );
});

// ===== 7. IMAGE GENERATOR FUNCTION =====
async function makeQuestionImage(text) {
  const width = 800;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // White background like exam paper
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  
  // Header
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('𝐊𝐈𝐍𝐆_𝐕𝐎𝐈𝐃<>𝐄𝐗𝐀𝐌-𝐁𝐎𝐓', 20, 40);
  
  // Question text wrap
  ctx.font = '18px Arial';
  const lines = text.split('\n');
  let y = 80;
  lines.forEach(line => {
    ctx.fillText(line, 20, y);
    y += 30;
  });
  
  return canvas.toBuffer('image/png');
}

// ===== 8. SCRAPER PLACEHOLDER - WE ADD GROK HERE NEXT =====
async function getQuestion(exam, subject, year) {
  // TEMP FAKE DATA - Replace with Grok API scrape of myschool.ng
  return {
    question: `If 2x + 5 = 15, find x.\n\nFrom ${exam.toUpperCase()} ${subject} ${year}`,
    options: ['A. 3', 'B. 5', 'C. 10', 'D. 15'],
    correct: 1 // B is correct
  };
}

bot.launch();
console.log('KING-VOID EXAM BOT ONLINE');
