const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const sharp = require('sharp');

// ===== CONFIG - KING VAL / DAVIDSON'S BOT =====
const ADMIN_ID = 8674514245; 
const GROQ_API_KEY = process.env.GROQ_API_KEY;

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

// ===== 2026 SCHEME OF WORK - JAMB =====
const JAMB_SCHEMES = {
  science: {
    name: 'SCIENCE',
    subjects: ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology'],
    topics: {
      Mathematics: ['Number Bases', 'Indices/Logarithms', 'Calculus', 'Probability', 'Vectors', 'Trigonometry'],
      Physics: ['Mechanics', 'Waves', 'Electricity', 'Nuclear Physics', 'Heat Energy'],
      Chemistry: ['Stoichiometry', 'Organic Chemistry', 'Electrochemistry', 'Acids/Bases', 'Periodic Table'],
      Biology: ['Cell Biology', 'Genetics', 'Ecology', 'Evolution', 'Human Physiology']
    }
  },
  social: {
    name: 'SOCIAL SCIENCE', 
    subjects: ['Mathematics', 'English', 'Economics', 'Government', 'Commerce'],
    topics: {
      Economics: ['Demand/Supply', 'National Income', 'Inflation', 'International Trade', 'Public Finance'],
      Government: ['Nigerian Constitution', 'Political Parties', 'Public Admin', 'International Org', 'Citizenship']
    }
  },
  arts: {
    name: 'ARTS',
    subjects: ['English', 'Literature', 'Government', 'CRK/IRK', 'History'],
    topics: {
      Literature: ['African Prose', 'Drama', 'Poetry', 'Literary Terms', 'Figures of Speech'],
      History: ['Nigerian History', 'West Africa', 'World Wars', 'Colonialism', 'Independence']
    }
  }
};

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
  ['📋 Scheme of Work', '👤 Profile'],
  ['🔗 Invite Friends']
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
      caption: `KING VOID EXAM BOT 🇳🇬\n\nWelcome ${user.name}\nUser ID: ${userId}\nCredits: ${user.credits} 💎\n\n📚 JAMB/WAEC/NECO Past Questions\n🤖 AI Explanations for Premium\n📋 2026 Scheme of Work\n\nCommands:\n/jamb Mathematics 2021\n/jamb course\n/jamb scheme`,
...mainMenu
    }
  );
});

bot.hears('📋 Scheme of Work', mustJoin, (ctx) => {
  ctx.reply(
    '📋 2026 SCHEME OF WORK\n\nSelect Exam Body:',
    Markup.inlineKeyboard([
      [Markup.button.callback('JAMB Scheme', 'scheme_jamb')],
      [Markup.button.callback('WAEC Scheme', 'scheme_waec')],
      [Markup.button.callback('NECO Scheme', 'scheme_neco')]
    ])
  );
});

bot.action('scheme_jamb', mustJoin, (ctx) => {
  ctx.editMessageText(
    '📚 JAMB 2026 SCHEME\n\nSelect Your Course:',
    Markup.inlineKeyboard([
      [Markup.button.callback('🔬 Science', 'jamb_science')],
      [Markup.button.callback('💼 Social Science', 'jamb_social')],
      [Markup.button.callback('🎭 Arts', 'jamb_arts')]
    ])
  );
});

bot.action(/jamb_(science|social|arts)/, mustJoin, (ctx) => {
  const course = ctx.match[1];
  const scheme = JAMB_SCHEMES[course];
  
  let text = `📋 *JAMB 2026 - ${scheme.name} SCHEME*\n\n*Subjects Required:*\n`;
  scheme.subjects.forEach((sub, i) => {
    text += `${i+1}. ${sub}\n`;
  });
  text += `\n*Key Topics to Master:*\n`;
  
  for (const [subject, topics] of Object.entries(scheme.topics)) {
    text += `\n*${subject}:*\n`;
    topics.forEach(t => text += `• ${t}\n`);
  }
  
  text += `\n⚠️ *Note:* JAMB tests 40 questions per subject. Focus on these topics.`;
  
  ctx.editMessageText(text, { parse_mode: 'Markdown' });
});

