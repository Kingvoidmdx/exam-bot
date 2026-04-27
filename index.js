const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const { createCanvas } = require('canvas');
const fs = require('fs');

const ADMIN_ID = 8674514245;
const GROQ_API_KEY = process.env.GROQ_API_KEY; // Use your gsk- key here

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
    users[userId] = { credits: 5, premium: false, invitedBy: null, invites: 0, name: '' };
    saveDB();
  }
  return users[userId];
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// ===== FORCE JOIN =====
async function mustJoin(ctx, next) {
  try {
    const userId = ctx.from.id;
    const user = getUser(userId);
    user.name = ctx.from.first_name || 'User';
    saveDB();
    
    const group = await ctx.telegram.getChatMember('@king_void_exams', userId);
    const channel = await ctx.telegram.getChatMember('@king_void_updates', userId);
    
    if (['left', 'kicked'].includes(group.status) || ['left', 'kicked'].includes(channel.status)) {
      return ctx.reply(
        'Access Restricted\n\nTo use KING VOID EXAM BOT, you must be a member of our official platforms:',
        Markup.inlineKeyboard([
          [Markup.button.url('Join Official Group', 'https://t.me/king_void_exams')],
          [Markup.button.url('Join Update Channel', 'https://t.me/king_void_updates')],
          [Markup.button.callback('✅ Verify Membership', 'verify_join')]
        ])
      );
    }
    return next();
  } catch (error) {
    return ctx.reply('Bot configuration error. Please contact @Kingvoid_dev77');
  }
}

function adminOnly(ctx, next) {
  if (ctx.from.id!== ADMIN_ID) {
    return ctx.reply('❌ Access Denied\n\nThis command is restricted to administrators only.');
  }
  return next();
}

const mainMenu = Markup.keyboard([
  ['📚 JAMB', '📖 WAEC'], 
  ['📝 NECO', '💎 Premium'],
  ['🔗 Invite Friends', '👤 Profile']
]).resize();

bot.action('verify_join', mustJoin, (ctx) => {
  const user = getUser(ctx.from.id);
  ctx.editMessageText(
    `✅ Membership Verified\n\nWelcome, ${user.name}\nUser ID: ${ctx.from.id}\n\nYou now have full access to KING VOID EXAM BOT.\n\nClick /start to begin.`
  );
});

bot.start(mustJoin, async (ctx) => {
  const userId = ctx.from.id;
  const user = getUser(userId);
  user.name = ctx.from.first_name || 'User';
  
  const referrerId = ctx.startPayload;
  if (referrerId && referrerId!== userId.toString() &&!user.invitedBy) {
    const referrer = getUser(referrerId);
    referrer.credits += 3;
    user.credits += 2;
    user.invitedBy = referrerId;
    referrer.invites += 1;
    saveDB();
    
    try {
      await ctx.telegram.sendMessage(referrerId, `🎉 Referral Successful\n\n+3 credits added\nTotal Credits: ${referrer.credits} 💎`);
    } catch (e) {}
  }
  
  await ctx.replyWithPhoto(
    { url: 'https://repgyetdcodkynrbxocg.supabase.co/storage/v1/object/public/images/telegram-1777247490603-2c6087d7.jpg' },
    {
      caption: `KING VOID EXAM BOT 🇳🇬\n\nWelcome ${user.name}\nUser ID: ${userId}\nCredits: ${user.credits} 💎\n\n📚 JAMB/WAEC/NECO Past Questions\n🖼️ Image Format + Quiz Polls\n🤖 AI Explanations for Premium`,
   ...mainMenu
    }
  );
});

bot.hears('🔗 Invite Friends', mustJoin, (ctx) => {
  const userId = ctx.from.id;
  const user = getUser(userId);
  const botUsername = ctx.botInfo.username;
  
  ctx.reply(
    `🔗 Referral Program\n\nYour Code: ${userId}\n\nShare Link:\nhttps://t.me/${botUsername}?start=${userId}\n\nRewards:\n• You earn: +3 credits per referral\n• New user earns: +2 credits\n\nTotal Referrals: ${user.invites}`,
    Markup.inlineKeyboard([
      [Markup.button.url('📤 Share Referral Link', `https://t.me/share/url?url=https://t.me/${botUsername}?start=${userId}&text=Get free JAMB/WAEC/NECO past questions!`)]
    ])
  );
});

