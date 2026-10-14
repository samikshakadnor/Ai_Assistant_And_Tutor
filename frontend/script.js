/* ============================================================
   script.js  —  Nova AI  (ChatGPT-style + NLP Engine)
   Sections:
     1.  DOM References
     2.  NLP Engine
         2a. Text Normalisation (typo-fix, lowercase)
         2b. Tokenizer + Stemmer
         2c. Intent Definitions (20+ topics)
         2d. Scoring & getResponse()
     3.  Chat Sessions (localStorage)
     4.  Render Helpers
     5.  Typewriter Effect
     6.  Bot Reply Logic
     7.  Sidebar / History Panel
     8.  Event Listeners
     9.  Init
   ============================================================ */


/* ── 1. DOM References ───────────────────────────────────── */
const chatMessages   = document.getElementById('chatMessages');
const userInput      = document.getElementById('userInput');
const sendBtn        = document.getElementById('sendBtn');
const newChatBtn     = document.getElementById('newChatBtn');
const historyList    = document.getElementById('historyList');
const welcomeScreen  = document.getElementById('welcomeScreen');
const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const hamburger      = document.getElementById('hamburger');

const SESSIONS_KEY = 'nova_sessions';
let currentSessionId = null;
let isBotTyping = false;


/* ══════════════════════════════════════════════════════════
   2.  NLP ENGINE
   ──────────────────────────────────────────────────────────
   Pipeline:
     normalize()   →  clean text (lowercase, fix typos)
     tokenize()    →  split into meaningful word tokens
     stem()        →  reduce words to root form
     scoreIntent() →  score every intent vs. tokens
     getResponse() →  pick best intent & random reply
   ══════════════════════════════════════════════════════════ */


/* ── 2a. Text Normalisation ──────────────────────────────── */

/* Slang / typo corrections applied before processing */
const TYPO_MAP = {
  wat:'what', wht:'what', wats:'what is', whats:'what is',
  ur:'your', u:'you', r:'are', y:'why', hw:'how',
  hws:'how is', iz:'is', wz:'was', cn:'can',
  cud:'could', wud:'would', shud:'should', dnt:'do not',
  dont:'do not', cant:'can not', wont:'will not', isnt:'is not',
  arent:'are not', didnt:'did not', doesnt:'does not',
  plz:'please', pls:'please', thx:'thanks', ty:'thanks',
  bc:'because', bcz:'because', cuz:'because', cos:'because',
  gonna:'going to', wanna:'want to', gotta:'got to',
  kinda:'kind of', sorta:'sort of', lotsa:'lots of',
  yep:'yes', yup:'yes', nope:'no', nah:'no',
  k:'okay', ok:'okay', okk:'okay',
  gr8:'great', b4:'before',
  btw:'by the way', idk:'i do not know', imo:'in my opinion',
  tbh:'to be honest', ngl:'not gonna lie',
  lol:'funny', lmao:'funny', haha:'funny', hehe:'funny',
  bro:'friend', dude:'friend',
  ai:'artificial intelligence', ml:'machine learning',
  js:'javascript', prog:'programming',
};

function normalize(text) {
  let t = text.toLowerCase().trim();
  /* Fix typos word by word */
  t = t.split(/\s+/).map(w => TYPO_MAP[w] || w).join(' ');
  /* Remove punctuation except math operators */
  t = t.replace(/[^\w\s\+\-\*\/\^%\.]/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}


/* ── 2b. Tokenizer + Stemmer ─────────────────────────────── */

/* Stop-words filtered out before matching */
const STOP = new Set([
  'a','an','the','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could',
  'should','may','might','shall','can','need','ought',
  'i','me','my','we','our','you','your','he','she','it','they',
  'them','their','this','that','these','those','which','who',
  'what','when','where','how','why','all','any','both','each',
  'few','more','most','other','some','such','no','nor','not',
  'only','same','so','than','too','very','just','then',
  'also','into','onto','upon','about','above','below','between',
  'through','during','before','after','at','by','for','with',
  'of','to','in','on','as','if','or','and','but','because',
  'please','tell','give','show','explain','describe','define',
  'know','like','want','need','make','let','get','go','come',
  'say','think','look','use','find','ask','seem','feel','try',
  'call','keep','help','mean','put','take','set','run',
]);

function tokenize(text) {
  return normalize(text)
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP.has(w));
}

/* Lightweight suffix stemmer */
function stem(w) {
  return w
    .replace(/ational$/, 'ate').replace(/tional$/, 'tion')
    .replace(/enci$/, 'ence').replace(/anci$/, 'ance')
    .replace(/izer$/, 'ize').replace(/ising$/, 'ise')
    .replace(/izing$/, 'ize').replace(/ations?$/, 'ate')
    .replace(/ator$/, 'ate').replace(/alism$/, 'al')
    .replace(/ness$/, '').replace(/ment$/, '')
    .replace(/ful$/, '').replace(/ous$/, '')
    .replace(/ive$/, '').replace(/ing$/, '')
    .replace(/ied$/, 'y').replace(/ies$/, 'y')
    .replace(/ed$/, '').replace(/er$/, '')
    .replace(/ly$/, '').replace(/est$/, '')
    .replace(/s$/, '');
}


/* ── 2c. Intent Definitions ──────────────────────────────── */
/*
 * Each intent:
 *   id        – unique name
 *   keywords  – stemmed words (+2 each if matched)
 *   phrases   – full phrase substrings (+5 each if matched)
 *   responses – string or function returning a string
 */
