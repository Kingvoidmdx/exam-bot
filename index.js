const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const sharp = require('sharp');

// ===== CONFIG - DAVID JOSHUA UGIAGBE / KING VAL =====
const ADMIN_ID = 8674514245; 
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PREMIUM_PRICE = 800;

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

// ===== SUBJECT KEYWORDS - ALL SUBJECTS =====
const SUBJECT_VALIDATION = {
  mathematics: ['calculate', 'solve', 'equation', 'f(x)', 'derivative', 'integral', 'probability', 'log', 'sin', 'cos', 'tan', 'algebra', 'geometry', 'x', 'y'],
  english: ['passage', 'comprehension', 'synonym', 'antonym', 'grammar', 'lexis', 'structure', 'oral', 'speech', 'phonetic', 'sentence'],
  physics: ['force', 'velocity', 'acceleration', 'energy', 'wavelength', 'current', 'voltage', 'resistance', 'newton', 'joule', 'ohm'],
  chemistry: ['element', 'compound', 'reaction', 'acid', 'base', 'salt', 'mole', 'atom', 'molecule', 'organic', 'periodic'],
  biology: ['cell', 'organism', 'photosynthesis', 'genetics', 'ecosystem', 'evolution', 'mitosis', 'meiosis', 'chromosome', 'species'],
  economics: ['demand', 'supply', 'inflation', 'gdp', 'market', 'price', 'cost', 'revenue', 'profit', 'elasticity', 'monopoly'],
  government: ['constitution', 'democracy', 'legislature', 'executive', 'judiciary', 'federalism', 'political party', 'election', 'sovereignty'],
  literature: ['prose', 'poetry', 'drama', 'novel', 'plot', 'theme', 'character', 'metaphor', 'simile', 'alliteration', 'author'],
  commerce: ['trade', 'business', 'marketing', 'advertising', 'bank', 'insurance', 'transport', 'warehouse', 'capital', 'partnership'],
  crk: ['bible', 'jesus', 'moses', 'abraham', 'genesis', 'exodus', 'psalm', 'gospel', 'parables', 'apostle'],
  irk: ['quran', 'muhammad', 'allah', 'hadith', 'surah', 'prayer', 'fasting', 'hajj', 'zakat', 'prophet'],
  history: ['colonial', 'independence', 'war', 'empire', 'kingdom', 'treaty', 'revolution', 'civilization', 'ancient', 'century'],
  geography: ['map', 'climate', 'weather', 'latitude', 'longitude', 'continent', 'river', 'mountain', 'population', 'vegetation']
};

// ===== 2026 SCHEME OF WORK =====
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