bot.hears('👤 Profile', mustJoin, (ctx) => {
  const user = getUser(ctx.from.id);
  ctx.reply(
    `👤 User Profile\n\nName: ${user.name}\nUser ID: ${ctx.from.id}\nCredits: ${user.credits} 💎\nPremium Status: ${user.premium? 'Active ✅' : 'Inactive ❌'}\nTotal Referrals: ${user.invites}`
  );
});

bot.command('activate', adminOnly, (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) {
    return ctx.reply('Admin Usage:\n/activate user_id\n\nExample: /activate 8674514245');
  }
  
  const targetId = parts[1];
  const user = getUser(targetId);
  user.premium = true;
  user.credits = 99999;
  saveDB();
  
  ctx.reply(`✅ Premium Activated\n\nUser ID: ${targetId}\nStatus: Unlimited Access Granted`);
  
  try {
    ctx.telegram.sendMessage(targetId, `🎉 PREMIUM ACTIVATED\n\nYour account now has:\n✅ Unlimited questions\n✅ AI explanations enabled`);
  } catch (e) {}
});

// ===== TEST GROQ COMMAND - ADD THIS =====
bot.command('testgrok', adminOnly, async (ctx) => {
  if (!GROQ_API_KEY) {
    return ctx.reply('❌ GROQ_API_KEY not set in Render Environment Variables');
  }
  
  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Say "GROQ is working" in JSON: {"status":"working"}' }],
      temperature: 0.1
    }, {
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
    });
    ctx.reply(`✅ GROQ API Working\n\nResponse: ${res.data.choices[0].message.content}`);
  } catch (e) {
    ctx.reply(`❌ GROQ API Error:\n${e.response?.data?.error?.message || e.message}`);
  }
});

async function sendQuestion(ctx, exam, subject, year) {
  const user = getUser(ctx.from.id);
  
  if (!user.premium && user.credits <= 0) {
    return ctx.reply('Insufficient Credits\n\n🔗 Invite friends for +3 credits each\n💎 Upgrade to Premium for ₦500/month unlimited access', mainMenu);
  }
  
  if (!user.premium) {
    user.credits -= 1;
    saveDB();
  }
  
  const waitMsg = await ctx.reply(`🔍 Generating ${exam.toUpperCase()} ${subject} ${year} question...\nCredits Remaining: ${user.premium? 'Unlimited' : user.credits} 💎`);
  
  try {
    const qData = await getQuestionFromGroq(exam, subject, year);
    
    if (!qData) {
      return ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, `❌ API Error\n\nCould not generate question. Check:\n1. GROQ_API_KEY is set in Render\n2. Run /testgrok to verify API\n3. Contact @Kingvoid_dev77`);
    }
    
    try {
      const img = await makeQuestionImage(`${exam.toUpperCase()} ${year}\n${subject}\n\n${qData.question}`);
      await ctx.replyWithPhoto({ source: img });
    } catch (imgError) {
      await ctx.reply(`📝 ${exam.toUpperCase()} ${year} - ${subject}\n\n${qData.question}`);
    }
    
    await ctx.sendPoll(
      `Select the correct answer:`,
      qData.options,
      { 
        type: 'quiz', 
        correct_option_id: qData.correct, 
        is_anonymous: false,
        explanation: user.premium? qData.explanation : 'Premium users see AI explanations. Upgrade via 💎 Premium'
      }
    );
    
    await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id);
    
  } catch (e) {
    console.error('Send question error:', e);
    await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, '❌ Server Error\n\nFailed to generate question. Please try again.');
  }
}