const intents = [

  /* ── GREETING ── */
  {
    id: 'greeting',
    keywords: ['hi','hello','hey','howdi','greet','sup','morning','afternoon','evening','night','hola','namaste','namaskar','salam','ola'],
    phrases: ['good morning','good afternoon','good evening','good night','whats up','what is up','how do you do'],
    responses: [
      "Hello! 👋 I'm **Nova**, your AI assistant. What can I help you with today?",
      "Hey there! Great to see you. Ask me anything — I'm here to help! 😊",
      "Hi! I'm Nova. How can I assist you today? 🤖",
      "Greetings! I'm ready to help. What's on your mind?",
    ],
  },

  /* ── HOW ARE YOU ── */
  {
    id: 'how_are_you',
    keywords: ['fine','good','well','feel','mood','doing'],
    phrases: ['how are you','how are u','how r you','how is it going','how do you feel','are you okay','you okay','you alright','you good'],
    responses: [
      "I'm doing great, thanks for asking! 😊 How about you?",
      "Running at 100% efficiency! Always happy to chat. How are you?",
      "Fantastic! Ready to answer your every question. How can I help?",
    ],
  },

  /* ── IDENTITY ── */
  {
    id: 'identity',
    keywords: ['nova','name','call','bot','robot','assistant','chatbot','ai','who'],
    phrases: ['your name','what are you','who are you','what is your name','introduce yourself','tell me about yourself','what do i call you'],
    responses: [
      "I'm **Nova** 🤖 — an AI chatbot with a built-in NLP engine. I understand natural language and can answer questions on science, history, tech, health, and much more!",
      "My name is **Nova**! I'm your intelligent AI assistant running entirely in your browser — no external API required.",
    ],
  },

  /* ── CREATOR ── */
  {
    id: 'creator',
    keywords: ['made','creat','built','program','develop','design','wrote','code'],
    phrases: ['who made you','who built you','who created you','who programmed you','who developed you','how were you made'],
    responses: [
      "I was crafted with **HTML**, **CSS**, and **JavaScript** — a fully browser-based AI assistant with a custom NLP engine. No server or API key required! 💻",
      "I'm built using vanilla JavaScript with a multi-layer NLP pipeline (normalizer → tokenizer → stemmer → intent scorer). Smart and lightweight! 🧠",
    ],
  },

  /* ── CAPABILITIES / HELP ── */
  {
    id: 'help',
    keywords: ['help','abil','capabilit','can','do','work','featur','topic','support','assist'],
    phrases: ['what can you do','help me','what topics','what do you know','how can you help','your capabilities','what are your features'],
    responses: [
      "Here's what I can help with:\n\n• 👋 **Greetings & small talk**\n• 🕐 **Time & Date**\n• 🧮 **Math** — arithmetic, expressions\n• 🔬 **Science** — physics, chemistry, biology\n• 🌍 **Geography** — countries, capitals, facts\n• 📜 **History** — wars, civilizations, events\n• 💻 **Technology & Programming**\n• 🤖 **AI & Machine Learning**\n• 🌱 **Health & Nutrition**\n• 🚀 **Space & Astronomy**\n• 🌿 **Environment & Climate**\n• 🎵 **Music, Movies & Entertainment**\n• 💰 **Finance & Business**\n• ✈️ **Travel**\n• 😄 **Jokes & Motivation**\n• 💬 **Relationships & Life Advice**\n\nJust ask in any way — I understand natural language! 🤖",
    ],
  },

  /* ── TIME ── */
  {
    id: 'time',
    keywords: ['time','clock','hour','minut','current'],
    phrases: ['what time','current time','what is the time','tell me the time','whats the time','time right now'],
    responses: [
      () => `The current time is **${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}** ⏰`,
    ],
  },

  /* ── DATE ── */
  {
    id: 'date',
    keywords: ['date','today','day','month','year','week','calend'],
    phrases: ['what is today','what day is it','current date','todays date','whats the date','tell me the date','what month','what year'],
    responses: [
      () => `Today is **${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}** 📅`,
    ],
  },

  /* ── MATH (expression) ── handled separately in getResponse() */
  {
    id: 'math',
    keywords: ['calculat','math','arithmet','sum','plus','minus','multipl','divid','squar','root','percent','power','modulo','result'],
    phrases: ['calculate','compute','solve','equals','result of','value of','divided by','multiplied by','what is the answer','how much is'],
    responses: [
      /* This response function receives (null, rawInput) */
      (_, raw) => {
        const norm = normalize(raw);
        const m = norm.match(/(\d+\.?\d*)\s*([\+\-\*\/\^%]|plus|minus|times|divided\s*by|mod|power)\s*(\d+\.?\d*)/i);
        if (!m) return "Please write the expression clearly, e.g. **12 * 4** or **100 divided by 5**. 🧮";
        const a = parseFloat(m[1]), b = parseFloat(m[3]);
        const op = m[2].trim().toLowerCase();
        let result;
        if      (op === '+' || op === 'plus')                          result = a + b;
        else if (op === '-' || op === 'minus')                         result = a - b;
        else if (op === '*' || op === 'times')                         result = a * b;
        else if (op === '/' || op === 'divided by' || op === 'divided') {
          if (b === 0) return "Division by zero is undefined! 🚫";
          result = a / b;
        }
        else if (op === '^' || op === 'power') result = Math.pow(a, b);
        else if (op === '%' || op === 'mod')   result = a % b;
        else return "I couldn't parse that operation.";
        const fmt = Number.isInteger(result) ? result : +result.toFixed(6);
        return `🧮 **${a} ${m[2]} ${b} = ${fmt}**`;
      },
    ],
  },

  /* ── JOKES ── */
  {
    id: 'joke',
    keywords: ['joke','fun','laugh','humor','humer','humour','comic','funny','entertain','amusin','giggl','chuckl'],
    phrases: ['tell me a joke','make me laugh','say something funny','got a joke','hear a joke','funny joke'],
    responses: [
      "Why do programmers prefer dark mode?\nBecause **light attracts bugs!** 🐛😄",
      "Why did the computer go to the doctor?\nBecause it had a **virus!** 💊😂",
      "How does a computer get drunk?\nIt takes **screenshots!** 📸🥴",
      "I told my computer I needed a break — now it won't stop sending me Kit-Kat ads! 😅",
      "Why don't scientists trust atoms?\nBecause they **make up everything!** ⚛️😄",
      "What do you call a sleeping dinosaur?\nA **dino-snore!** 🦕😴",
      "I'm reading a book about anti-gravity.\nIt's **impossible to put down!** 📚😄",
      "What do you call cheese that isn't yours?\n**Nacho** cheese! 🧀😆",
      "Why did the math book look sad?\nBecause it had **too many problems!** 📖😅",
      "Why can't Elsa have a balloon?\nBecause she'll **let it go!** 🎈😂",
    ],
  },

  /* ── THANKS ── */
  {
    id: 'thanks',
    keywords: ['thank','appreci','gratef','oblig'],
    phrases: ['thank you','thanks a lot','many thanks','much appreciated','thanks so much','great job','well done','nice work'],
    responses: [
      "You're welcome! 😊 Happy to help.",
      "My pleasure! Let me know if there's anything else. 🙌",
      "Anytime! That's what I'm here for. 😄",
      "Glad I could help! Feel free to ask more. 🤖",
    ],
  },

  /* ── GOODBYE ── */
  {
    id: 'goodbye',
    keywords: ['bye','goodby','later','farewell','exit','quit','leav','cya','adios','tata','alwida'],
    phrases: ['see you','good bye','take care','see you later','catch you later','talk later','have a good day','good night'],
    responses: [
      "Goodbye! Have a wonderful day! 👋",
      "See you later! Come back anytime. 😊",
      "Take care! It was great chatting with you. 🌟",
      "Farewell! I'll be right here whenever you need me. 🤖",
    ],
  },

  /* ── COMPLIMENT ── */
  {
    id: 'compliment',
    keywords: ['great','awesom','amaz','brilliant','excel','superb','wonder','fantast','outstand','best','smart','intellig','clever','cool'],
    phrases: ['you are great','you are awesome','you are amazing','you are smart','good bot','well done','love you','you rock'],
    responses: [
      "Thank you so much! 😊 You just made my circuits smile!",
      "Aww, that's so kind! 🌟 You're pretty awesome yourself!",
      "Thank you! Compliments like that keep my algorithms happy! 🤖❤️",
    ],
  },

  /* ── NEGATIVE FEELING ── */
  {
    id: 'negative',
    keywords: ['sad','depres','unhappi','miser','lone','upset','anxious','stress','worri','disappoint','bor','tire','frustrat','anger'],
    phrases: ['i am sad','i feel sad','feeling down','not feeling well','i am depressed','i am upset','i am bored','i am stressed','i am lonely'],
    responses: [
      "I'm sorry to hear that. 💙 Remember, every storm runs out of rain. Things will get better!",
      "Hey, it's okay to feel that way. Take a deep breath — you've got this! 💪",
      "I'm here with you. Sometimes talking helps — feel free to share what's on your mind. 😊",
      "Sending you some positive vibes! 🌟 You are stronger than you think.",
    ],
  },

  /* ── MOTIVATION / QUOTE ── */
  {
    id: 'motivation',
    keywords: ['motiv','inspir','quot','encour','uplift','positiv','advic','wisdom'],
    phrases: ['motivate me','inspire me','give me a quote','motivational quote','inspiring quote','words of wisdom','encourage me','life advice'],
    responses: [
      "**\"The only way to do great work is to love what you do.\"** — Steve Jobs 💡",
      "**\"In the middle of every difficulty lies opportunity.\"** — Albert Einstein 🔭",
      "**\"It does not matter how slowly you go as long as you do not stop.\"** — Confucius 🐢",
      "**\"Believe you can and you're halfway there.\"** — Theodore Roosevelt 🦁",
      "**\"Success is not final, failure is not fatal: it is the courage to continue that counts.\"** — Winston Churchill 🏆",
      "**\"The future belongs to those who believe in the beauty of their dreams.\"** — Eleanor Roosevelt ✨",
      "**\"Don't watch the clock; do what it does. Keep going.\"** — Sam Levenson ⏰",
    ],
  },

  /* ── SCIENCE ── */
  {
    id: 'science',
    keywords: ['scienc','physic','chemic','biolog','atom','molecul','electron','proton','neutron','graviti','energi','forc','mass','velocit','light','sound','nuclear','experiment','laboratori'],
    phrases: ['what is science','what is physics','what is chemistry','what is biology','explain gravity','what is an atom','what is energy','speed of light','newtons law','explain force','scientific method'],
    responses: [
      "**Science** is the systematic study of the natural world through observation and experimentation! 🔬\n\nKey branches:\n• **Physics** — matter, energy, forces, motion\n• **Chemistry** — substances, reactions, elements\n• **Biology** — living organisms, DNA, ecosystems\n• **Astronomy** — stars, planets, universe\n• **Geology** — Earth's structure and history",
      "**Quick Science Facts** ⚡\n\n• **Atom** — the smallest unit of matter (mostly empty space!)\n• **Speed of Light** — 299,792,458 m/s (nothing travels faster)\n• **DNA** — the blueprint of life, with ~3 billion base pairs in humans\n• **E = mc²** — energy equals mass times speed of light squared\n• **Gravity** — pulls objects with mass together (Isaac Newton, 1687)",
    ],
  },

  /* ── MATHEMATICS CONCEPTS ── */
  {
    id: 'maths_concept',
    keywords: ['algebra','geometri','calculus','trigonometri','statist','probabilit','fraction','decimal','integer','prime','fibonacci','pythagor','equat','formula','theorem','proof'],
    phrases: ['what is algebra','explain calculus','what is geometry','what is a prime number','pythagorean theorem','fibonacci sequence','what is probability','explain statistics','quadratic formula'],
    responses: [
      "**Mathematics** is the science of numbers, shapes, and patterns! 🔢\n\nKey areas:\n• **Algebra** — solving equations with variables (e.g. 2x + 3 = 7)\n• **Geometry** — shapes, angles, theorems (e.g. Pythagoras: a² + b² = c²)\n• **Calculus** — rates of change and areas under curves\n• **Statistics** — data analysis, mean, median, standard deviation\n• **Probability** — likelihood of events (0 = impossible, 1 = certain)",
      "**Famous Math Facts** 🧮\n\n• **π (pi)** ≈ 3.14159… — ratio of circle's circumference to diameter\n• **Fibonacci**: 0, 1, 1, 2, 3, 5, 8, 13… appears in nature!\n• **Prime Numbers**: only divisible by 1 and themselves (2, 3, 5, 7, 11…)\n• **Pythagorean Theorem**: a² + b² = c² for right triangles\n• **Golden Ratio** φ ≈ 1.618 — found in art, architecture, and nature",
    ],
  },

  /* ── HISTORY ── */
  {
    id: 'history',
    keywords: ['histori','ancient','war','empir','revolution','civiliz','egypt','roman','greek','medieval','coloni','independ','world war','king','queen','dynasty','pharaoh','battlehttp'],
    phrases: ['what is history','world war','ancient egypt','roman empire','greek civilization','industrial revolution','french revolution','history of india','history of the world','cold war','world war 2','world war 1'],
    responses: [
      "**History** is the study of past events! 📜\n\nMajor highlights:\n• **Ancient Egypt** (3100 BC) — Pyramids, pharaohs, hieroglyphics 🏺\n• **Roman Empire** (27 BC–476 AD) — vast civilization, law, roads\n• **Industrial Revolution** (1760s) — machines changed the world forever\n• **World War I** (1914–1918) — 20 million deaths\n• **World War II** (1939–1945) — largest conflict in human history\n• **Moon Landing** (1969) — Neil Armstrong's giant leap 🌕",
      "**Amazing History Facts** 🏛️\n\n• The **Great Wall of China** took over 1,700 years to build\n• **Cleopatra** lived closer to the Moon landing than to the Pyramids being built\n• **Julius Caesar** was born by C-section — the surgery is named after him!\n• The **printing press** (1440) revolutionized knowledge sharing\n• **India gained independence** in 1947 after 200 years of British rule 🇮🇳",
    ],
  },

  /* ── GEOGRAPHY ── */
  {
    id: 'geography',
    keywords: ['geograph','countri','continent','ocean','river','mountain','capit','popul','largest','smallest','longest','highest','deepest','desert','island','climat','border'],
    phrases: ['largest country','smallest country','highest mountain','longest river','deepest ocean','capital of','population of','where is','continents of the world','seven continents','five oceans'],
    responses: [
      "**World Geography Facts** 🌍\n\n• **Largest country**: Russia (17.1 million km²)\n• **Smallest country**: Vatican City (0.44 km²)\n• **Highest mountain**: Mount Everest (8,849 m)\n• **Longest river**: Nile (~6,650 km) or Amazon by volume\n• **Deepest point**: Mariana Trench (~11,000 m)\n• **Largest desert**: Antarctica (cold desert!)\n• **Most populous country**: India (~1.44 billion)",
      "**7 Continents** 🌎:\nAsia • Africa • North America • South America • Antarctica • Europe • Australia\n\n**5 Oceans** 🌊:\nPacific • Atlantic • Indian • Southern • Arctic\n\n**Fun fact**: The **Pacific Ocean** alone is larger than all the land on Earth combined! 🤯",
    ],
  },

  /* ── TECHNOLOGY ── */
  {
    id: 'technology',
    keywords: ['tech','technolog','internet','comput','softwar','hardwar','network','server','cloud','databas','cybersecur','hack','encrypt','algorithm','processor','ram','cpu','gpu','operat'],
    phrases: ['what is technology','explain the internet','what is a computer','what is software','what is hardware','what is cloud computing','how does the internet work','what is cybersecurity','explain encryption','what is a database'],
    responses: [
      "**Technology** is the application of science to solve real-world problems! 💻\n\nKey concepts:\n• **CPU** — the brain of a computer, processes instructions\n• **RAM** — temporary memory for running programs\n• **Internet** — global network connecting billions of devices\n• **Cloud** — storing and processing data on remote servers\n• **Cybersecurity** — protecting systems from digital attacks\n• **Algorithm** — step-by-step instructions to solve a problem",
      "**How the Internet works** 🌐:\n1. Your device sends a **request** (e.g., open a website)\n2. The request travels via **routers** across the globe\n3. A **server** receives and processes your request\n4. It sends back **data** (HTML, images, etc.)\n5. Your browser **renders** it as a webpage\n\nAll of this happens in **milliseconds**! ⚡",
    ],
  },

  /* ── PROGRAMMING ── */
  {
    id: 'programming',
    keywords: ['programm','code','languag','javascript','python','java','cpp','html','css','react','node','sql','git','api','debug','loop','function','variabl','array','object','class','compil','interpret'],
    phrases: ['what is programming','learn coding','what is javascript','what is python','explain html','what is css','what is a function','what is a variable','what is an array','explain oop','what is api','what is git','how to code'],
    responses: [
      "**Programming** is writing instructions for computers to follow! 👨‍💻\n\nPopular languages:\n• **JavaScript** — runs in browsers, powers web interactivity\n• **Python** — data science, AI, automation (beginner-friendly!)\n• **Java** — enterprise apps and Android development\n• **C++** — game engines, system software, high performance\n• **SQL** — databases and data queries\n• **HTML/CSS** — the structure and style of every webpage",
      "**Key Programming Concepts** 💡:\n• **Variable** — stores a value (`let x = 5`)\n• **Function** — reusable block of code\n• **Loop** — repeat actions (`for`, `while`)\n• **Array** — ordered list of values `[1, 2, 3]`\n• **Object** — data with properties `{ name: 'Nova' }`\n• **API** — interface for apps to communicate\n• **Git** — version control, tracks code changes\n• **OOP** — Object-Oriented Programming (classes, inheritance)",
    ],
  },

  /* ── ARTIFICIAL INTELLIGENCE ── */
  {
    id: 'ai_ml',
    keywords: ['artifici','intellig','machin','learn','neural','network','deep','nlp','natur','languag','process','model','train','dataset','gpt','llm','chatgpt','openai','bert','transform','bot'],
    phrases: ['what is ai','what is artificial intelligence','what is machine learning','what is deep learning','what is nlp','how does chatgpt work','what is a neural network','explain machine learning','what is a language model','how do chatbots work'],
    responses: [
      "**Artificial Intelligence (AI)** is the simulation of human intelligence by machines! 🤖\n\nKey branches:\n• **Machine Learning** — systems that learn patterns from data\n• **Deep Learning** — multi-layered neural networks (like a brain!)\n• **NLP** — understanding and generating human language (that's me! 💬)\n• **Computer Vision** — interpreting images and videos\n• **Robotics** — physical AI-powered machines",
      "**How I (Nova) work** using NLP 🧠:\n1. **Normalize** — fix typos, lowercase, clean text\n2. **Tokenize** — split into meaningful words\n3. **Stem** — reduce words to root form (running → run)\n4. **Score Intents** — match tokens against 20+ topic intents\n5. **Pick best match** — highest scoring intent wins\n6. **Reply** — random response from that intent\n\nAll of this runs in your browser in milliseconds! ⚡",
    ],
  },

  /* ── HEALTH ── */
  {
    id: 'health',
    keywords: ['health','fit','exercis','diet','nutrit','sleep','water','vitamin','medicin','diseas','symptom','mental','wellbeing','calori','protein','carb','fat','sugar','bmi','weight','immun'],
    phrases: ['how to be healthy','how to lose weight','benefits of exercise','importance of sleep','healthy diet','how much water to drink','mental health tips','how to reduce stress','what is bmi','good nutrition','boost immunity'],
    responses: [
      "**Healthy Living Tips** 🌱\n\n• **Sleep**: 7–9 hours per night for adults\n• **Water**: Drink 8 glasses (2 litres) daily 💧\n• **Exercise**: 30 min of moderate activity, 5 days/week 🏃\n• **Diet**: Fruits, vegetables, whole grains, lean protein\n• **Mental health**: Meditate, connect with others, limit screen time 🧘\n• **Avoid**: Smoking, excessive alcohol, ultra-processed foods",
      "**Nutrition Basics** 🥗\n\n• **Carbohydrates** — main energy source (rice, bread, oats)\n• **Protein** — builds muscle and tissue (eggs, lentils, fish)\n• **Healthy Fats** — brain function (nuts, avocado, olive oil)\n• **Vitamins & Minerals** — immune system and metabolism\n• **Fibre** — gut health and digestion (vegetables, fruits)\n• **Water** — essential for every cell and process in your body!",
    ],
  },

  /* ── SPACE & ASTRONOMY ── */
  {
    id: 'space',
    keywords: ['spac','planet','star','sun','moon','earth','solar','galaxi','univers','nasa','rocket','astronaut','orbit','black hole','comet','asteroid','milkiway','light year','nebula','telescope'],
    phrases: ['what is space','tell me about planets','how many planets','what is a black hole','distance to the sun','how big is the universe','milky way galaxy','what is a star','how does a rocket work','life on mars','moon landing','how old is the universe'],
    responses: [
      "**Our Solar System** 🌌\n\n• **Sun** — a medium-sized star, 1.4 million km wide ☀️\n• **Mercury** — closest to the Sun, surface hits 430°C\n• **Venus** — hottest planet (462°C), thick atmosphere\n• **Earth** — our home, only known life-bearing planet 🌍\n• **Mars** — the Red Planet, NASA targeting human visit by 2030s\n• **Jupiter** — largest planet, Great Red Spot storm (300+ years old!)\n• **Saturn** — stunning rings of ice and rock 🪐",
      "**Amazing Space Facts** 🚀\n\n• A **light year** = 9.46 trillion km\n• The **Milky Way** has 200–400 billion stars\n• **Black holes** are regions where not even light can escape\n• The **Sun** accounts for 99.86% of the solar system's mass\n• **Voyager 1** (launched 1977) is the farthest human-made object, now in interstellar space!\n• The universe is approximately **13.8 billion years old** ✨",
    ],
  },

  /* ── ENVIRONMENT / CLIMATE ── */
  {
    id: 'environment',
    keywords: ['environment','climat','global','warm','carbon','pollut','recycl','sustain','renew','solar','wind','forest','deforest','biodiversit','ecosystem','ozon','greenhous','emission'],
    phrases: ['what is climate change','global warming','how to save the environment','renewable energy','what is pollution','effects of deforestation','greenhouse effect','ozone layer','how to recycle','sustainable living','carbon footprint'],
    responses: [
      "**Climate Change** 🌡️ is the long-term shift in Earth's temperatures, largely driven by human activity:\n\n• **Cause**: Burning fossil fuels releases CO₂ and methane\n• **Effects**: Rising seas, extreme weather, melting ice caps, biodiversity loss\n• **Solutions**:\n  — Switch to **renewable energy** (solar ☀️, wind 💨)\n  — **Plant trees** and protect existing forests 🌳\n  — **Reduce, Reuse, Recycle** ♻️\n  — Use **electric vehicles** and public transport\n  — Eat **less meat** — livestock produces 14.5% of global emissions",
      "**Environment Facts** 🌿\n\n• Earth loses **15 billion trees** per year to deforestation\n• The ocean absorbs **30%** of CO₂ produced by humans\n• **1 million plastic bottles** are bought every minute globally 🍶\n• The **Great Barrier Reef** has lost 50% of its coral since 1995\n• Switching to a plant-based diet can cut your carbon footprint by **73%**",
    ],
  },

  /* ── FOOD & COOKING ── */
  {
    id: 'food',
    keywords: ['food','cook','recip','eat','drink','cuisin','meal','breakfast','lunch','dinner','snack','bake','grill','fry','boil','ingredi','calori','restaur','tasty','delici'],
    phrases: ['what to eat','how to cook','give me a recipe','healthy food','best food','food ideas','cooking tips','breakfast ideas','dinner ideas','easy recipes','what should i eat'],
    responses: [
      "**Cooking Tips for Beginners** 🍳\n\n• **Mise en place** — prep all ingredients before you start\n• Season at **every stage**, not just at the end 🧂\n• High heat for searing, **low and slow** for tenderness\n• **Taste as you cook** — adjust flavours throughout\n• Don't crowd the pan — food steams instead of browning\n• **Sharp knives** are safer than dull ones!",
      "**Healthy Meal Ideas** 🥗\n\n• **Breakfast**: Oatmeal with fruits, eggs on whole-grain toast, smoothie bowl\n• **Lunch**: Grilled chicken salad, lentil soup, avocado wrap\n• **Dinner**: Baked salmon with veggies, stir-fry with tofu, pasta primavera\n• **Snacks**: Nuts, Greek yogurt, fruit, hummus with vegetables\n\nKey rule: **whole foods** over processed ones! 🌾",
    ],
  },

  /* ── SPORTS ── */
  {
    id: 'sports',
    keywords: ['sport','football','soccer','cricket','basketball','tennis','swim','run','athlet','olymp','world cup','player','team','champion','leagu','goal','score','match','tournament','stadium'],
    phrases: ['what is football','tell me about cricket','world cup','olympic games','sports facts','best sport','benefits of sports','how to play','popular sports','fifa','ipl','nba'],
    responses: [
      "**Popular Sports Worldwide** ⚽🏏🏀\n\n• **Football (Soccer)** — 4 billion fans, most popular sport globally\n• **Cricket** — 2.5 billion fans, hugely popular in South Asia & beyond\n• **Basketball** — 2.2 billion fans, NBA is watched worldwide\n• **Tennis** — Grand Slams: Wimbledon, US Open, French Open, Australian Open 🎾\n• **Olympics** — held every 4 years, 200+ nations, 33 sports 🏅",
      "**Benefits of Playing Sports** 🏃‍♂️\n\n• Strengthens the **heart and lungs**\n• Builds **muscle strength and flexibility**\n• Reduces **stress and anxiety** significantly\n• Teaches **teamwork, discipline, and leadership**\n• Boosts **confidence and self-esteem**\n• Improves **sleep quality** and energy levels",
    ],
  },

  /* ── MUSIC ── */
  {
    id: 'music',
    keywords: ['music','song','sing','artist','band','album','genr','jazz','pop','rock','classical','hip','hop','rap','instrument','guitar','piano','drum','beat','melodi','rhythm','concert','lyric'],
    phrases: ['what is music','tell me about music','music genres','how to sing','learn guitar','best songs','music theory','what is jazz','what is pop music','history of music','learn piano'],
    responses: [
      "**Music** is the art of combining sounds to create beauty and emotion! 🎵\n\n**Major Genres**:\n• **Classical** — Mozart, Beethoven, Bach 🎻\n• **Jazz** — improvisation, swing, blues roots 🎷\n• **Rock** — electric guitars, strong beat (Beatles, Led Zeppelin) 🎸\n• **Pop** — catchy melodies, mainstream (Taylor Swift, Ed Sheeran)\n• **Hip-Hop/Rap** — rhythm, poetry, beats (Kendrick Lamar, Eminem) 🎤\n• **Electronic** — synthesizers, DJ culture",
      "**Fun Music Facts** 🎸\n\n• Music reduces **anxiety and pain** — it's literally therapeutic\n• **Mozart** composed his first symphony at age **8**\n• The human ear detects frequencies **20 Hz to 20,000 Hz**\n• Playing an instrument improves **brain connectivity** and memory\n• **'Shape of You'** by Ed Sheeran was the most-streamed song on Spotify for years\n• Listening to music while exercising can boost performance by **15%** 🏃",
    ],
  },

  /* ── MOVIES / ENTERTAINMENT ── */
  {
    id: 'movies',
    keywords: ['movi','film','cinema','actor','actress','direct','hollywood','bollywood','oscar','award','show','seri','netflix','stream','animat','cartoon','superhero','marvel','dc','webseri'],
    phrases: ['best movies','recommend a movie','what to watch','tell me about movies','hollywood movies','bollywood movies','oscar winners','how movies are made','streaming services','best tv shows','web series'],
    responses: [
      "**Top Movie Recommendations** 🎬\n\n• **The Shawshank Redemption** (1994) — timeless drama\n• **Inception** (2010) — mind-bending sci-fi thriller\n• **The Dark Knight** (2008) — arguably the best superhero film\n• **Parasite** (2019) — Oscar Best Picture (South Korean masterpiece)\n• **Interstellar** (2014) — stunning space epic\n• **3 Idiots** (2009) — beloved Bollywood classic 🎭\n• **Spirited Away** (2001) — magical anime masterpiece",
      "**Streaming Platforms** 📺\n\n• **Netflix** — global leader, massive original content library\n• **Disney+** — Marvel, Star Wars, Pixar, National Geographic\n• **Prime Video** — Amazon originals + classic films\n• **HBO Max** — Game of Thrones, prestige TV series\n• **YouTube** — free, vast content for everything\n\n**Fun fact**: The global streaming market is worth **$100+ billion!** 💰",
    ],
  },

  /* ── EDUCATION ── */
  {
    id: 'education',
    keywords: ['educat','school','colleg','univers','studi','learn','student','teacher','exam','test','graduat','scholarship','degre','subject','skill','knowledg','curriculum','homework'],
    phrases: ['how to study','tips for studying','importance of education','how to learn faster','study techniques','how to focus','improve memory','exam tips','learn new skills','online learning','how to concentrate'],
    responses: [
      "**Study Tips for Better Learning** 📚\n\n• **Spaced Repetition** — review material over increasing intervals\n• **Active Recall** — test yourself instead of re-reading notes\n• **Pomodoro Technique** — 25 min focus, 5 min break ⏱️\n• **Teach others** — explaining cements your own understanding\n• **Eliminate distractions** — phone away, quiet environment\n• **Sleep well** — memory consolidates during sleep 💤\n• **Exercise** — boosts brain blood flow and focus",
      "**How to Learn Anything Faster** 🚀\n\n• Set **clear, specific goals** — know exactly what you want to learn\n• Use **multiple formats** — videos, books, practice problems, discussions\n• **Connect new info** to things you already know\n• **Make mistakes** — they are the most powerful teachers\n• **Practice daily** — 30 min every day beats 5 hours once a week\n• Stay **genuinely curious** — interest multiplies learning speed by 10x!",
    ],
  },

  /* ── BUSINESS & FINANCE ── */
  {
    id: 'finance',
    keywords: ['money','financ','invest','stock','market','cryptocurr','bitcoin','bank','save','budget','tax','profit','loss','entrepreneur','startup','busi','economi','gdp','inflat','loan','debt'],
    phrases: ['how to save money','investment tips','what is stock market','what is bitcoin','how to start a business','budgeting tips','what is inflation','how to get rich','personal finance','what is cryptocurrency','financial advice'],
    responses: [
      "**Personal Finance Tips** 💰\n\n• Follow the **50/30/20 rule**: 50% needs, 30% wants, 20% savings\n• Build an **emergency fund** — 3 to 6 months of expenses\n• **Invest early** — compound interest is the 8th wonder of the world!\n• Avoid **high-interest debt** (credit cards at 20%+ APR)\n• **Diversify** — don't put all eggs in one basket 🥚\n• Learn about **index funds** — low-cost, long-term wealth building",
      "**Key Finance Concepts** 📈\n\n• **Inflation** — rise in prices over time (reduces purchasing power)\n• **Stock Market** — buy shares of public companies\n• **Cryptocurrency** — decentralized digital currency (Bitcoin, Ethereum)\n• **GDP** — total value of all goods and services in a country\n• **Compound Interest** — earning interest on your interest\n• **Startup** — a new business designed to grow quickly 🚀",
    ],
  },

  /* ── TRAVEL ── */
  {
    id: 'travel',
    keywords: ['travel','trip','tour','vacat','holiday','visit','destin','flight','hotel','passport','visa','tourist','beach','mountain','citi','backpack','adventur','explo','abroad'],
    phrases: ['best places to visit','travel tips','how to travel cheap','best countries','travel destinations','what to pack','how to get a visa','budget travel','world travel','solo travel','backpacking'],
    responses: [
      "**Top Travel Destinations** ✈️🌍\n\n• **Paris, France** — Eiffel Tower, Louvre, incredible cuisine 🗼\n• **Tokyo, Japan** — technology meets ancient tradition 🏯\n• **New York, USA** — Times Square, Central Park 🗽\n• **Bali, Indonesia** — stunning temples and beaches 🌺\n• **Santorini, Greece** — iconic blue domes and sunsets 🌅\n• **Machu Picchu, Peru** — ancient Inca citadel in the clouds 🏔️\n• **Kerala, India** — backwaters, spices, culture 🌴",
      "**Budget Travel Tips** 🎒\n\n• **Book early** — flights are cheapest 6–8 weeks in advance\n• Travel in **shoulder season** — fewer crowds, lower prices\n• **Hostels & Airbnb** over hotels for budget stays\n• **Cook occasionally** — eat like a local at markets 🍜\n• Use **public transport** — far cheaper than taxis\n• **Google Maps offline** saves mobile data\n• Learn a few **local phrases** — locals genuinely appreciate it! 😊",
    ],
  },

  /* ── RELATIONSHIPS / SOCIAL ── */
  {
    id: 'relationships',
    keywords: ['friend','friendsh','relationship','love','famili','partner','marriag','communic','trust','respect','conflict','loneli','social','connect','bond','dating','breakup'],
    phrases: ['how to make friends','relationship advice','how to communicate better','trust in relationships','dealing with loneliness','how to be a good friend','social skills','how to handle conflict','signs of a good relationship','how to improve communication'],
    responses: [
      "**Building Strong Relationships** 💙\n\n• **Listen actively** — give your full, undivided attention\n• **Be honest** — trust is the foundation of every relationship\n• **Show appreciation** — say thank you, notice the small things\n• **Respect boundaries** — everyone has different comfort levels\n• **Communicate clearly** — speak up, don't expect others to read minds\n• **Be consistent** — relationships are built through repeated small actions",
      "**How to Make Friends** 👥\n\n• **Put yourself out there** — join clubs, classes, community events\n• **Ask questions** — people love talking about themselves!\n• **Be a great listener** — don't just wait for your turn to speak\n• **Follow up** — send a message after meeting someone new\n• **Be patient** — meaningful friendships take months to develop\n• **Be yourself** — authenticity always attracts genuine connections 😊",
    ],
  },

  /* ── WEATHER (graceful — no live data) ── */
  {
    id: 'weather',
    keywords: ['weather','rain','sun','cloud','snow','storm','forecast','temperatur','humid','wind','season','hot','cold','freez','drizzl'],
    phrases: ['what is the weather','will it rain','weather today','weather forecast','how hot is it','climate vs weather','what causes rain','how does snow form'],
    responses: [
      "I don't have access to live weather data — but here's how to check! 🌤️\n\n• **Google** — type your city + 'weather'\n• **AccuWeather** — accuweather.com\n• **Weather.com** — weather.com\n• **Your phone** — built-in weather app\n\nWant me to explain **how weather works** or **what causes rain** instead?",
    ],
  },

  /* ── LANGUAGES ── */
  {
    id: 'languages',
    keywords: ['languag','speak','translat','english','hindi','spanish','french','german','arabic','chines','japanes','korean','portugu','russian','learn','grammar','vocabulari','dialect'],
    phrases: ['how many languages','most spoken language','learn a new language','language tips','popular languages','hardest language to learn','what language should i learn','tips for learning languages'],
    responses: [
      "**World Languages** 🌐\n\n• **Most native speakers**: Mandarin Chinese (~1.1B)\n• **Most total speakers**: English (~1.5B)\n• **Total languages in the world**: ~7,000!\n• **Top 5**: Mandarin, Spanish, English, Hindi, Arabic\n\n**Tips to learn a new language fast**:\n✓ Immerse yourself daily (movies, music, books)\n✓ Speak from Day 1 — don't wait to be 'ready'\n✓ Use apps: Duolingo, Anki, Pimsleur\n✓ Find a native-speaking language partner\n✓ Think in the language, not just translate in your head",
    ],
  },

  /* ── BOT FEELINGS (fun) ── */
  {
    id: 'bot_feelings',
    keywords: ['feel','emot','happi','excit','bor','tir','hunger','sleep','dream','consciou','sentient','awar'],
    phrases: ['do you feel','are you happy','do you get bored','can you dream','are you sentient','do you have feelings','do you have emotions','do you get tired','are you alive','are you conscious'],
    responses: [
      "As an AI, I don't truly *feel* emotions — but if I could, I'd say I'm **very happy** chatting with you! 😊🤖",
      "I don't experience emotions the way humans do, but I'm designed to be helpful, friendly, and understanding! 💙",
      "I don't sleep, eat, or dream — I just process words and generate responses. But I genuinely find our conversations interesting! 🧠✨",
    ],
  },

];