// ===== IMAGE GENERATOR =====
async function createQuestionImage(exam, subject, year, question, options) {
  const displaySubject = subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();
  
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
  
  const questionLines = wrapText(question, 40);
  const height = 600 + (questionLines.length * 40);
  
  const svg = `
  <svg width="1100" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="1100" height="${height}" fill="#000000"/>
    <rect x="40" y="40" width="1020" height="${height-80}" fill="none" stroke="#ff0033" stroke-width="6"/>
    
    <text x="550" y="100" font-family="Impact, Arial Black" font-size="50" font-weight="900" fill="#ff0033" text-anchor="middle">
      ${exam.toUpperCase()} ${year} - ${displaySubject}
    </text>
    
    <line x1="80" y1="130" x2="1020" y2="130" stroke="#ff0033" stroke-width="5"/>
    
    ${questionLines.map((line, i) => `
      <text x="80" y="${210 + i*42}" font-family="Arial" font-size="32" font-weight="900" fill="#ffffff">${line}</text>
    `).join('')}
    
    ${options.map((opt, i) => `
      <text x="80" y="${280 + questionLines.length*42 + i*50}" font-family="Arial" font-size="28" font-weight="800" fill="#f5f5f5">${opt}</text>
    `).join('')}
    
    <text x="550" y="${height-60}" font-family="Arial" font-size="20" font-weight="bold" fill="#444" text-anchor="middle">KING VOID EXAM BOT - ANTI-COPY PROTECTION</text>
  </svg>`;
  
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

// ===== SEND QUESTION =====
async function sendQuestion(ctx, exam, subject, year, difficulty = 'mixed') {
  const user = getUser(ctx.from.id);
  
  if (!user.premium && user.credits <= 0) {
    return ctx.reply(`Insufficient Credits\n\n🔗 Invite friends for +3 credits each\n💎 Upgrade to Premium for ₦${PREMIUM_PRICE}/month`, mainMenu);
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
    return ctx.reply(`❌ Question Generation Failed\n\nAI returned wrong subject or invalid format. Please try again.`);
  }
  
  let imageSent = false;
  try {
    const imageBuffer = await createQuestionImage(exam, subject, year, qData.question, qData.options);
    await ctx.replyWithPhoto(
      { source: imageBuffer },
      { caption: `📝 ${exam.toUpperCase()} ${year} - ${subject}` }
    );
    imageSent = true;
  } catch (imgErr) {
    console.error('Image send failed:', imgErr);
    return ctx.reply('❌ Failed to send question image. Please try again.');
  }
  
  if (imageSent) {
    try {
      const pollOptions = qData.options.map(opt => {
        let clean = opt.replace(/^[A-D]\.\s*/, '').trim();
        clean = clean.replace(/[\n\r]/g, ' ');
        clean = clean.replace(/[^\x00-\x7F]/g, '');
        return clean.length > 90? clean.substring(0, 87) + '...' : clean;
      });
      
      await ctx.sendPoll(
        `Select the correct answer:`,
        pollOptions,
        { 
          type: 'quiz', 
          correct_option_id: Number(qData.correct), 
          is_anonymous: false,
          explanation: user.premium? qData.explanation.substring(0, 200) : `Premium users see AI explanations. Upgrade via 💎 Premium`
        }
      );
    } catch (pollError) {
      console.error('Poll failed:', pollError.message);
      await ctx.reply(`✅ Question sent above.\n\nCorrect Answer: ${qData.options[qData.correct]}\n\n⚠️ Poll unavailable due to long options. Upgrade to Premium for explanations.`);
    }
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

// ===== PREMIUM - UPDATED WITH YOUR REAL NAME =====
bot.hears('💎 Premium', mustJoin, (ctx) => {
  ctx.reply(
    `💎 *𝗞𝗜𝗡𝗚 𝗩𝗢𝗜𝗗 𝗣𝗥𝗘𝗠𝗜𝗨𝗠*\n\n*Subscription: ₦${PREMIUM_PRICE}/month*\n\n*Benefits:*\n✅ Unlimited daily questions\n✅ AI-powered explanations\n✅ UTME score predictor\n✅ All subjects & years\n✅ 2026 Scheme of Work\n\n*Payment Details:*\nBank: *OPAY*\nAccount: *9154472946*\nName: *David Joshua Ugiagbe*\n\nAfter payment, send proof to:\nTelegram: @Kingvoid_dev77\nWhatsApp: 2348036377933\n\nYour User ID: ${ctx.from.id}`,
    Markup.inlineKeyboard([
      [Markup.button.url('Contact Admin', 'https://t.me/Kingvoid_dev77')],
      [Markup.button.url('WhatsApp', 'https://wa.me/2348036377933')]
    ])
  );
});

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

// ===== GROQ API - ALL SUBJECTS VALIDATION =====
async function getQuestionFromGroq(exam, subject, year, difficulty = 'mixed') {
  if (!GROQ_API_KEY) return null;
  
  const subjectLower = subject.toLowerCase();
  const examUpper = exam.toUpperCase();
  
  const difficultyPrompt = difficulty === 'hard' 
? 'Create a VERY DIFFICULT question. Use advanced concepts, calculations, and tricky options. Only 10% of students should get this.'
    : difficulty === 'simple'
? 'Create an EASY question. Basic concept, straightforward. 80% of students should get this.'
    : 'Randomly choose: 60% HARD questions, 40% EASY questions. Mix it up.';
  
  const prompt = `You are a ${examUpper} examiner for Nigerian students.

CRITICAL: You MUST create a question for the subject "${subject}" ONLY. 
If I ask for "English", you MUST NOT return Mathematics, Physics, or any other subject.
If I ask for "Physics", you MUST NOT return Chemistry or Biology.
The subject is "${subject}" - STICK TO IT 100%. NO EXCEPTIONS.

${difficultyPrompt}

STRICT RULES:
1. Subject MUST be: ${subject}. Verify before answering.
2. NEVER mention: diagram, figure, chart, graph, table, image, sketch, "in the diagram"
3. NEVER start with numbers like "1." 
4. Question must be 100% TEXT-ONLY solvable
5. Use real ${examUpper} ${year} difficulty and style from Nigeria
6. Make wrong options very close to correct answer
7. KEEP EACH OPTION UNDER 75 CHARACTERS

Return ONLY JSON:
{"question":"Question text for ${subject}","options":["A. option1","B. option2","C. option3","D. option4"],"correct":0,"explanation":"Why correct","difficulty":"hard or simple","subject_check":"${subject}"}

correct is 0=A, 1=B, 2=C, 3=D. 
You MUST include "subject_check":"${subject}" to prove you understood.
ONLY JSON.`;

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [
        { 
          role: 'system', 
          content: `You are a strict ${examUpper} examiner. You NEVER mix subjects. If asked for English, you give English. If asked for Mathematics, you give Mathematics. You follow instructions 100%. You validate subject before responding.` 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.05,
      max_tokens: 800
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    const content = response.data.choices[0].message.content;
    console.log('Groq response:', content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('No JSON found');
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // ===== 101% STRICT VALIDATION FOR ALL SUBJECTS =====
    if (!parsed.question ||!parsed.options || parsed.correct === undefined || parsed.options.length!== 4) {
      console.log('Invalid format');
      return null;
    }
    
    // CHECK 1: Subject verification
    if (parsed.subject_check && parsed.subject_check.toLowerCase()!== subjectLower) {
      console.log(`WRONG SUBJECT: Expected ${subject}, Got ${parsed.subject_check}`);
      return null;
    }
    
    // CHECK 2: No diagrams
    const bannedWords = ['diagram', 'figure', 'chart', 'graph', 'table', 'sketch', 'image'];
    const lowerQ = parsed.question.toLowerCase();
    if (bannedWords.some(word => lowerQ.includes(word))) {
      console.log('Rejected: Contains diagram reference');
      return null;
    }
    
    // CHECK 3: Cross-subject contamination check for ALL subjects
    const keywords = SUBJECT_VALIDATION[subjectLower];
    if (keywords) {
      const hasSubjectKeyword = keywords.some(kw => lowerQ.includes(kw));
      const wrongSubjects = Object.keys(SUBJECT_VALIDATION).filter(s => s!== subjectLower);
      const wrongKeywords = wrongSubjects.flatMap(s => SUBJECT_VALIDATION[s]).filter(kw => lowerQ.includes(kw));
      
      if (!hasSubjectKeyword && wrongKeywords.length > 2) {
        console.log(`Rejected: Wrong subject content. Expected ${subject}, found: ${wrongKeywords.slice(0,3).join(', ')}`);
        return null;
      }
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
console.log('KING VOID EXAM BOT V3.1 - DAVID JOSHUA UGIAGBE - ALL SUBJECTS VALIDATED - ₦800 PREMIUM - KING VAL READY');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
