const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const { createCanvas } = require('canvas');
const fs = require('fs');

// ===== CONFIG =====
const ADMIN_ID = 8674514245; // Your Telegram ID - change this to your own
const GROK_API_KEY = process.env.GROK_API_KEY; // Add this in Render env vars

// ===== DATABASE =====
const DB_PATH = './users.json';
let users = {};
if (fs.existsSync(DB_PATH)) {
  users = JSON.parse(fs.readFileSync(DB_PATH));
}
function saveDB() {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}
function getUser(userId) {
  if (!users[userId]) {
    users[userId] = { credits: 5, premium: false, invitedBy: null, invites: 0 };
    saveDB();
  }
  return users[userId];
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// ===== FORCE JOIN =====
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

// ===== ADMIN ONLY CHECK =====
function adminOnly(ctx, next) {
  if (ctx.from.id!== ADMIN_ID) {
    return ctx.reply('❌ Admin only command');
  }
  return next();
}

// ===== MAIN MENU =====
const mainMenu = Markup.keyboard([
  ['📚 JAMB', '📖 WAEC'], 
  ['📝 NECO', '💎 Premium'],
  ['🔗 Invite Friends', '👤 Profile']
]).resize();

bot.action('verify_join', mustJoin, (ctx) => {
  ctx.editMessageText('✅ Verified! Welcome to KING VOID EXAM BOT 🇳🇬');
  ctx.reply('Main Menu:', mainMenu);
});

// ===== /START + REFERRAL =====
bot.start(mustJoin, async (ctx) => {
  const userId = ctx.from.id;
  const user = getUser(userId);
  
  const referrerId = ctx.startPayload;
  if (referrerId && referrerId!== userId.toString() &&!user.invitedBy) {
    const referrer = getUser(referrerId);
    referrer.credits += 3;
    user.credits += 2;
    user.invitedBy = referrerId;
    referrer.invites += 1;
    saveDB();
    
    try {
      await ctx.telegram.sendMessage(referrerId, `🎉 New user joined! +3 credits\nTotal: ${referrer.credits} credits 💎`);
    } catch (e) {}
  }
  
  await ctx.replyWithPhoto(
    { url: 'https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1777247490603-2c6087d7.jpg' },
    {
      caption: `Welcome to KING VOID EXAM BOT 🇳🇬\n\n📚 Real JAMB/WAEC/NECO past questions\n🖼️ Questions as images + poll options\n🤖 AI explanations for premium users\n\nCredits: ${user.credits} 💎\n\nUsage:\n/jamb Mathematics 2021\n/waec English 2020`,
    ...mainMenu
    }
  );
});

// ===== INVITE FRIENDS =====
bot.hears('🔗 Invite Friends', mustJoin, (ctx) => {
  const userId = ctx.from.id;
  const user = getUser(userId);
  const botUsername = ctx.botInfo.username;
  
  ctx.reply(
    `🔗 Invite Friends\n\nYour invite code: ${userId}\n\n💬 Share this link:\nhttps://t.me/${botUsername}?start=${userId}\n\n🎉 Rewards:\n• You get: +3 credits per friend\n• Friend gets: +2 credits\n\n👥 Total invites: ${user.invites}`,
    Markup.inlineKeyboard([
      [Markup.button.url('📤 Share Link', `https://t.me/share/url?url=https://t.me/${botUsername}?start=${userId}&text=Join KING VOID EXAM BOT for free JAMB/WAEC/NECO past questions!`)]
    ])
  );
});

// ===== PROFILE =====
bot.hears('👤 Profile', mustJoin, (ctx) => {
  const user = getUser(ctx.from.id);
  ctx.reply(
    `👤 Your Profile\n\n💎 Credits: ${user.credits}\n🔥 Premium: ${user.premium? 'Active ✅' : 'Inactive ❌'}\n👥 Invites: ${user.invites}\n🆔 ID: ${ctx.from.id}\n\nUse credits to answer questions. /premium for unlimited.`
  );
});

// ===== ADMIN COMMAND: /activate 8674514245 =====
bot.command('activate', adminOnly, (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) return ctx.reply('❌ Usage: /activate user_id\nExample: /activate 8674514245');
  
  const targetId = parts[1];
  const user = getUser(targetId);
  user.premium = true;
  user.credits = 9999;
  saveDB();
  
  ctx.reply(`✅ Activated Premium for ${targetId}\nUnlimited questions unlocked.`);
  
  try {
    ctx.telegram.sendMessage(targetId, `🎉 PREMIUM ACTIVATED!\n\n💎 You now have unlimited questions\n🤖 AI explanations enabled\n\nEnjoy KING VOID EXAM BOT!`);
  } catch (e) {}
});