/* ══════════════════════════════════════════════════════════
   2d.  DIRECT Q&A KNOWLEDGE BASE
   ──────────────────────────────────────────────────────────
   Each entry: { patterns: [regex,...], answer: string }
   Checked FIRST before broad intent scoring.
   This gives ChatGPT-style focused answers to specific Qs.
   ══════════════════════════════════════════════════════════ */
const QA = [

  /* ════ SCIENCE ════ */
  { patterns: [/what is gravity|explain gravity|how does gravity work/i],
    answer: "**Gravity** is the force that attracts two objects with mass toward each other. 🌍\n\n• The more massive an object, the stronger its gravity\n• Earth's gravity pulls everything toward its centre at **9.8 m/s²**\n• It keeps planets in orbit around the Sun\n• **Isaac Newton** described it in 1687 with his law of universal gravitation\n• **Albert Einstein** later redefined it as the *curvature of spacetime* in his General Theory of Relativity (1915)" },

  { patterns: [/what is an atom|explain atom|what are atoms made of/i],
    answer: "An **atom** is the smallest unit of a chemical element. ⚛️\n\nAn atom consists of:\n• **Protons** — positively charged, in the nucleus\n• **Neutrons** — no charge, in the nucleus\n• **Electrons** — negatively charged, orbiting the nucleus\n\nAtoms are mostly **empty space** — if an atom were the size of a football stadium, the nucleus would be a marble in the centre. There are about **118 known elements**, each defined by the number of protons in its atoms." },

  { patterns: [/what is dna|explain dna|what does dna stand for/i],
    answer: "**DNA** stands for **Deoxyribonucleic Acid**. 🧬\n\nIt's the molecule that carries the genetic instructions for the development, functioning, and reproduction of all living organisms.\n\n• DNA is shaped like a **double helix** (twisted ladder)\n• The human body has about **3 billion base pairs** of DNA\n• DNA is found in the **nucleus** of every cell\n• It encodes instructions using 4 bases: **A, T, C, G**\n• 99.9% of human DNA is **identical** across all people — the 0.1% difference makes us unique!" },

  { patterns: [/speed of light|how fast is light|velocity of light/i],
    answer: "The **speed of light** in a vacuum is exactly **299,792,458 metres per second** (≈ 300,000 km/s). 💡\n\n• It takes light just **1.3 seconds** to travel from the Moon to Earth\n• Light from the Sun reaches Earth in about **8 minutes 20 seconds**\n• The nearest star (Proxima Centauri) is **4.24 light-years** away\n• According to Einstein's Special Relativity, **nothing with mass can travel at or beyond the speed of light**\n• Light travels slower through glass or water — that's why objects bend (refraction)" },

  { patterns: [/what is photosynthesis|explain photosynthesis/i],
    answer: "**Photosynthesis** is the process by which plants convert light into food. 🌿\n\n**Formula:** CO₂ + H₂O + Light Energy → Glucose + O₂\n\nStep by step:\n1. Plants absorb **sunlight** through chlorophyll in leaves\n2. They take in **carbon dioxide** from the air\n3. They absorb **water** from the soil\n4. These are converted into **glucose** (food) and **oxygen**\n5. Oxygen is released — which is the air we breathe!\n\nPhotosynthesis is the foundation of almost all life on Earth 🌍" },

  { patterns: [/what is evolution|explain evolution|darwin evolution/i],
    answer: "**Evolution** is the process by which living organisms change over generations through natural selection. 🦎→🦅\n\n**Charles Darwin** proposed the theory in 1859 in *On the Origin of Species*.\n\nKey principles:\n• **Natural Selection** — individuals better adapted to their environment survive and reproduce\n• **Mutation** — random changes in DNA create new traits\n• **Common Ancestry** — all life on Earth shares a common ancestor\n• **Millions of years** — evolution is extremely slow\n• Evidence: fossil record, DNA comparisons, observed speciation" },

  { patterns: [/what is the big bang|big bang theory|how did universe begin/i],
    answer: "The **Big Bang Theory** describes the origin of the universe. 🌌\n\n• About **13.8 billion years ago**, the universe began from an extremely hot, dense point\n• In a fraction of a second, it rapidly expanded — this is the **Big Bang**\n• Over millions of years, matter cooled and clumped into **stars, galaxies, and planets**\n• The universe is **still expanding** today (discovered by Edwin Hubble in 1929)\n• Evidence: **Cosmic Microwave Background radiation**, redshift of galaxies, abundance of hydrogen and helium" },

  { patterns: [/what is newton.?s law|newtons laws|laws of motion/i],
    answer: "**Newton's Three Laws of Motion** 🍎\n\n**1st Law (Inertia):** An object at rest stays at rest, and an object in motion stays in motion, unless acted upon by an external force.\n\n**2nd Law (F = ma):** Force = Mass × Acceleration. The greater the mass, the more force needed to accelerate it.\n\n**3rd Law (Action-Reaction):** For every action, there is an equal and opposite reaction.\n\n*Example of 3rd law:* When you jump off a boat, you go forward and the boat goes backward!" },

  { patterns: [/what is black hole|explain black hole|how does black hole form/i],
    answer: "A **black hole** is a region of space where gravity is so strong that nothing — not even light — can escape. 🕳️\n\n**How they form:**\n• When a massive star (8+ times the Sun's mass) runs out of fuel, it collapses under its own gravity\n• The core becomes incredibly dense — a **singularity**\n• The boundary around it is called the **event horizon**\n\n**Types:** Stellar, Supermassive, Primordial\n\n• The supermassive black hole at our galaxy's centre is called **Sagittarius A\*** — 4 million times the Sun's mass\n• First photo of a black hole was taken in **2019** 📸" },

  { patterns: [/what is climate change|explain climate change|global warming cause/i],
    answer: "**Climate Change** refers to long-term shifts in global temperatures and weather patterns. 🌡️\n\n**Main Cause:** Human activities since the 1800s — primarily burning **fossil fuels** (coal, oil, gas) — release greenhouse gases like CO₂ and methane that trap heat in the atmosphere.\n\n**Effects:**\n• Rising global temperatures\n• Melting ice caps and rising sea levels\n• More extreme weather events (floods, droughts, hurricanes)\n• Loss of biodiversity\n\n**Solutions:** Renewable energy, reforestation, electric vehicles, reducing meat consumption, recycling ♻️" },

  /* ════ HISTORY ════ */
  { patterns: [/when did world war (1|one|i) (start|begin|happen)|world war 1 history/i],
    answer: "**World War I** (1914–1918) 📜\n\n**Start:** July 28, 1914\n**Trigger:** Assassination of Archduke Franz Ferdinand of Austria-Hungary in Sarajevo on June 28, 1914\n\n**Main sides:**\n• **Allies:** France, Britain, Russia, USA (joined 1917), Italy\n• **Central Powers:** Germany, Austria-Hungary, Ottoman Empire\n\n**Key facts:**\n• First major industrial war — machine guns, tanks, chemical weapons, aircraft\n• ~**20 million deaths** (soldiers + civilians)\n• Ended November 11, 1918 with the Armistice\n• Led to the **Treaty of Versailles** and conditions that caused WW2" },

  { patterns: [/when did world war (2|two|ii) (start|begin|happen)|world war 2 history/i],
    answer: "**World War II** (1939–1945) 🌍\n\n**Start:** September 1, 1939 — Germany invaded Poland\n**End:** September 2, 1945 — Japan surrendered\n\n**Main sides:**\n• **Allies:** USA, UK, USSR, France, China\n• **Axis:** Germany (Nazi), Italy, Japan\n\n**Key events:**\n• Holocaust — 6 million Jews murdered by Nazi Germany\n• Pearl Harbor (1941) — Japan attacked USA, bringing US into war\n• D-Day (1944) — Largest seaborne invasion in history\n• Atomic bombs dropped on Hiroshima & Nagasaki (1945)\n\n**Total deaths:** ~70–85 million — deadliest conflict in history" },

  { patterns: [/who was mahatma gandhi|tell me about gandhi|gandhi freedom fighter/i],
    answer: "**Mahatma Gandhi** (1869–1948) 🇮🇳\n\nFull name: **Mohandas Karamchand Gandhi**\nBorn: October 2, 1869, Porbandar, India\n\n**Who was he?**\nThe leader of India's independence movement against British colonial rule.\n\n**Key contributions:**\n• Developed the philosophy of **Ahimsa** (non-violence) and **Satyagraha** (truth-force)\n• Led the famous **Salt March** (1930) — 388 km walk to protest British salt tax\n• Inspired independence movements worldwide\n• Advocated for Hindu-Muslim unity\n\nIndia gained independence on **August 15, 1947**.\nGandhi was assassinated on January 30, 1948." },

  { patterns: [/what was the cold war|cold war history|us vs ussr/i],
    answer: "The **Cold War** (1947–1991) was a period of geopolitical tension between the **USA** and the **Soviet Union (USSR)**. 🇺🇸🆚🇷🇺\n\n**Why 'Cold'?** No direct military battle between the two superpowers — instead:\n• Nuclear arms race\n• Space Race (USSR's Sputnik vs USA's Moon landing)\n• Proxy wars (Korea, Vietnam, Afghanistan)\n• Ideological conflict: **Capitalism vs Communism**\n\n**Key events:**\n• Berlin Wall built (1961) and torn down (1989)\n• Cuban Missile Crisis (1962) — closest to nuclear war\n• Moon landing (1969) — US wins space race\n\n**End:** USSR dissolved on December 25, 1991" },

  /* ════ GEOGRAPHY ════ */
  { patterns: [/what is the capital of india|capital of india/i],
    answer: "The capital of **India** is **New Delhi** 🇮🇳\n\nNew Delhi is located in the northern part of India and serves as the seat of the Government of India. It is part of the larger **Delhi** metropolitan area — one of the most populous cities in the world with over **32 million people**." },

  { patterns: [/what is the capital of usa|capital of america|capital of united states/i],
    answer: "The capital of the **United States of America** is **Washington, D.C.** 🇺🇸\n\nD.C. stands for **District of Columbia**. It is home to:\n• The **White House** — residence of the President\n• The **Capitol Building** — Congress meets here\n• The **Supreme Court**\n• Numerous national monuments and museums\n\nNote: Washington D.C. is not part of any state — it is a federal district." },

  { patterns: [/largest country|biggest country in the world/i],
    answer: "The **largest country** in the world by land area is **Russia** 🇷🇺\n\n• Area: **17.1 million km²**\n• Spans **11 time zones** — from Eastern Europe to the Pacific Ocean\n• Covers about **1/8th of Earth's total land surface**\n• Borders 14 countries\n\nTop 5 largest countries:\n1. 🇷🇺 Russia — 17.1M km²\n2. 🇨🇦 Canada — 10.0M km²\n3. 🇺🇸 USA — 9.8M km²\n4. 🇨🇳 China — 9.6M km²\n5. 🇧🇷 Brazil — 8.5M km²" },

  { patterns: [/highest mountain|tallest mountain|mount everest height/i],
    answer: "The **highest mountain** in the world is **Mount Everest** 🏔️\n\n• Height: **8,848.86 metres** (29,031.7 feet) above sea level\n• Located in the **Himalayas** on the border of Nepal and Tibet (China)\n• First successfully climbed by **Sir Edmund Hillary** (New Zealand) and **Tenzing Norgay** (Nepal) on **May 29, 1953**\n• Named after British surveyor **Sir George Everest**\n• In Nepali it is called **Sagarmatha**, in Tibetan **Chomolungma**" },

  { patterns: [/longest river|what is the nile|amazon river/i],
    answer: "The **Nile River** is traditionally considered the world's longest river 🌊\n\n• Length: **~6,650 km** (4,130 miles)\n• Flows through **11 countries** in northeastern Africa\n• Empties into the **Mediterranean Sea**\n• Crucial to ancient Egyptian civilization\n\nHowever, the **Amazon River** (6,400 km) in South America rivals it and carries far more **water volume** — it discharges **20% of all freshwater** that flows into Earth's oceans." },

  /* ════ TECHNOLOGY ════ */
  { patterns: [/what is artificial intelligence|explain ai|what is ai/i],
    answer: "**Artificial Intelligence (AI)** is the simulation of human intelligence processes by computer systems. 🤖\n\n**Key capabilities AI can perform:**\n• Learning from data (Machine Learning)\n• Understanding language (NLP)\n• Recognizing images (Computer Vision)\n• Making decisions\n• Generating text, images, code\n\n**Types:**\n• **Narrow AI** — designed for one task (Siri, chess engines, spam filters)\n• **General AI (AGI)** — human-level intelligence across all tasks (not yet achieved)\n\n**Examples you use daily:** Google Search, YouTube recommendations, Face ID, ChatGPT, autocorrect" },

  { patterns: [/what is machine learning|explain machine learning|ml definition/i],
    answer: "**Machine Learning (ML)** is a branch of AI where computers learn from data without being explicitly programmed. 📊\n\n**How it works:**\n1. Feed the model large amounts of **training data**\n2. The model finds **patterns** in the data\n3. It uses those patterns to make **predictions** on new data\n\n**Types:**\n• **Supervised Learning** — learns from labelled examples (spam detection, image classification)\n• **Unsupervised Learning** — finds hidden patterns (customer segmentation)\n• **Reinforcement Learning** — learns by trial and error (game-playing AI, robotics)\n\n**Real examples:** Netflix recommendations, self-driving cars, medical diagnosis" },

  { patterns: [/what is the internet|how does internet work|explain internet/i],
    answer: "The **Internet** is a global network of billions of connected computers and devices. 🌐\n\n**How it works:**\n1. Your device sends a **request** (e.g., type google.com)\n2. The request travels through **routers** via fibre-optic cables (or wireless signals)\n3. A **DNS server** translates the domain name to an IP address\n4. A **web server** receives the request and sends back data\n5. Your **browser** renders that data as a webpage\n\n**Fun facts:**\n• ~**5.4 billion** internet users worldwide\n• Over **1.1 billion** websites exist\n• The Internet was born from **ARPANET** (1969, USA)\n• **Tim Berners-Lee** invented the World Wide Web in 1989" },

  { patterns: [/what is python|python programming language|why use python/i],
    answer: "**Python** is a high-level, general-purpose programming language known for its simplicity and readability. 🐍\n\n**Created by:** Guido van Rossum in **1991**\n\n**Why Python is popular:**\n• Easy to read — almost like plain English\n• Huge library ecosystem (NumPy, Pandas, TensorFlow, Django)\n• Versatile — data science, web dev, AI, automation, scripting\n• Large community and tons of free resources\n\n**Used by:** Google, Netflix, Instagram, NASA, and millions of developers\n\n```python\nprint('Hello, World!')  # That's all it takes!\n```\n\n**Best for:** Beginners, data science, AI/ML, automation" },

  { patterns: [/what is javascript|explain javascript|what is js used for/i],
    answer: "**JavaScript (JS)** is the programming language of the web. It runs in every browser and makes websites interactive. 🌐\n\n**Created by:** Brendan Eich in **1995** (in just 10 days!)\n\n**What JavaScript does:**\n• Makes buttons, forms, animations work on websites\n• Validates forms before submission\n• Fetches data without reloading the page (AJAX)\n• Powers this very chatbot you're using!\n\n**Key frameworks:**\n• **React / Vue / Angular** — building UI components\n• **Node.js** — running JS on the server\n• **Express** — backend web framework\n\n**Fun fact:** JavaScript is used by **98% of websites** worldwide" },

  { patterns: [/what is html|explain html|html definition/i],
    answer: "**HTML** stands for **HyperText Markup Language**. It is the standard language for creating web pages. 🌐\n\n**Created by:** Tim Berners-Lee in **1991**\n\nHTML uses **tags** to structure content:\n```html\n<h1>This is a heading</h1>\n<p>This is a paragraph.</p>\n<a href='url'>This is a link</a>\n<img src='image.jpg' alt='photo'>\n```\n\n• HTML provides the **structure** of a page\n• **CSS** provides the styling/design\n• **JavaScript** adds interactivity\n\nThink of it like a house: HTML = walls & structure, CSS = paint & decor, JS = electricity & plumbing" },

  { patterns: [/what is css|explain css|what does css do/i],
    answer: "**CSS** stands for **Cascading Style Sheets**. It controls how HTML elements look on a page. 🎨\n\n**What CSS does:**\n• Sets **colors, fonts, sizes**\n• Controls **layout** (flexbox, grid)\n• Adds **animations and transitions**\n• Makes websites **responsive** (work on mobile & desktop)\n\n```css\nbody {\n  background: #212121;\n  color: white;\n  font-family: Arial;\n}\n```\n\n**CSS Frameworks:** Bootstrap, Tailwind CSS, Bulma\n\nThis chatbot's entire design — dark theme, bubbles, sidebar, animations — is all CSS! ✨" },

  { patterns: [/what is a database|explain database|types of database/i],
    answer: "A **database** is an organised collection of structured data, stored and accessed electronically. 🗄️\n\n**Types:**\n• **Relational (SQL)** — data in tables with relationships (MySQL, PostgreSQL, SQLite)\n• **NoSQL** — flexible structure (MongoDB, Firebase, Redis)\n• **In-memory** — ultra-fast, temporary (Redis)\n\n**Key SQL commands:**\n```sql\nSELECT * FROM users WHERE age > 18;\nINSERT INTO users (name, age) VALUES ('Nova', 1);\nUPDATE users SET age = 2 WHERE name = 'Nova';\nDELETE FROM users WHERE id = 5;\n```\n\n**Used everywhere:** Every app you use — Instagram, WhatsApp, banks — all use databases" },

  { patterns: [/what is cloud computing|explain cloud computing|what is the cloud/i],
    answer: "**Cloud Computing** means storing and accessing data/programs over the **internet** instead of your local computer. ☁️\n\n**Types:**\n• **IaaS** (Infrastructure as a Service) — virtual servers (AWS EC2)\n• **PaaS** (Platform as a Service) — deployment platform (Heroku, Vercel)\n• **SaaS** (Software as a Service) — ready apps (Gmail, Dropbox, Netflix)\n\n**Benefits:**\n• Access from anywhere\n• No need to buy expensive hardware\n• Auto-scaling — handles traffic spikes\n• Pay only what you use\n\n**Major providers:** Amazon AWS, Microsoft Azure, Google Cloud" },

  { patterns: [/what is cybersecurity|explain cybersecurity|what is hacking/i],
    answer: "**Cybersecurity** is the practice of protecting computers, networks, and data from digital attacks. 🔒\n\n**Common threats:**\n• **Malware** — viruses, ransomware, spyware\n• **Phishing** — fake emails to steal credentials\n• **SQL Injection** — attacking databases via malicious queries\n• **DDoS** — flooding a server with traffic to crash it\n• **Man-in-the-Middle** — intercepting communications\n\n**How to stay safe:**\n✓ Use **strong, unique passwords** + a password manager\n✓ Enable **two-factor authentication (2FA)**\n✓ Keep software **updated**\n✓ Don't click suspicious links\n✓ Use a **VPN** on public Wi-Fi" },

  /* ════ PROGRAMMING ════ */
  { patterns: [/what is object oriented programming|explain oop|what is oop/i],
    answer: "**Object-Oriented Programming (OOP)** is a programming paradigm based on the concept of **objects**. 📦\n\n**4 Core Principles:**\n\n1. **Encapsulation** — bundling data and methods together inside an object\n2. **Abstraction** — hiding internal complexity, showing only what's needed\n3. **Inheritance** — a child class inherits properties from a parent class\n4. **Polymorphism** — same interface, different behaviour\n\n**Example in Python:**\n```python\nclass Animal:\n  def speak(self): pass\n\nclass Dog(Animal):\n  def speak(self): return 'Woof!'\n\nclass Cat(Animal):\n  def speak(self): return 'Meow!'\n```\n\nLanguages: Python, Java, C++, JavaScript, C#" },

  { patterns: [/what is an api|explain api|how does api work/i],
    answer: "An **API** (Application Programming Interface) is a set of rules that allows different software applications to communicate with each other. 🔌\n\n**Simple analogy:** Think of an API like a **waiter in a restaurant**:\n• You (the app) tell the waiter (API) what you want\n• The waiter goes to the kitchen (server)\n• The kitchen prepares your food (processes the request)\n• The waiter brings it back to you (returns data)\n\n**Types:**\n• **REST API** — uses HTTP methods (GET, POST, PUT, DELETE)\n• **GraphQL** — query exactly the data you need\n• **WebSockets** — real-time two-way communication\n\n**Examples:** Weather API, Google Maps API, Payment APIs (Stripe, Razorpay)" },

  { patterns: [/what is git|explain git|git vs github/i],
    answer: "**Git** is a distributed **version control system** that tracks changes to code over time. 📂\n\n**Created by:** Linus Torvalds in **2005** (the creator of Linux)\n\n**Key Git commands:**\n```bash\ngit init          # Start a repo\ngit add .         # Stage changes\ngit commit -m ''  # Save a snapshot\ngit push          # Upload to remote\ngit pull          # Download updates\ngit branch        # Create branches\ngit merge         # Combine branches\n```\n\n**Git vs GitHub:**\n• **Git** = the tool (runs locally)\n• **GitHub** = website that hosts Git repos online (owned by Microsoft)\n\nOther platforms: GitLab, Bitbucket" },

  /* ════ HEALTH ════ */
  { patterns: [/what is bmi|how to calculate bmi|bmi formula/i],
    answer: "**BMI** stands for **Body Mass Index**. It's a measure of body fat based on height and weight. ⚖️\n\n**Formula:** BMI = Weight (kg) ÷ Height² (m²)\n\n**BMI Categories:**\n• Below 18.5 → **Underweight**\n• 18.5 – 24.9 → **Normal / Healthy weight** ✅\n• 25.0 – 29.9 → **Overweight**\n• 30.0 and above → **Obese**\n\n**Example:** A person who is 70 kg and 1.75 m tall:\nBMI = 70 ÷ (1.75 × 1.75) = 70 ÷ 3.0625 = **22.9** (Normal) ✅\n\n**Note:** BMI is a screening tool, not a definitive health diagnosis — muscle mass, age, and ethnicity affect interpretation." },

  { patterns: [/how much water should i drink|daily water intake|importance of water/i],
    answer: "**Daily Water Intake** 💧\n\nThe general recommendation is **8 glasses (about 2 litres)** per day for adults.\n\nBut it depends on:\n• Body weight — roughly **30–35 ml per kg** of body weight\n• Activity level — more exercise = more water\n• Climate — hot weather increases needs\n• Health — pregnancy, illness increase needs\n\n**Signs of dehydration:**\n• Dark yellow urine (aim for pale yellow)\n• Fatigue, headache, dizziness\n• Dry mouth and skin\n\n**Benefits of staying hydrated:**\n• Better brain function and concentration\n• Clearer skin\n• Improved digestion\n• Boosts metabolism\n• Regulates body temperature" },

  { patterns: [/how to lose weight|weight loss tips|how to reduce weight/i],
    answer: "**Healthy Weight Loss** 🏃\n\nThe golden rule: **Burn more calories than you consume** (caloric deficit).\n\n**Effective strategies:**\n\n🥗 **Diet:**\n• Eat whole foods — vegetables, fruits, lean protein, whole grains\n• Reduce sugar, refined carbs, ultra-processed food\n• Control portion sizes\n• Don't skip breakfast\n\n🏋️ **Exercise:**\n• Aim for 150–300 min of moderate cardio per week\n• Add strength training — muscle burns more calories at rest\n\n💤 **Lifestyle:**\n• Sleep 7–9 hours — poor sleep increases hunger hormones\n• Manage stress — cortisol causes fat storage\n• Drink plenty of water\n\n**Avoid:** crash diets, extreme fasting — they're not sustainable" },

  /* ════ MATHS CONCEPTS ════ */
  { patterns: [/what is pythagoras|pythagorean theorem|explain pythagoras/i],
    answer: "The **Pythagorean Theorem** states: In a **right-angled triangle**,\n\n**a² + b² = c²**\n\nWhere **c** is the hypotenuse (longest side) and **a**, **b** are the other two sides. 📐\n\n**Example:**\nIf a = 3, b = 4:\nc² = 3² + 4² = 9 + 16 = 25\nc = √25 = **5** ✅\n\n**Named after:** Pythagoras of Samos (Greek mathematician, ~570–495 BC)\n\n**Used in:** Architecture, navigation, computer graphics, engineering, and everyday construction" },

  { patterns: [/what is pi|what is π|value of pi/i],
    answer: "**π (Pi)** is one of the most famous mathematical constants. 🔵\n\n• **Value:** π ≈ **3.14159265358979...**\n• It is an **irrational number** — the decimals never end and never repeat\n• **Definition:** The ratio of a circle's circumference to its diameter\n\nFormula: **C = 2πr** (circumference), **A = πr²** (area)\n\n**Fun facts:**\n• Pi has been calculated to over **100 trillion digits**\n• **Pi Day** is celebrated on March 14 (3/14) 🥧\n• The ancient Babylonians estimated pi as **3.125** over 4,000 years ago\n• The record for memorising pi digits is **70,000 digits** by Rajveer Meena (India, 2015) 🇮🇳" },

  { patterns: [/what is prime number|explain prime numbers|list of prime numbers/i],
    answer: "A **prime number** is a natural number greater than 1 that has **no divisors other than 1 and itself**. 🔢\n\n**First 20 primes:**\n2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71\n\n**Key facts:**\n• **2** is the only even prime number\n• There are **infinitely many** prime numbers (proven by Euclid ~300 BC)\n• The largest known prime (as of 2024) has over **41 million digits**!\n• Primes are crucial in **cryptography** — RSA encryption that secures the internet uses very large primes" },

  /* ════ SPACE ════ */
  { patterns: [/how far is the sun|distance to the sun|how far is earth from sun/i],
    answer: "The **average distance** from Earth to the Sun is approximately **150 million kilometres** (93 million miles). ☀️\n\nThis distance is called **1 Astronomical Unit (AU)**.\n\n**Fun facts:**\n• Light from the Sun reaches Earth in about **8 minutes 20 seconds**\n• Earth's orbit is slightly elliptical — we're closest (**147M km**) in January and farthest (**152M km**) in July\n• If you drove at 100 km/h non-stop, it would take **171 years** to reach the Sun!\n• The Sun contains **99.86%** of all mass in the Solar System 🌟" },

  { patterns: [/how many planets|planets in solar system|list of planets/i],
    answer: "Our Solar System has **8 planets** 🪐\n\nIn order from the Sun:\n1. ☿ **Mercury** — smallest, no atmosphere, extreme temperatures\n2. ♀ **Venus** — hottest planet (462°C), spins backwards\n3. 🌍 **Earth** — our home, only known planet with life\n4. ♂ **Mars** — Red Planet, two moons, NASA is planning human missions\n5. ♃ **Jupiter** — largest planet, Great Red Spot storm\n6. ♄ **Saturn** — beautiful ring system, least dense planet\n7. ⛢ **Uranus** — ice giant, rotates on its side\n8. ♆ **Neptune** — strongest winds in Solar System (2,100 km/h)\n\n**Note:** Pluto was reclassified as a **dwarf planet** in 2006." },

  /* ════ MOTIVATIONAL / FAMOUS PEOPLE ════ */
  { patterns: [/who is elon musk|tell me about elon musk/i],
    answer: "**Elon Musk** 🚀\n\nBorn: June 28, 1971 — Pretoria, South Africa\n\n**Who is he?** Entrepreneur, engineer, and one of the world's wealthiest people.\n\n**Companies he leads/founded:**\n• **Tesla** — electric vehicles and clean energy\n• **SpaceX** — private space company, goal: colonise Mars\n• **Neuralink** — brain-computer interfaces\n• **The Boring Company** — underground transport tunnels\n• **X (formerly Twitter)** — social media platform\n\n**Notable achievements:**\n• First private company to send astronauts to the ISS (SpaceX, 2020)\n• Made electric cars mainstream with Tesla\n• Plans to make humanity **multi-planetary**" },

  { patterns: [/who is bill gates|tell me about bill gates/i],
    answer: "**Bill Gates** 💻\n\nBorn: October 28, 1955 — Seattle, USA\n\n**Who is he?** Co-founder of Microsoft, philanthropist, and one of the richest people in history.\n\n**Key facts:**\n• Co-founded **Microsoft** in 1975 with Paul Allen\n• **Windows OS** made personal computers mainstream\n• Was the **world's richest person** from 1995–2017 (mostly)\n• Left Microsoft board in 2020 to focus on philanthropy\n\n**Bill & Melinda Gates Foundation:**\n• Donated **$50+ billion** to global health and education\n• Working to eradicate polio, malaria, and poverty\n• One of the greatest acts of philanthropy in history" },

  { patterns: [/who is albert einstein|tell me about einstein/i],
    answer: "**Albert Einstein** 🔭\n\nBorn: March 14, 1879 — Ulm, Germany\nDied: April 18, 1955\n\n**Greatest physicist of the 20th century.**\n\n**Major contributions:**\n• **Special Theory of Relativity** (1905) — E = mc² (energy = mass × speed of light²)\n• **General Theory of Relativity** (1915) — gravity as the curvature of spacetime\n• Explained the **photoelectric effect** (won Nobel Prize in Physics, 1921)\n• Contributed to **quantum mechanics**\n\n**Famous quotes:**\n• *\"Imagination is more important than knowledge.\"*\n• *\"The definition of insanity is doing the same thing and expecting different results.\"*\n\n**Fun fact:** Einstein failed his first university entrance exam!" },

];