// ===== IMAGE GENERATOR - SHARP + SVG - ANTI-COPY =====
async function createQuestionImage(exam, subject, year, question, options) {
  const displaySubject = subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();
  
  // Split question into lines - max 60 chars per line
  const wrapText = (text, maxLen) => {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    words.forEach(word => {
      if ((current + word).length > maxLen) {
        lines.push(current.trim());
        current = word + ' ';
      } else {
        current += word + ' ';
      }
    });
    if (current) lines.push(current.trim());
    return lines;
  };
  
  const questionLines = wrapText(question, 55);
  const height = 400 + (questionLines.length * 25);
  
  const svg = `
  <svg width="800" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="800" height="${height}" fill="url(#bg)"/>
    <rect x="20" y="20" width="760" height="${height-40}" fill="none" stroke="#e94560" stroke-width="3"/>
    
    <text x="400" y="60" font-family="Arial" font-size="28" font-weight="bold" fill="#e94560" text-anchor="middle">
      ${exam.toUpperCase()} ${year} - ${displaySubject}
    </text>
    
    <line x1="50" y1="80" x2="750" y2="80" stroke="#e94560" stroke-width="2"/>
    
    ${questionLines.map((line, i) => `
      <text x="50" y="${130 + i*25}" font-family="Arial" font-size="18" fill="#ffffff">${line}</text>
    `).join('')}
    
    ${options.map((opt, i) => `
      <text x="50" y="${180 + questionLines.length*25 + i*30}" font-family="Arial" font-size="17" fill="#f5f5f5">${opt}</text>
    `).join('')}
    
    <text x="400" y="${height-30}" font-family="Arial" font-size="14" fill="#888" text-anchor="middle">KING VOID EXAM BOT - ANTI-COPY</text>
  </svg>`;
  
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

// ===== SEND QUESTION - IMAGE + HARD MODE =====
async function sendQuestion(ctx, exam, subject, year, difficulty = 'mixed') {
  const user = getUser(ctx.from.id);
  
  if (!user.premium && user.credits <= 0) {
    return ctx.reply('Insufficient Credits\n\n🔗 Invite friends for +3 credits each\n💎 Upgrade to Premium for ₦500/month', mainMenu);
  }
  
  if (!user.premium) {
    user.credits -= 1;
    saveDB();
  }
  
  const waitMsg = await ctx.reply(`🔍 Generating ${difficulty.toUpperCase()} ${exam.toUpperCase()} ${subject} ${year} question...\nCredits Remaining: ${user.premium? 'Unlimited' : user.credits} 💎`);
  
  let qData = null;
  try {
    qData = await getQuestionFromGroq(exam, subject, year, difficulty);
  } catch (e) {
    console.error('Groq call failed:', e);
  }
  
  try {
    await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id);
  } catch (e) {}
  
  if (!qData) {
    return ctx.reply(`❌ Question Generation Failed\n\nTry again or use different year/subject`);
  }
  
  try {
    // CREATE IMAGE - STUDENTS CAN'T COPY
    const imageBuffer = await createQuestionImage(exam, subject, year, qData.question, qData.options);
    
    await ctx.replyWithPhoto(
      { source: imageBuffer },
      { caption: `📝 Answer in the poll below ↓` }
    );
    
    // POLL
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
    
  } catch (e) {
    console.error('Send error:', e);
    await ctx.reply('❌ Failed to send question. Please try again.');
  }
}

// ===== SMART /JAMB COMMAND =====
bot.command('jamb', mustJoin, (ctx) => {
  const parts = ctx.message.text.split(' ');
  
  if (parts.length === 1) {
    return ctx.reply(
      '📚 *JAMB 2026*\n\nChoose option:\n\n1️⃣ `/jamb Subject Year` - Get past question\n Example: `/jamb Mathematics 2021`\n\n2️⃣ `/jamb course` - See subjects for your course\n\n3️⃣ `/jamb scheme` - View 2026 scheme of work',
      { parse_mode: 'Markdown' }
    );
  }
  
  if (parts[1] === 'course') {
    return ctx.reply(
      '📚 Select Your JAMB Course:',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔬 Science', 'jamb_science')],
        [Markup.button.callback('💼 Social Science', 'jamb_social')],
        [Markup.button.callback('🎭 Arts', 'jamb_arts')]
      ])
    );
  }
  
  if (parts[1] === 'scheme') {
    return ctx.reply(
      '📋 JAMB 2026 SCHEME\n\nSelect Course:',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔬 Science', 'jamb_science')],
        [Markup.button.callback('💼 Social Science', 'jamb_social')],
        [Markup.button.callback('🎭 Arts', 'jamb_arts')]
      ])
    );
  }
  
  if (parts.length < 3) {
    return ctx.reply('Usage: /jamb Subject Year\n\nExample: /jamb Mathematics 2021\n\nOr: /jamb course');
  }
  
  sendQuestion(ctx, 'jamb', parts[1], parts[2], 'hard');
});

// Similar for WAEC/NECO
bot.command('waec', mustJoin, (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) return ctx.reply('Usage: /waec Subject Year\n\nExample: /waec English 2020');
  sendQuestion(ctx, 'waec', parts[1], parts[2], 'hard');
});

bot.command('neco', mustJoin, (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) return ctx.reply('Usage: /neco Physics 2019');
  sendQuestion(ctx, 'neco', parts[1], parts[2], 'hard');
});

bot.hears('📚 JAMB', mustJoin, (ctx) => ctx.reply('Use /jamb to see options'));
bot.hears('📖 WAEC', mustJoin, (ctx) => ctx.reply('Use /waec Subject Year\n\nExample: /waec English 2020'));
bot.hears('📝 NECO', mustJoin, (ctx) => ctx.reply('Use /neco Subject Year\n\nExample: /neco Physics 2019'));