bot.command('jamb', mustJoin, (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) return ctx.reply('Usage: /jamb Mathematics 2021');
  sendQuestion(ctx, 'jamb', parts[1], parts[2]);
});

bot.command('waec', mustJoin, (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) return ctx.reply('Usage: /waec English 2020');
  sendQuestion(ctx, 'waec', parts[1], parts[2]);
});

bot.command('neco', mustJoin, (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) return ctx.reply('Usage: /neco Physics 2019');
  sendQuestion(ctx, 'neco', parts[1], parts[2]);
});

bot.hears('📚 JAMB', mustJoin, (ctx) => ctx.reply('Enter command:\n/jamb Subject Year\n\nExample: /jamb Mathematics 2021'));
bot.hears('📖 WAEC', mustJoin, (ctx) => ctx.reply('Enter command:\n/waec Subject Year\n\nExample: /waec English 2020'));
bot.hears('📝 NECO', mustJoin, (ctx) => ctx.reply('Enter command:\n/neco Subject Year\n\nExample: /neco Physics 2019'));

bot.hears('💎 Premium', mustJoin, (ctx) => {
  ctx.reply(
    `💎 KING VOID PREMIUM\n\nSubscription: ₦500/month\n\nBenefits:\n✅ Unlimited daily questions\n✅ AI-powered explanations\n✅ UTME score predictor\n✅ All subjects & years\n\nPayment Details:\nBank: OPAY\nAccount: 9154472946\nName: KING VOID\n\nAfter payment, send proof to:\nTelegram: @Kingvoid_dev77\nWhatsApp: 2348036377933\n\nYour User ID: ${ctx.from.id}`,
    Markup.inlineKeyboard([
      [Markup.button.url('Contact Admin', 'https://t.me/Kingvoid_dev77')],
      [Markup.button.url('WhatsApp', 'https://wa.me/2348036377933')]
    ])
  );
});

// ===== GROQ API - WORKS WITH gsk- KEY =====
async function getQuestionFromGroq(exam, subject, year) {
  if (!GROQ_API_KEY) {
    console.log('❌ GROQ_API_KEY missing');
    return null;
  }
  
  const prompt = `Create a realistic ${exam.toUpperCase()} ${subject} ${year} past question for Nigerian students. Return ONLY valid JSON:
{"question":"Full question text here","options":["A. option1","B. option2","C. option3","D. option4"],"correct":0,"explanation":"Brief explanation why correct"}
correct is 0-3 for A-D. Make it authentic ${exam.toUpperCase()} style. ONLY JSON, no other text.`;

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 600
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    const content = response.data.choices[0].message.content;
    console.log('Groq response:', content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('No JSON in response');
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.question ||!parsed.options || parsed.correct === undefined || parsed.options.length!== 4) {
      console.log('Invalid format');
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error('Groq error:', error.response?.data || error.message);
    return null;
  }
}

async function makeQuestionImage(text) {
  const width = 900;
  const height = 650;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  
  ctx.strokeStyle = '#1A1A2E';
  ctx.lineWidth = 4;
  ctx.strokeRect(15, 15, width - 30, height - 30);
  
  ctx.fillStyle = '#0F3460';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('KING VOID EXAM BOT', 40, 70);
  
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#E94560';
  ctx.fillText('JAMB | WAEC | NECO PAST QUESTIONS', 40, 105);
  
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
    ctx.font = line.match(/JAMB|WAEC|NECO/)? 'bold 24px sans-serif' : '20px sans-serif';
    
    words.forEach(word => {
      const testLine = currentLine + word + ' ';
      if (ctx.measureText(testLine).width > width - 80) {
        ctx.fillText(currentLine, 40, y);
        y += 36;
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    });
    ctx.fillText(currentLine, 40, y);
    y += 42;
  });
  
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#6C757D';
  ctx.fillText('@King_void_exam_bot', 40, height - 30);
  
  return canvas.toBuffer('image/png');
}

bot.launch({
  dropPendingUpdates: true // This kills ghost instances
});
console.log('KING VOID EXAM BOT ONLINE - GROQ ENABLED');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