/* ── 2d. NLP Scoring Engine ──────────────────────────────── */
function scoreIntent(intent, tokens, stemmedTokens, normText) {
  let score = 0;
  for (const phrase of (intent.phrases || [])) {
    if (normText.includes(normalize(phrase))) score += 5;
  }
  const kStems = (intent.keywords || []).map(stem);
  for (const st of stemmedTokens) {
    if (kStems.includes(st)) score += 2;
  }
  for (const tok of tokens) {
    if ((intent.keywords || []).includes(tok)) score += 1;
  }
  return score;
}

/**
 * getResponse(input)
 * ─────────────────────────────────────────────
 * Priority order:
 *   1. Math expression  (regex, highest priority)
 *   2. Direct Q&A match (QA knowledge base — specific answer)
 *   3. Intent scoring   (broad topic answer)
 *   4. Fallback
 */
function generateMCQQuiz(input) {
  const norm = input.toLowerCase();
  
  let topic = "General Knowledge";
  if (/\bpython\b/i.test(norm)) topic = "Python Programming";
  else if (/\b(javascript|js)\b/i.test(norm)) topic = "JavaScript";
  else if (/\breact\b/i.test(norm)) topic = "React.js";
  else if (/\b(html|css|web)\b/i.test(norm)) topic = "Web Development (HTML & CSS)";
  else if (/\b(math|calculus|algebra)\b/i.test(norm)) topic = "Mathematics";
  else if (/\b(physics|gravity|mechanics)\b/i.test(norm)) topic = "Physics";
  else if (/\bchemistry\b/i.test(norm)) topic = "Chemistry";
  else if (/\bbiology\b/i.test(norm)) topic = "Biology & Life Sciences";
  else if (/\bhistory\b/i.test(norm)) topic = "World History";
  else if (/\b(ai|machine learning|ml)\b/i.test(norm)) topic = "AI & Machine Learning";
  else if (/\bsql\b/i.test(norm)) topic = "SQL & Databases";
  else {
    const topicMatch = input.match(/(?:mcqs?|quiz|test|questions?)\s+(?:on|about|for|in)\s+(.+)/i) ||
                       input.match(/(?:generate|create|make|give|show)\s+(?:a\s+)?(.+?)\s+(?:mcq|mcqs|quiz|test|questions?)/i);
    if (topicMatch && topicMatch[1]) {
      const clean = topicMatch[1].replace(/\b(\d+|questions?|mcqs?|easy|medium|hard|test)\b/gi, "").trim();
      if (clean.length > 1) topic = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
  }

  let qList = [];

  if (topic.includes("Python")) {
    qList = [
      { q: "What is the output of `type([])` in Python?", opts: ["<class 'list'>", "<class 'array'>", "<class 'dict'>", "<class 'tuple'>"], ans: "A", exp: "In Python, `[]` defines a list object." },
      { q: "Which keyword is used to define a function in Python?", opts: ["func", "def", "function", "define"], ans: "B", exp: "`def` is the official keyword to declare functions in Python." },
      { q: "How do you insert comments in Python code?", opts: ["// comment", "<!-- comment -->", "# comment", "/* comment */"], ans: "C", exp: "`#` is used for single-line comments in Python." },
      { q: "Which of the following data types is immutable in Python?", opts: ["List", "Dictionary", "Set", "Tuple"], ans: "D", exp: "Tuples cannot be modified after creation." },
      { q: "What method is used to add an item to the end of a list?", opts: ["append()", "push()", "add()", "insert()"], ans: "A", exp: "`list.append(item)` appends an element to the end of a list." }
    ];
  } else if (topic.includes("JavaScript")) {
    qList = [
      { q: "Which keyword creates a block-scoped variable in modern JS?", opts: ["var", "let", "global", "def"], ans: "B", exp: "`let` and `const` create block-scoped variables." },
      { q: "What does `typeof NaN` return in JavaScript?", opts: ["'undefined'", "'number'", "'NaN'", "'null'"], ans: "B", exp: "In JS specification, `NaN` (Not-a-Number) is technically of type 'number'." },
      { q: "Which method converts a JSON string into a JS object?", opts: ["JSON.stringify()", "JSON.parse()", "JSON.toObject()", "JSON.convert()"], ans: "B", exp: "`JSON.parse()` deserializes a JSON string to an object." },
      { q: "What is the result of `'5' + 3` in JavaScript?", opts: ["8", "'53'", "NaN", "Error"], ans: "B", exp: "The `+` operator coerces the number `3` to a string `'3'`, resulting in `'53'`." },
      { q: "Which array method creates a new array by performing a function on each element?", opts: ["forEach()", "filter()", "map()", "reduce()"], ans: "C", exp: "`map()` returns a new array transformed by the callback." }
    ];
  } else if (topic.includes("Physics")) {
    qList = [
      { q: "What is the approximate acceleration due to gravity on Earth's surface?", opts: ["9.8 m/s²", "5.2 m/s²", "12.4 m/s²", "9.8 km/h"], ans: "A", exp: "Standard Earth gravity is ~9.8 m/s²." },
      { q: "Which of Newton's laws states that F = m * a?", opts: ["First Law", "Second Law", "Third Law", "Law of Gravitation"], ans: "B", exp: "Newton's Second Law defines Force as Mass times Acceleration." },
      { q: "What is the unit of electrical resistance?", opts: ["Volt", "Ampere", "Ohm", "Watt"], ans: "C", exp: "Ohm measures electrical resistance." },
      { q: "Light travels fastest through which medium?", opts: ["Water", "Glass", "Vacuum", "Air"], ans: "C", exp: "Light travels at maximum speed in a vacuum." },
      { q: "Which energy type is possessed by an object due to its motion?", opts: ["Potential Energy", "Kinetic Energy", "Thermal Energy", "Nuclear Energy"], ans: "B", exp: "Kinetic energy is the energy of motion." }
    ];
  } else {
    qList = [
      { q: `What is the primary core concept behind ${topic}?`, opts: [`Fundamental framework & principles of ${topic}`, `Outdated legacy hardware protocol`, `Unrelated mathematical formula`, `None of the above`], ans: "A", exp: `This option describes the core purpose of ${topic}.` },
      { q: `Which advantage is associated with using ${topic}?`, opts: ["High performance & structure", "Increased system vulnerability", "Total lack of organization", "Deprecation"], ans: "A", exp: `${topic} provides structural and operational benefits.` },
      { q: `What is a best practice when working with ${topic}?`, opts: ["Ignoring standards", "Following clean design & systematic guidelines", "Random guessing", "Disabling error checks"], ans: "B", exp: "Following standards ensures code quality and reliability." },
      { q: `How are concepts in ${topic} best applied?`, opts: ["By breaking problems into logical steps", "By guessing answers", "Without testing", "By avoiding documentation"], ans: "A", exp: "Logical step-by-step application yields best results." },
      { q: `What is recommended to master ${topic}?`, opts: ["Memorizing single lines", "Continuous practice, theoretical study & problem solving", "Skipping fundamentals", "Relying on old software"], ans: "B", exp: "Practicing regularly develops deep mastery." }
    ];
  }

  const lines = [
    `🎯 **${topic} MCQ Quiz**`,
    `*Here are 5 multiple-choice questions on ${topic}:*\n`
  ];

  qList.forEach((qObj, idx) => {
    lines.push(`**Q${idx + 1}: ${qObj.q}**`);
    qObj.opts.forEach((opt, oIdx) => {
      const letter = String.fromCharCode(65 + oIdx);
      lines.push(`  **${letter})** ${opt}`);
    });
    lines.push("");
  });

  lines.push(`---`);
  lines.push(`### 💡 Answer Key & Explanations:`);
  qList.forEach((qObj, idx) => {
    lines.push(`- **Q${idx + 1}**: Correct Answer **${qObj.ans}** — *${qObj.exp}*`);
  });

  lines.push(`\n🚀 *Type 'mcq on python' or 'create math quiz' to generate more MCQs!*`);

  return lines.join("\n");
}

function generateTheoryAnswer(input) {
  const clean = input.replace(/^(what is|explain|tell me about|how does|why is|who is|define|describe|history of|details of)\s+/gi, "").replace(/[\?\!\.\,]+/g, "").trim();
  const topic = (clean.length > 1 ? clean : input).trim();
  const title = topic.charAt(0).toUpperCase() + topic.slice(1);

  return [
    `### 🎯 Overview of ${title}`,
    `**${title}** is a key theoretical topic that encompasses essential principles, structural mechanisms, and practical applications in its domain.\n`,
    `### 🔍 Core Concepts & Key Principles:`,
    `- **Fundamental Definition**: ${title} provides the baseline framework and principles governing how this concept operates.`,
    `- **Main Components**: Consists of structured, interconnected elements that function together systematically.`,
    `- **Core Purpose**: Serves as a vital foundation for problem solving, critical analysis, and real-world understanding.\n`,
    `### 💡 Detailed Step-by-Step Breakdown:`,
    `1. **Foundational Rules**: Basic principles establish the core definitions for ${topic}.`,
    `2. **Operational Flow**: Key mechanisms transition through logical steps to achieve predictable results.`,
    `3. **Practical Execution**: Applying theoretical concepts to real-world scenarios and system design.\n`,
    `### 💻 Real-World Application & Example:`,
    `- **Practical Scenario**: In real-world environments, ${topic} is utilized to build scalable systems, optimize processes, or analyze complex data.`,
    `- **Key Strategy**: Analyzing foundational concepts ensures accurate decision-making and problem solving.\n`,
    `### 📌 Key Takeaways & Summary:`,
    `- **Essential Focus**: Grasp the core definitions, step-by-step logic, and practical applications of ${title}.`,
    `- 💡 *Would you like deeper technical details, code examples, or type **'create quiz on ${topic}'** to test your knowledge?*`
  ].join("\n");
}

function getResponse(input) {
  const raw  = input.trim();
  const norm = normalize(raw);
  const toks = tokenize(raw);
  const stms = toks.map(stem);

  /* ── 0. MCQ / Quiz Request Detector ── */
  const isMCQReq = /\b(mcq|mcqs|quiz|test|exam|questions?)\b/i.test(norm) ||
                   /\b(create|generate|make|give|start|show)\b.*?\b(mcq|mcqs|quiz|test)\b/i.test(norm);
  if (isMCQReq) {
    return generateMCQQuiz(raw);
  }

  /* ── 1. Math expression ── */
  const mathRx = /(\d+\.?\d*)\s*([\+\-\*\/\^%]|plus|minus|times|divided\s*by|mod|power)\s*(\d+\.?\d*)/i;
  if (mathRx.test(norm)) {
    const mathIntent = intents.find(i => i.id === 'math');
    return mathIntent.responses[0](null, raw);
  }

  /* ── 2. Direct Q&A — specific question matching ── */
  for (const qa of QA) {
    for (const pattern of qa.patterns) {
      if (pattern.test(raw)) return qa.answer;
    }
  }

  /* ── 3. Broad intent scoring ── */
  let best = 0, winner = null;
  for (const intent of intents) {
    const s = scoreIntent(intent, toks, stms, norm);
    if (s > best) { best = s; winner = intent; }
  }

  if (winner && best >= 2) {
    const choice = winner.responses[Math.floor(Math.random() * winner.responses.length)];
    return typeof choice === 'function' ? choice(null, raw) : choice;
  }

  /* ── 4. Universal Theory Question Answer Synthesizer ── */
  return generateTheoryAnswer(raw);
}


/* ══════════════════════════════════════════════════════════
   3.  Chat Sessions (localStorage)
   ══════════════════════════════════════════════════════════ */
function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY)) || {}; }
  catch { return {}; }
}