bot.hears('💎 Premium', mustJoin, (ctx) => {
  ctx.reply(
    `💎 KING VOID PREMIUM\n\nSubscription: ₦500/month\n\nBenefits:\n✅ Unlimited daily questions\n✅ AI-powered explanations\n✅ UTME score predictor\n✅ All subjects & years\n✅ 2026 Scheme of Work\n\nPayment Details:\nBank: OPAY\nAccount: 9154472946\nName: KING VOID\n\nAfter payment, send proof to:\nTelegram: @Kingvoid_dev77\nWhatsApp: 2348036377933\n\nYour User ID: ${ctx.from.id}`,
    Markup.inlineKeyboard([
      [Markup.button.url('Contact Admin', 'https://t.me/Kingvoid_dev77')],
      [Markup.button.url('WhatsApp', 'https://wa.me/2348036377933')]
    ])
  );
});

// ===== ADMIN COMMANDS =====
bot.command('activate', adminOnly, (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) return ctx.reply('Admin Usage:\n/activate user_id');
  
  const targetId = parts[1];
  const user = getUser(targetId);
  user.premium = true;
  user.credits = 99999;
  saveDB();
  
  ctx.reply(`✅ Premium Activated\n\nUser ID: ${targetId}\nStatus: Unlimited Access Granted`);
  
  try {
    ctx.telegram.sendMessage(targetId, `🎉 PREMIUM ACTIVATED\n\nYour account now has:\n✅ Unlimited questions\n✅ AI explanations enabled\n✅ Scheme of Work access`);
  } catch (e) {}
});

bot.command('testgrok', adminOnly, async (ctx) => {
  if (!GROQ_API_KEY) return ctx.reply('❌ GROQ_API_KEY not set');
  
  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Reply with JSON: {"status":"working"}' }],
      temperature: 0.1
    }, {
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
    });
    ctx.reply(`✅ GROQ API Working\n\nResponse: ${res.data.choices[0].message.content}`);
  } catch (e) {
    ctx.reply(`❌ GROQ API Error:\n${e.response?.data?.error?.message || e.message}`);
  }
});

bot.hears('👤 Profile', mustJoin, (ctx) => {
  const user = getUser(ctx.from.id);
  ctx.reply(
    `👤 User Profile\n\nName: ${user.name}\nUser ID: ${ctx.from.id}\nCredits: ${user.credits} 💎\nPremium Status: ${user.premium? 'Active ✅' : 'Inactive ❌'}\nTotal Referrals: ${user.invites}`
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

// ===== GROQ API - HARD + SIMPLE MIX - NO DIAGRAMS =====
async function getQuestionFromGroq(exam, subject, year, difficulty = 'mixed') {
  if (!GROQ_API_KEY) return null;
  
  const difficultyPrompt = difficulty === 'hard' 
   ? 'Create a VERY DIFFICULT question. Use advanced concepts, calculations, and tricky options. Only 10% of students should get this.'
    : difficulty === 'simple'
   ? 'Create an EASY question. Basic concept, straightforward. 80% of students should get this.'
    : 'Randomly choose: 60% HARD questions, 40% EASY questions. Mix it up.';
  
  const prompt = `You are a ${exam.toUpperCase()} examiner for 2026. Create ONE ${subject} ${year} question.

${difficultyPrompt}

CRITICAL RULES:
1. NEVER mention: diagram, figure, chart, graph, table, image, sketch, "in the diagram"
2. NEVER start with numbers like "1." 
3. Question must be 100% TEXT-ONLY solvable
4. Use real ${exam.toUpperCase()} difficulty and style
5. Make wrong options very close to correct answer to trick students

Return ONLY JSON:
{"question":"Question text","options":["A. option1","B. option2","C. option3","D. option4"],"correct":0,"explanation":"Why correct","difficulty":"hard or simple"}

correct is 0=A, 1=B, 2=C, 3=D. ONLY JSON.`;

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 700
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 25000
    });
    
    const content = response.data.choices[0].message.content;
    console.log('Groq response:', content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.question ||!parsed.options || parsed.correct === undefined || parsed.options.length!== 4) {
      return null;
    }
    
    const bannedWords = ['diagram', 'figure', 'chart', 'graph', 'table', 'sketch'];
    const lowerQ = parsed.question.toLowerCase();
    if (bannedWords.some(word => lowerQ.includes(word))) {
      console.log('Rejected: Contains diagram reference');
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error('Groq error:', error.response?.data || error.message);
    return null;
  }
}

bot.launch({
  dropPendingUpdates: true
});
console.log('KING VOID EXAM BOT V2 - SHARP IMAGES - ANTI-COPY - KING VAL READY');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