// ===== SEND QUESTION WITH CREDIT CHECK =====
async function sendQuestion(ctx, exam, subject, year) {
  const user = getUser(ctx.from.id);
  
  if (!user.premium && user.credits <= 0) {
    return ctx.reply('❌ No credits left!\n\n🔗 Invite friends for +3 credits each\n💎 Or tap 💎 Premium for ₦500 unlimited', mainMenu);
  }
  
  if (!user.premium) {
    user.credits -= 1;
    saveDB();
  }
  
  const waitMsg = await ctx.reply(`🔍 Searching ${exam.toUpperCase()} ${subject} ${year} on myschool.ng...\nCredits left: ${user.premium? 'Unlimited' : user.credits} 💎`);
  
  try {
    const qData = await getQuestionFromGrok(exam, subject, year);
    
    if (!qData) {
      return ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, '❌ Question not found. Try another year or subject.');
    }
    
    const img = await makeQuestionImage(`${exam.toUpperCase()} ${year}\n${subject}\n\n${qData.question}`);
    await ctx.replyWithPhoto({ source: img });
    
    await ctx.sendPoll(
      `Pick correct answer:`,
      qData.options,
      { 
        type: 'quiz', 
        correct_option_id: qData.correct, 
        is_anonymous: false,
        explanation: user.premium? qData.explanation : 'Upgrade to Premium for AI explanation 💎'
      }
    );
    
    await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id);
    
  } catch (e) {
    console.error(e);
    await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, '❌ Error fetching question. Try again later.');
  }
}

// ===== QUESTION COMMANDS =====
bot.command('jamb', mustJoin, (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) return ctx.reply('❌ Usage: /jamb Mathematics 2021');
  sendQuestion(ctx, 'jamb', parts[1], parts[2]);
});

bot.command('waec', mustJoin, (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) return ctx.reply('❌ Usage: /waec English 2020');
  sendQuestion(ctx, 'waec', parts[1], parts[2]);
});

bot.command('neco', mustJoin, (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) return ctx.reply('❌ Usage: /neco Physics 2019');
  sendQuestion(ctx, 'neco', parts[1], parts[2]);
});

bot.hears('📚 JAMB', mustJoin, (ctx) => ctx.reply('Send: /jamb Subject Year\nExample: /jamb Mathematics 2021'));
bot.hears('📖 WAEC', mustJoin, (ctx) => ctx.reply('Send: /waec Subject Year\nExample: /waec English 2020'));
bot.hears('📝 NECO', mustJoin, (ctx) => ctx.reply('Send: /neco Subject Year\nExample: /neco Physics 2019'));

// ===== PREMIUM =====
bot.hears('💎 Premium', mustJoin, (ctx) => {
  ctx.reply(
    `💎 KING-VOID PREMIUM - ₦500/month\n\n✅ Unlimited questions daily\n✅ AI explanation for every answer\n✅ UTME score predictor\n✅ All subjects + years\n\nPay to:\nBank: OPAY\nAcct: 9154472946\nName: KING VOID\n\nAfter payment:\nSend proof to @Kingvoid_dev77 or WhatsApp: 2348036377933\n\nYour ID: ${ctx.from.id}`,
    Markup.inlineKeyboard([
      [Markup.button.url('💬 Chat Admin', 'https://t.me/Kingvoid_dev77')],
      [Markup.button.url('📱 WhatsApp', 'https://wa.me/2348036377933')]
    ])
  );
});

// ===== GROK API - FETCH REAL QUESTIONS =====
async function getQuestionFromGrok(exam, subject, year) {
  if (!GROK_API_KEY) {
    console.log('No GROK_API_KEY found');
    return null;
  }
  
  const prompt = `You are a JAMB/WAEC/NECO past question extractor. Find ONE real ${exam.toUpperCase()} ${subject} question from year ${year} from myschool.ng or similar Nigerian exam sites. 
  
Return ONLY valid JSON in this exact format:
{
  "question": "Full question text here",
  "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
  "correct": 0,
  "explanation": "Brief explanation why correct answer is right"
}

Rules:
- correct is 0-3 index for A-D
- If no question found, return null
- Must be real past question, not made up
- Include all options A-D`;

  try {
    const response = await axios.post('https://api.x.ai/v1/chat/completions', {
      model: 'grok-2-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Grok API error:', error.message);
    return null;
  }
}

// ===== MAJESTIC IMAGE GENERATOR =====
async function makeQuestionImage(text) {
  const width = 900;
  const height = 650;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#FFFFFF');
  gradient.addColorStop(1, '#F1F3F5');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  ctx.strokeStyle = '#1A1A2E';
  ctx.lineWidth = 5;
  ctx.strokeRect(15, 15, width - 30, height - 30);
  
  ctx.fillStyle = '#0F3460';
  ctx.font = 'bold 38px Arial';
  ctx.fillText('KING VOID EXAM BOT', 40, 70);
  
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = '#E94560';
  ctx.fillText('🇳🇬 JAMB | WAEC | NECO PAST QUESTIONS', 40, 105);
  
  ctx.strokeStyle = '#E94560';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(40, 125);
  ctx.lineTo(width - 40, 125);
  ctx.stroke();
  
  ctx.fillStyle = '#16213E';
  const lines = text.split('\n');
  let y = 170;
  
  lines.forEach(line => {
    const words = line.split(' ');
    let currentLine = '';
    ctx.font = line.match(/JAMB|WAEC|NECO/)? 'bold 26px Arial' : '22px Arial';
    
    words.forEach(word => {
      const testLine = currentLine + word + ' ';
      if (ctx.measureText(testLine).width > width - 80) {
        ctx.fillText(currentLine, 40, y);
        y += 38;
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    });
    ctx.fillText(currentLine, 40, y);
    y += 45;
  });
  
  ctx.font = '16px Arial';
  ctx.fillStyle = '#6C757D';
  ctx.fillText('@King_void_exam_bot | t.me/king_void_exams', 40, height - 30);
  
  return canvas.toBuffer('image/png');
}

bot.launch();
console.log('KING-VOID EXAM BOT ONLINE WITH GROK + ADMIN');