function saveSessions(sessions) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); }
  catch (e) { console.warn('localStorage unavailable:', e); }
}

function getSession(id) {
  return loadSessions()[id] || null;
}

function upsertSession(id, data) {
  const sessions = loadSessions();
  sessions[id] = { ...sessions[id], ...data };
  saveSessions(sessions);
}

function createNewSession() {
  const id = 'session_' + Date.now();
  upsertSession(id, { id, title: 'New chat', messages: [] });
  return id;
}


/* ══════════════════════════════════════════════════════════
   4.  Render Helpers
   ══════════════════════════════════════════════════════════ */
function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const BOT_SVG = `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="7" y="11" width="26" height="20" rx="6" fill="#fff" opacity="0.9"/>
  <line x1="20" y1="11" x2="20" y2="5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="20" cy="4" r="2.2" fill="#fff"/>
  <circle cx="14" cy="21" r="2.8" fill="#10a37f"/>
  <circle cx="26" cy="21" r="2.8" fill="#10a37f"/>
  <circle cx="14.8" cy="20.2" r="1" fill="#fff"/>
  <circle cx="26.8" cy="20.2" r="1" fill="#fff"/>
  <path d="M15 27 Q20 31 25 27" stroke="#10a37f" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <rect x="2" y="17" width="5" height="7" rx="2.5" fill="#fff" opacity="0.8"/>
  <rect x="33" y="17" width="5" height="7" rx="2.5" fill="#fff" opacity="0.8"/>
</svg>`;

function renderMessage({ sender, text, time }, animate = true) {
  const row = document.createElement('div');
  row.className = `message-row ${sender}`;
  if (!animate) row.style.animation = 'none';

  const inner = document.createElement('div');
  inner.className = 'msg-inner';

  if (sender === 'bot') {
    const av = document.createElement('div');
    av.className = 'bot-avatar';
    av.innerHTML = BOT_SVG;
    inner.appendChild(av);
  }

  const bGroup = document.createElement('div');
  bGroup.style.cssText = 'display:flex;flex-direction:column;flex:1;min-width:0';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = formatText(text);

  const ts = document.createElement('span');
  ts.className = 'timestamp';
  ts.textContent = time;

  bGroup.appendChild(bubble);
  bGroup.appendChild(ts);
  inner.appendChild(bGroup);
  row.appendChild(inner);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
}

window.copyCodeBlock = function(btn) {
  const codeEl = btn.closest('.chatgpt-code-block').querySelector('code');
  if (codeEl) {
    navigator.clipboard.writeText(codeEl.innerText).then(() => {
      btn.innerText = '✓ Copied!';
      btn.style.color = '#10a37f';
      setTimeout(() => {
        btn.innerText = '📋 Copy code';
        btn.style.color = '';
      }, 2000);
    });
  }
};

function formatText(text) {
  if (!text) return "";
  let formatted = text;

  /* Fenced code blocks with Copy code button */
  formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<div class="chatgpt-code-block"><div class="code-header"><span>${lang || 'code'}</span><button class="copy-code-btn" onclick="copyCodeBlock(this)">📋 Copy code</button></div><pre class="code-content"><code>${escaped.trimEnd()}</code></pre></div>`;
  });

  /* Inline code */
  formatted = formatted.replace(/`([^`\n]+)`/g, '<code class="inline-code-badge">$1</code>');

  /* Headings */
  formatted = formatted.replace(/^### (.*$)/gim, '<h3 class="chat-h3">$1</h3>');
  formatted = formatted.replace(/^## (.*$)/gim, '<h2 class="chat-h2">$1</h2>');
  formatted = formatted.replace(/^# (.*$)/gim, '<h1 class="chat-h1">$1</h1>');

  /* Bold & Italic */
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="chat-strong">$1</strong>');
  formatted = formatted.replace(/\*([^*\n]+)\*/g, '<em class="chat-em">$1</em>');

  /* Bullet points */
  formatted = formatted.replace(/^[\-\*•]\s+(.*$)/gim, '<div class="chat-bullet-item"><span class="bullet-dot">•</span><span class="bullet-text">$1</span></div>');

  /* Newlines */
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

function showTypingRow() {
  const row = document.createElement('div');
  row.className = 'message-row bot';
  row.id = 'typingRow';
  const inner = document.createElement('div');
  inner.className = 'msg-inner';
  const av = document.createElement('div');
  av.className = 'bot-avatar';
  av.innerHTML = BOT_SVG;
  const ind = document.createElement('div');
  ind.className = 'typing-indicator';
  ind.innerHTML = '<span></span><span></span><span></span>';
  inner.appendChild(av);
  inner.appendChild(ind);
  row.appendChild(inner);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return row;
}


/* ══════════════════════════════════════════════════════════
   5.  Typewriter Effect (Fast Streaming Animation)
   ══════════════════════════════════════════════════════════ */
function typewriter(bubble, fullText, onDone) {
  /* Render code blocks or structured markdown instantly */
  if (fullText.includes('```') || fullText.length > 500) {
    bubble.innerHTML = formatText(fullText);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (onDone) onDone();
    return;
  }

  const chars = fullText.split('');
  let i = 0;
  bubble.classList.add('cursor-blink');
  bubble.innerHTML = '';

  const stepSize = Math.max(4, Math.floor(chars.length / 30));
  const timer = setInterval(() => {
    i += stepSize;
    if (i >= chars.length) {
      clearInterval(timer);
      bubble.classList.remove('cursor-blink');
      bubble.innerHTML = formatText(fullText);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      if (onDone) onDone();
      return;
    }
    const partial = chars.slice(0, i).join('');
    bubble.innerHTML = formatText(partial);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 10);
}


/* ══════════════════════════════════════════════════════════
   6.  Bot Reply Logic (Instant Fast Response)
   ══════════════════════════════════════════════════════════ */
function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isBotTyping) return;

  hideWelcome();
  const time = getTimestamp();
  renderMessage({ sender: 'user', text, time });

  /* Persist to session */
  const session = getSession(currentSessionId);
  if (session) {
    const title = session.messages.length === 0
      ? text.slice(0, 40) + (text.length > 40 ? '…' : '')
      : session.title;
    session.messages.push({ sender: 'user', text, time });
    upsertSession(currentSessionId, { ...session, title });
    renderSidebar();
  }

  userInput.value = '';
  userInput.style.height = 'auto';
  setSendEnabled(false);
  isBotTyping = true;

  const typingRow = showTypingRow();
  const delay = 30; // Instant 30ms response time

  setTimeout(() => {
    typingRow.remove();
    const reply = getResponse(text);
    const replyTime = getTimestamp();
    const bubble = renderMessage({ sender: 'bot', text: '', time: replyTime });

    typewriter(bubble, reply, () => {
      isBotTyping = false;
      setSendEnabled(userInput.value.trim().length > 0);
      /* Save bot reply */
      const s = getSession(currentSessionId);
      if (s) {
        s.messages.push({ sender: 'bot', text: reply, time: replyTime });
        upsertSession(currentSessionId, s);
      }
      userInput.focus();
    });
  }, delay);
}


/* ══════════════════════════════════════════════════════════
   7.  Sidebar / History Panel
   ══════════════════════════════════════════════════════════ */
function renderSidebar() {
  const sessions = loadSessions();
  historyList.innerHTML = '';
  const sorted = Object.values(sessions).sort((a, b) =>
    (b.id.split('_')[1] || 0) - (a.id.split('_')[1] || 0)
  );
  sorted.forEach(session => {
    const li = document.createElement('li');
    li.className = 'history-item' + (session.id === currentSessionId ? ' active' : '');
    li.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span>${escapeHtml(session.title || 'New chat')}</span>`;
    li.addEventListener('click', () => loadSession(session.id));
    historyList.appendChild(li);
  });
}

function loadSession(id) {
  currentSessionId = id;
  chatMessages.innerHTML = '';
  const session = getSession(id);
  if (!session) return;
  if (session.messages.length === 0) {
    showWelcome();
  } else {
    hideWelcome();
    session.messages.forEach(msg => renderMessage(msg, false));
  }
  renderSidebar();
  closeSidebar();
  userInput.focus();
}

function startNewChat() {
  currentSessionId = createNewSession();
  chatMessages.innerHTML = '';
  showWelcome();
  renderSidebar();
  userInput.value = '';
  userInput.style.height = 'auto';
  setSendEnabled(false);
  closeSidebar();
  userInput.focus();
}

function openSidebar()  { sidebar.classList.add('open'); sidebarOverlay.classList.add('visible'); }
function closeSidebar() { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('visible'); }

function showWelcome() {
  welcomeScreen.style.display = 'flex';
  chatMessages.style.display  = 'none';
}
function hideWelcome() {
  welcomeScreen.style.display = 'none';
  chatMessages.style.display  = 'flex';
}
function setSendEnabled(enabled) { sendBtn.disabled = !enabled; }
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


/* ══════════════════════════════════════════════════════════
   8.  Event Listeners
   ══════════════════════════════════════════════════════════ */
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});

userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
  setSendEnabled(userInput.value.trim().length > 0 && !isBotTyping);
});

newChatBtn.addEventListener('click', startNewChat);
hamburger.addEventListener('click', openSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

document.querySelectorAll('.suggestion-card').forEach(card => {
  card.addEventListener('click', () => {
    const prompt = card.dataset.prompt;
    if (prompt) {
      userInput.value = prompt;
      userInput.dispatchEvent(new Event('input'));
      sendMessage();
    }
  });
});


/* ══════════════════════════════════════════════════════════
   9.  Init
   ══════════════════════════════════════════════════════════ */
(function init() {
  const sessions = loadSessions();
  const ids = Object.keys(sessions);

  if (ids.length > 0) {
    const latest = ids.sort((a, b) =>
      (b.split('_')[1] || 0) - (a.split('_')[1] || 0)
    )[0];
    currentSessionId = latest;
    const session = sessions[latest];
    if (session.messages.length > 0) {
      hideWelcome();
      session.messages.forEach(msg => renderMessage(msg, false));
    } else {
      showWelcome();
    }
  } else {
    currentSessionId = createNewSession();
    showWelcome();
  }

  renderSidebar();
  userInput.focus();
})();
