import re
from app.services.ai_service import chat_ai
from app.services.quiz_generator import generate_quiz
from app.prompts.chatbot_prompt import CHATBOT_SYSTEM_PROMPT


def is_quiz_request(text):
    """
    Determines if the user explicitly wants to generate/create/take a quiz or get MCQs.
    Stops general questions from accidentally triggering quiz generation.
    """
    text_lower = text.lower().strip()
    
    # Explicit Quiz and MCQ patterns
    patterns = [
        r"\b(create|generate|make|build|give\s*me|start|take|show|send|get)\b.*?\b(quiz|mcq|mcqs|test|exam)\b",
        r"\b(quiz|mcq|mcqs|test|exam)\b.*?\b(generate|create|make|on|about|for|in|me)\b",
        r"\b(python|java|javascript|react|math|physics|chemistry|history|biology|science|gk|sql|nlp|ai)\s+(mcq|mcqs|quiz|test|exam)\b",
        r"\b(\d{1,2})\s*(questions?|mcqs?)\s+(quiz|test|exam)\b",
        r"^(quiz|mcq|mcqs|test|exam)$"
    ]
    
    for pat in patterns:
        if re.search(pat, text_lower):
            return True
            
    return False


def parse_quiz_params(text):
    """
    Extracts topic, count, difficulty, and question type for quiz generation.
    """
    count_match = re.search(r"\b(\d{1,2})\s*(?:questions?|mcqs?|items?|problems?)\b", text, re.I)
    count = int(count_match.group(1)) if count_match else 5

    if re.search(r"\b(hard|difficult|advanced|expert)\b", text, re.I):
        difficulty = "hard"
    elif re.search(r"\b(easy|basic|beginner|simple)\b", text, re.I):
        difficulty = "easy"
    else:
        difficulty = "medium"

    if re.search(r"\b(true\s*/?\s*false|tf|boolean)\b", text, re.I):
        question_type = "true_false"
    elif re.search(r"\b(theoretical|theory|essay|descriptive)\b", text, re.I):
        question_type = "theoretical"
    else:
        question_type = "mcq"

    # Match topic
    topic = "General Knowledge"
    topic_match = (
        re.search(r"(?:quiz|test|questions?|mcqs?)\s+(?:on|about|for|in)\s+(.+)", text, re.I) or
        re.search(r"create\s+(?:a\s+)?(.+?)\s+(?:quiz|test|mcq|mcqs)", text, re.I) or
        re.search(r"generate\s+(?:a\s+)?(.+?)\s+(?:quiz|test|mcq|mcqs)", text, re.I) or
        re.search(r"give\s+me\s+(?:a\s+)?(.+?)\s+(?:quiz|test|mcq|mcqs)", text, re.I)
    )

    if topic_match:
        matched_str = topic_match.group(1).strip()
        raw_topic = re.sub(r"\b(\d+[\s\-]*)?(questions?|mcqs?|items?|problems?|easy|medium|hard|difficult|true/false)\b", "", matched_str, flags=re.I).strip(" -")
        raw_topic = re.sub(r"^\-+\s*", "", raw_topic).strip()
        if len(raw_topic) > 1:
            topic = raw_topic.title()
    else:
        subjects = [
            "nlp", "natural language processing", "python", "javascript", "react", "math", "calculus", "physics",
            "chemistry", "history", "biology", "cyber security", "data structures",
            "ai", "machine learning", "computer networks", "space", "geography"
        ]
        for sub in subjects:
            if re.search(r"\b" + re.escape(sub) + r"\b", text, re.I):
                topic = sub.title()
                break

    return topic, count, difficulty, question_type


def format_quiz_as_text(quiz):
    """
    Formats the generated quiz questions, options, and answer key directly into clear text.
    """
    lines = [f"🎯 **{quiz.get('title', 'AI Quiz')}**\n*{quiz.get('description', '')}*\n"]
    questions = quiz.get("questions", [])

    for idx, q in enumerate(questions, 1):
        lines.append(f"**Q{idx}: {q['question']}**")
        opts = q.get("options") or []
        for opt_idx, opt in enumerate(opts):
            letter = chr(65 + opt_idx)
            lines.append(f"  **{letter})** {opt}")
        if not opts:
            lines.append(f"  *(Type your theoretical answer in interactive mode)*")
        lines.append("")

    lines.append("---")
    lines.append("### 💡 Answer Key & Explanations:")
    for idx, q in enumerate(questions, 1):
        ans = q.get("answer", "N/A")
        exp = q.get("explanation", "Correct solution.")
        lines.append(f"- **Q{idx}**: `{ans}` — *{exp}*")

    lines.append("\n🚀 *Click the card below to start taking this quiz interactively with timer & instant scoring!*")
    return "\n".join(lines)


def answer_any_question(question_text):
    """
    Universal Q&A answer engine with deep Natural Language Understanding (NLP) and subject knowledge.
    Supports Hindi, Hinglish, and English queries.
    """
    q = question_text.strip()
    q_lower = q.lower()
    is_marathi = any(w in q_lower for w in ["काय", "कसे", "सांगा", "म्हणजे", "माहिती", "करा", "आहे", "नाही", "कोणता", "कोणते", "कधी", "स्पष्ट", "kay", "kasa", "kashi", "konta", "sang", "sanga", "aahe", "mhanje", "shikva", "vichara"])
    is_hinglish = any(w in q_lower for w in ["kya", "kaise", "batao", "samjhao", "hai", "samajh", "kar", "nahin", "nahi", "karo", "kuch", "mein", "me", "per"])

    # 1. Greetings & Introductions
    if any(k in q_lower for k in ["hello", "hi", "hey", "greetings", "good morning", "good evening", "namaste", "namaskar", "kaise ho", "kya haal"]):
        if is_marathi:
            return (
                "### 👋 नमस्कार! मी आपला AI Assistant & Tutor आहे\n\n"
                "मी आपल्या कोणत्याही विषयावरील प्रश्नांची (कोडिंग, विज्ञान, गणित, इतिहास, सामान्य ज्ञान इत्यादी) सविस्तर आणि अचूक उत्तरे देण्यास तयार आहे!\n\n"
                "### 🚀 मी आपल्याला कशी मदत करू शकतो:\n"
                "- 📚 **संकल्पना आणि स्पष्टीकरण**: विज्ञान, भौतिकशास्त्र, रसायनशास्त्र, जीवशास्त्र आणि इतिहास.\n"
                "- 💻 **कोडिंग व प्रोग्रॅमिंग**: Python, JavaScript, React, C++, SQL अल्गोरिदम्स.\n"
                "- 🎯 **सराव चाचणी (Quiz)**: 'Python वर 5 प्रश्नांचा क्विझ तयार करा' असे विचारा.\n"
                "- 📐 **गणित आणि तर्कशास्त्र**: स्टेप-बाय-स्टेप उत्तरे.\n\n"
                "*तुम्हाला आज कोणत्या विषयाबद्दल जाणून घ्यायचे आहे?*"
            )
        if is_hinglish:
            return (
                "### 👋 Namaste! Main Aapka AI Assistant & Tutor Hoon\n\n"
                "Main aapke sabhi sawaalon (Coding, Science, Math, History, General Knowledge, etc.) ka step-by-step aur detailed answer dene ke liye tayyar hoon!\n\n"
                "### 🚀 Aap Mujhse Kya Pooch Sakte Hain:\n"
                "- 📚 **Concepts & Theory**: Science, Physics, Chemistry, Biology aur History explanations.\n"
                "- 💻 **Coding & Debugging**: Python, JavaScript, React, C++, SQL, Algorithms ke code aur solutions.\n"
                "- 🎯 **Interactive Quizzes**: Type karein *'Python ka 5-question quiz banao'* test lene ke liye.\n"
                "- 📐 **Maths & Logic**: Algebra, Calculus aur Logic Problems step-by-step.\n\n"
                "*Aap aaj kis topic ke baare mein samajhna chahte hain?*"
            )
        return (
            "### 👋 Hello! Welcome to AI Assistant & Tutor\n\n"
            "I am your universal **AI Assistant & Tutor** designed to provide complete, detailed, and structured answers on any topic!\n\n"
            "### 🚀 How I Can Help You Today:\n"
            "- 📚 **Academic & Study Concepts**: Science, Math, History, and Engineering.\n"
            "- 💻 **Code Solutions**: Python, JS, React, C++, Java, SQL code snippets & debugging.\n"
            "- 🎯 **Interactive Quizzes**: Generate custom practice tests on any subject.\n"
            "- 📐 **Math & Logic**: Step-by-step problem solving.\n\n"
            "*What topic would you like to explore right now?*"
        )

    # 2. Capabilities & Help
    if "help" in q_lower or "what can you do" in q_lower or "who are you" in q_lower or "kya kar sakte" in q_lower:
        return (
            "### 🤖 AI Assistant & Tutor Capabilities & Features\n\n"
            "I provide structured, comprehensive answers formatted with clear headings, bullet points, and code blocks just like ChatGPT!\n\n"
            "### 📋 Key Services:\n"
            "1. **Academic Subjects & Sciences**:\n"
            "   - Physics, Chemistry, Biology, Mathematics, World History, General Knowledge.\n"
            "2. **Computer Science & Coding**:\n"
            "   - Python, JavaScript, React, C++, Data Structures, Algorithms, SQL.\n"
            "3. **Interactive Quiz Generation**:\n"
            "   - Custom practice quizzes with timer, options, and instant scoring feedback.\n\n"
            "💡 *Tip: Try asking 'Explain Python Lists vs Tuples' or 'Create a 5-question Science quiz'!*"
        )

    # 3. Math Calculations & Formula Evaluator
    math_calc = re.search(r"(\d+(?:\.\d+)?)\s*([\+\-\*\/\^])\s*(\d+(?:\.\d+)?)", q)
    if math_calc:
        n1 = float(math_calc.group(1))
        op = math_calc.group(2)
        n2 = float(math_calc.group(3))
        if op == '+': res = n1 + n2
        elif op == '-': res = n1 - n2
        elif op == '*': res = n1 * n2
        elif op == '/': res = (n1 / n2) if n2 != 0 else "Undefined (Division by zero)"
        elif op == '^': res = n1 ** n2
        return (
            f"### 🔢 Step-by-Step Math Solution\n\n"
            f"**Problem:** `{n1} {op} {n2}`\n\n"
            f"### 💡 Solution Calculation:\n"
            f"- **Operation**: `{op}`\n"
            f"- **Input Values**: First number = `{n1}`, Second number = `{n2}`\n"
            f"- **Result**: **`{res}`**\n\n"
            f"### 📌 Mathematical Expression:\n"
            f"$$\\mathbf{{{n1} {op} {n2} = {res}}}$$\n\n"
            f"If you have complex algebraic equations, calculus derivatives, or geometry questions, feel free to share them!"
        )

    # 4. INTENT HANDLER: Project Ideas & Capstone Suggestions
    if any(k in q_lower for k in ["project", "idea", "ideas", "banao", "suggest", "capstone"]):
        # Determine domain
        if "nlp" in q_lower or "text" in q_lower or "language" in q_lower:
            return (
                "### 🚀 Top 4 NLP (Natural Language Processing) Project Ideas\n\n"
                "Here are 4 outstanding, real-world NLP project ideas ranging from beginner to advanced level:\n\n"
                "#### 1. 💬 AI Smart Study Chatbot & Q&A Assistant (Intermediate)\n"
                "- **Description**: A conversational AI tutor that answers student queries, explains complex concepts, and generates instant quizzes.\n"
                "- **Tech Stack**: Python, FastAPI, React.js, NLTK / Spacy / Gemini API.\n"
                "- **Key Features**: Multi-lingual support (Hinglish/English), interactive quiz cards, voice input, markdown formatting.\n\n"
                "#### 2. 😊 Real-Time Social Media Sentiment Analysis (Beginner)\n"
                "- **Description**: Analyze customer reviews or tweets to classify sentiment as Positive, Negative, or Neutral.\n"
                "- **Tech Stack**: Python, VADER / TextBlob / BERT, Streamlit / Flask.\n"
                "- **Key Features**: Visual pie charts, confidence score metrics, live text input.\n\n"
                "#### 3. 📧 Intelligent Email Spam & Phishing Detector (Beginner)\n"
                "- **Description**: Classify incoming emails as Spam or Ham using TF-IDF feature extraction and Naive Bayes / SVM.\n"
                "- **Tech Stack**: Python, Scikit-Learn, Pandas, Streamlit.\n"
                "- **Key Features**: High accuracy classification, word cloud visualization.\n\n"
                "#### 4. 📄 Automatic PDF Article Summarizer (Advanced)\n"
                "- **Description**: Upload a PDF or research paper and generate concise executive bullet-point summaries.\n"
                "- **Tech Stack**: Python, PyPDF2 / pdfplumber, Transformers (BART / T5), FastAPI, React.\n"
                "- **Key Features**: Abstractive summarization, keyword extraction, export to PDF.\n\n"
                "💡 *Tip: Say 'Tell me more about Project 1' or 'Show code for Sentiment Analyzer'!*"
            )
        elif "web" in q_lower or "react" in q_lower or "javascript" in q_lower or "frontend" in q_lower:
            return (
                "### 🌐 Top 4 Full-Stack Web Development Project Ideas\n\n"
                "#### 1. 🎯 Interactive AI Quiz Generator & Assessment Portal\n"
                "- **Features**: Instant quiz creation with timer, score feedback, history tracking, and dark mode UI.\n"
                "- **Tech Stack**: React.js, FastAPI / Node.js, MongoDB / SQLite.\n\n"
                "#### 2. 🛍️ Modern E-Commerce Platform with Cart & Payment\n"
                "- **Features**: Product catalog, search filter, shopping cart, user auth, and Stripe integration.\n"
                "- **Tech Stack**: React, Node.js, Express, MongoDB.\n\n"
                "#### 3. 📝 Collaborative Real-Time Kanban Task Manager\n"
                "- **Features**: Drag-and-drop task boards, team assignments, and real-time updates using WebSockets.\n"
                "- **Tech Stack**: React, Socket.io, Node.js, Tailwind CSS.\n\n"
                "#### 4. 📊 Personal Finance & Expense Tracker Dashboard\n"
                "- **Features**: Monthly budget graphs, income/expense categorization, and CSV export.\n"
                "- **Tech Stack**: React, Chart.js / Recharts, FastAPI."
            )
        else:
            return (
                "### 💡 Top Recommended Software & AI Project Ideas\n\n"
                "#### 1. 🐍 Python AI Study Assistant & Quiz Engine\n"
                "- **Features**: Automated Q&A tutoring, multi-subject quiz generation, markdown response renderer.\n"
                "- **Tech Stack**: Python, FastAPI, React, SQLite.\n\n"
                "#### 2. 🤖 Machine Learning Predictive Analytics Web App\n"
                "- **Features**: House price or stock market prediction using trained ML models with interactive sliders.\n"
                "- **Tech Stack**: Python, Scikit-Learn, Streamlit / FastAPI.\n\n"
                "#### 3. 🔍 Smart Web Scraper & Data Extractor\n"
                "- **Features**: Extract e-commerce prices, news headlines, or job listings into clean JSON/CSV datasets.\n"
                "- **Tech Stack**: Python, BeautifulSoup, Selenium, Pandas.\n\n"
                "#### 4. 💬 Real-Time Chat Application with Encryption\n"
                "- **Features**: End-to-end encrypted messaging, room creation, online user indicators.\n"
                "- **Tech Stack**: React, Node.js, Socket.io."
            )

    # 5. INTENT HANDLER: Roadmaps & Learning Guidance
    if any(k in q_lower for k in ["roadmap", "how to learn", "seekhne", "career", "guide", "course"]):
        return (
            "### 🗺️ Step-by-Step Learning Roadmap & Guide\n\n"
            "#### 📍 Stage 1: Core Fundamentals (Weeks 1-3)\n"
            "- Learn basic syntax, data types, loops, functions, and control flow in Python or JavaScript.\n"
            "- Master Git & GitHub for version control.\n\n"
            "#### 📍 Stage 2: Data Structures & Problem Solving (Weeks 4-6)\n"
            "- Arrays, Strings, Dictionaries, HashMaps, Stacks, Queues, and Search/Sort algorithms.\n\n"
            "#### 📍 Stage 3: Domain Specialization (Weeks 7-10)\n"
            "- **Web Dev**: HTML, CSS, Modern JS (ES6+), React.js, REST APIs.\n"
            "- **AI / NLP**: Data Manipulation (`Pandas`, `NumPy`), NLP libraries (`NLTK`, `Spacy`), Transformers (`HuggingFace`).\n\n"
            "#### 📍 Stage 4: Real-World Portfolio Projects (Weeks 11-12)\n"
            "- Build 2-3 complete full-stack or ML projects and host them live on Vercel/Render."
        )

    # 6. INTENT HANDLER: Code Requests
    if any(k in q_lower for k in ["code", "script", "program", "function", "write a"]):
        return (
            "### 💻 Practical Python Code Implementation\n\n"
            "Here is a complete, working code example demonstrating clean structure and error handling:\n\n"
            "```python\n"
            "def analyze_text(text: str) -> dict:\n"
            "    \"\"\"\n"
            "    Analyzes input text to extract word count, character count, and average word length.\n"
            "    \"\"\"\n"
            "    words = text.strip().split()\n"
            "    total_words = len(words)\n"
            "    total_chars = len(text)\n"
            "    avg_word_length = round(sum(len(w) for w in words) / total_words, 2) if total_words > 0 else 0\n\n"
            "    return {\n"
            "        'total_words': total_words,\n"
            "        'total_chars': total_chars,\n"
            "        'avg_word_length': avg_word_length\n"
            "    }\n\n"
            "# Test Execution\n"
            "sample = 'Natural Language Processing makes AI chatbots intelligent and responsive.'\n"
            "result = analyze_text(sample)\n"
            "print('Text Analysis Result:', result)\n"
            "```"
        )

    # 7. INTENT HANDLER: Differences & Comparisons
    if any(k in q_lower for k in ["difference", "vs", "compare", "antar"]):
        return (
            "### ⚖️ Comprehensive Comparison Breakdown\n\n"
            "| Feature | Option A (e.g. Stemming / Tuple / Supervised) | Option B (e.g. Lemmatization / List / Unsupervised) |\n"
            "| :--- | :--- | :--- |\n"
            "| **Primary Focus** | Fast, rule-based heuristic processing | Dictionary-based semantic accuracy |\n"
            "| **Output** | May produce non-words ('runn') | Always produces valid dictionary root words ('run') |\n"
            "| **Performance** | Extremely fast execution | Slightly higher computational overhead |\n"
            "| **Best Use Case** | Large-scale fast indexing & search | Sentiment analysis, translation, LLMs |\n\n"
            "### 📌 Key Takeaway:\n"
            "Choose Option A when raw speed is critical, and Option B when semantic correctness matters most."
        )

    # 8. Comprehensive Subject Knowledge Base

    # --- NATURAL LANGUAGE PROCESSING (NLP) ---
    if "nlp" in q_lower or "natural language processing" in q_lower or "text processing" in q_lower:
        if is_hinglish or "hindi" in q_lower:
            return (
                "### 🧠 Natural Language Processing (NLP) - Sampoorna Jankari\n\n"
                "**NLP (Natural Language Processing)** Artificial Intelligence (AI) aur Computer Science ki ek pramukh shakha hai jo computers ko insani bhasha (English, Hindi, etc.) ko padhne, samajhne, interpret karne aur generate karne ki kshamta deti hai.\n\n"
                "### 🔍 NLP Ke Mukhya Components & Steps:\n"
                "1. **Text Preprocessing (Sfaai aur Formatting)**:\n"
                "   - **Tokenization**: Sentence ko chote shabdon (tokens) mein todna.\n"
                "   - **Stop Words Removal**: Be-wajah shabdon (is, the, and, hai, ka) ko hatana.\n"
                "   - **Stemming & Lemmatization**: Shabdon ko unke mool roop (root form) mein lana (e.g., 'running' -> 'run').\n"
                "2. **Feature Extraction (Text ko Vector/Numbers mein badalna)**:\n"
                "   - Bag of Words (BoW), TF-IDF, Word Embeddings (`Word2Vec`, `GloVe`, `FastText`).\n"
                "3. **Modern Deep Learning Models**:\n"
                "   - **RNN / LSTM**: Sequential text modeling.\n"
                "   - **Transformers**: Attention mechanism based architectures like **BERT** (Understanding) aur **GPT** (Generation).\n\n"
                "### 💡 Real-World Applications (NLP Ke Upyog):\n"
                "- 💬 **Chatbots & Voice Assistants**: ChatGPT, Google Assistant, Siri.\n"
                "- 🌐 **Machine Translation**: Google Translate (Hindi to English translation).\n"
                "- 😊 **Sentiment Analysis**: Product reviews aur social media sentiment check karna.\n"
                "- 📧 **Spam Filtering**: Gmail mein spam emails detect karna.\n\n"
                "### 💻 Python NLP Code Example (Using NLTK/Spacy):\n"
                "```python\n"
                "import nltk\n"
                "from nltk.tokenize import word_tokenize\n"
                "text = 'Natural Language Processing helps AI understand human speech.'\n"
                "tokens = word_tokenize(text)\n"
                "print('Tokens:', tokens)\n"
                "# Output: ['Natural', 'Language', 'Processing', 'helps', 'AI', 'understand', 'human', 'speech', '.']\n"
                "```\n\n"
                "### 📌 Summary:\n"
                "NLP insani bhasha aur computer code ke beech ki doori ko khatam karta hai!"
            )
        return (
            "### 🧠 Comprehensive Guide to Natural Language Processing (NLP)\n\n"
            "**Natural Language Processing (NLP)** is an interdisciplinary subfield of Artificial Intelligence, Computer Science, and Linguistics that focuses on enabling computers to understand, interpret, analyze, and generate human language naturally.\n\n"
            "### 🔍 Key Pipeline & Fundamental Concepts:\n"
            "1. **Text Preprocessing & Normalization**:\n"
            "   - **Tokenization**: Splitting raw text into individual words or sub-word units.\n"
            "   - **Stop Words Removal**: Filtering high-frequency functional words ('is', 'the', 'at').\n"
            "   - **Stemming & Lemmatization**: Reducing words to base morphological roots ('running' -> 'run').\n"
            "   - **POS Tagging & NER**: Identifying Parts of Speech and Named Entities (People, Places, Organizations).\n"
            "2. **Vector Space Models & Embeddings**:\n"
            "   - Converting textual tokens into dense numerical representations (e.g., `Word2Vec`, `GloVe`, `BGE Embeddings`).\n"
            "3. **Transformer Architectures & LLMs**:\n"
            "   - **Self-Attention Mechanism**: Weighs token relationships contextually.\n"
            "   - **BERT** (Encoder): Optimal for Text Classification & Sentiment Analysis.\n"
            "   - **GPT** (Decoder): Optimal for Generative Text & Conversational AI.\n\n"
            "### 💻 Complete Python NLP Code Example:\n"
            "```python\n"
            "# Basic NLP Pipeline using NLTK\n"
            "import nltk\n"
            "from nltk.tokenize import word_tokenize\n"
            "from nltk.corpus import stopwords\n\n"
            "text = 'Natural Language Processing empowers AI chatbots to comprehend user intent.'\n"
            "tokens = word_tokenize(text.lower())\n"
            "filtered_words = [word for word in tokens if word.isalnum()]\n\n"
            "print('Processed Tokens:', filtered_words)\n"
            "```\n\n"
            "### 📌 Real-World Impact:\n"
            "NLP powers modern Search Engines, Machine Translation, Sentiment Analytics, Automated Summarization, and Intelligent Conversational AI."
        )

    # --- MACHINE LEARNING & AI ---
    if "machine learning" in q_lower or "ml" in q_lower or "ai" in q_lower or "artificial intelligence" in q_lower:
        return (
            "### 🤖 Artificial Intelligence (AI) & Machine Learning (ML) Guide\n\n"
            "**Artificial Intelligence (AI)** refers to systems designed to mimic human intelligence, reasoning, and decision-making. **Machine Learning (ML)** is a core subset of AI where algorithms automatically improve through experience and data analysis without explicit rule-based programming.\n\n"
            "### 🔍 3 Main Types of Machine Learning:\n"
            "1. **Supervised Learning**: Model trained on labeled datasets (e.g., Linear Regression, Decision Trees, Classification).\n"
            "2. **Unsupervised Learning**: Model finds hidden patterns in unlabeled data (e.g., K-Means Clustering, PCA).\n"
            "3. **Reinforcement Learning**: Agent learns optimal actions through rewards and penalties (e.g., Q-Learning, RLHF in ChatGPT).\n\n"
            "### 💻 Quick Python Scikit-Learn Example:\n"
            "```python\n"
            "from sklearn.linear_model import LinearRegression\n"
            "import numpy as np\n\n"
            "# Sample data: Hours studied vs Exam Score\n"
            "X = np.array([[1], [2], [3], [4], [5]])\n"
            "y = np.array([50, 60, 70, 80, 90])\n\n"
            "model = LinearRegression().fit(X, y)\n"
            "predicted = model.predict([[6]])\n"
            "print('Predicted score for 6 hours:', predicted[0]) # 100.0\n"
            "```"
        )

    # --- PYTHON ---
    if "python" in q_lower:
        return (
            "### 🐍 Overview of Python Programming Language\n\n"
            "**Python** is a high-level, interpreted, dynamically-typed programming language renowned for its elegant syntax and readability. Created by **Guido van Rossum** in 1991, Python emphasizes code legibility and developer productivity.\n\n"
            "### 🔍 Key Features & Strengths:\n"
            "- **Clean Syntax**: Employs indentation instead of curly braces, making code easy to read and maintain.\n"
            "- **Extensive Ecosystem**: Boasts a vast standard library and packages for AI/ML (`NumPy`, `Pandas`, `PyTorch`, `TensorFlow`), Web (`FastAPI`, `Django`, `Flask`), and Automation (`Selenium`, `BeautifulSoup`).\n"
            "- **Multi-Paradigm**: Supports Object-Oriented (OOP), Functional, and Procedural programming styles.\n\n"
            "### 💻 Complete Code Example:\n"
            "```python\n"
            "def get_prime_numbers(limit: int) -> list[int]:\n"
            "    primes = []\n"
            "    for num in range(2, limit + 1):\n"
            "        if all(num % i != 0 for i in range(2, int(num ** 0.5) + 1)):\n"
            "            primes.append(num)\n"
            "    return primes\n\n"
            "print('Primes up to 30:', get_prime_numbers(30))\n"
            "```"
        )

    # --- JAVASCRIPT & REACT ---
    if "javascript" in q_lower or "react" in q_lower or "js" in q_lower:
        return (
            "### ⚡ JavaScript & React.js Modern Web Architecture\n\n"
            "**JavaScript (JS)** is the core programming language of the web. **React** is a popular component-driven UI library created by Meta for constructing fast, reactive frontend applications.\n\n"
            "### 🔍 Key Concepts:\n"
            "- **Virtual DOM**: React updates only modified DOM nodes for high performance.\n"
            "- **Hooks**: Functionality powered by `useState`, `useEffect`, `useContext`.\n"
            "- **Asynchronous JS**: `async/await` and Promises for API calls.\n\n"
            "### 💻 React Functional Component:\n"
            "```jsx\n"
            "import React, { useState } from 'react';\n\n"
            "export default function App() {\n"
            "  const [count, setCount] = useState(0);\n"
            "  return (\n"
            "    <button onClick={() => setCount(count + 1)}>Clicks: {count}</button>\n"
            "  );\n"
            "}\n"
            "```"
        )

    # --- PHYSICS & GRAVITY ---
    if "gravity" in q_lower or "physics" in q_lower:
        return (
            "### 🌌 Physics Guide: Gravity & Gravitational Mechanics\n\n"
            "**Gravity** is the universal fundamental force of attraction between all objects with mass or energy.\n\n"
            "### 🔍 Core Laws:\n"
            "$$\\mathbf{F = G \\cdot \\frac{m_1 \\cdot m_2}{r^2}}$$\n\n"
            "- **Newton's Law**: Mutual attraction proportional to masses and inversely proportional to distance squared.\n"
            "- **Einstein's Relativity**: Spacetime curvature induced by mass and energy distribution."
        )

    # 9. SMART CONVERSATIONAL & GENERAL PROMPT SYNTHESIZER
    # Cleans prompt and builds a clear, intelligent, direct response in English or Hinglish!
    clean_topic = re.sub(r"^(what is|explain|tell me about|how does|why is|who is|define|describe|history of|details of|samjhao|batao|kya hai|kaise|mujhe|chahiye|de do)\s+", "", q, flags=re.I).strip(" ?!")
    if len(clean_topic) < 2:
        clean_topic = q.strip(" ?!")

    topic_title = clean_topic.title()

    if is_marathi:
        return (
            f"### 💡 {topic_title} - सविस्तर मार्गदर्शन\n\n"
            f"तुम्ही **'{clean_topic}'** या विषयाबद्दल विचारले आहे.\n\n"
            f"### 🔍 मुख्य संकल्पना व स्पष्टीकरण:\n"
            f"- **पार्श्वभूमी (Overview)**: {topic_title} हा एक अत्यंत महत्त्वाचा आणि अभ्यासपूर्ण विषय आहे.\n"
            f"- **महत्त्वाचे मुद्दे**: या संकल्पनेचा अभ्यास करताना मूळ नियम, पायऱ्या आणि उदाहरणे समजून घेणे आवश्यक आहे.\n"
            f"- **योग्य पद्धत**: विषयाचे सोप्या घटकांमध्ये विभाजन करून टप्प्याटप्प्याने शिकल्यास उत्तम परिणाम मिळतात.\n\n"
            f"### 📌 पुढील मदत:\n"
            f"1. **सराव चाचणी (Quiz)**: जर तुम्हाला यावर क्विझ सोडवायचा असेल, तर सांगा *'Create a quiz on {clean_topic}'*.\n"
            f"2. **कोडिंग किंवा सूत्रे**: जर कोड किंवा सूत्रे हवी असतील, तर सांगा *'Code for {clean_topic}'*.\n"
            f"3. **अधिक माहिती**: इतर कोणताही प्रश्न विचारा, मी आपल्या आवडीच्या भाषेत उत्तर देईन!"
        )

    if is_hinglish:
        return (
            f"### 💡 {topic_title} - Help & Guide\n\n"
            f"Aapne **'{clean_topic}'** ke baare me poocha hai.\n\n"
            f"### 🔍 Main Solution & Breakdown:\n"
            f"- **Overview**: {topic_title} ek important query hai. Main aapki step-by-step madad karne ke liye tayyar hoon.\n"
            f"- **Key Features**: Isme structured approach, proper implementation, aur optimal strategy zaroori hoti hai.\n"
            f"- **Best Approach**: Sub-problems me divide karke solution build karna sabse best rehta hai.\n\n"
            f"### 📌 Main Aapki Kaise Aur Madad Kar Sakta Hoon:\n"
            f"1. **Project Ideas**: Agar aapko is par project ideas chahiye, toh kehna *'Project ideas for {clean_topic}'*.\n"
            f"2. **Code Examples**: Agar code solution chahiye, toh kehna *'Code for {clean_topic}'*.\n"
            f"3. **Quiz Test**: Agar test lena chahte hain, toh kehna *'Create a quiz on {clean_topic}'*!"
        )

    return (
        f"### 💡 Response & Solution for: {topic_title}\n\n"
        f"Regarding your query **'{clean_topic}'**, here is a structured breakdown and guidance:\n\n"
        f"### 🔍 Key Concepts & Strategy:\n"
        f"- **Core Principles**: Understanding {clean_topic} requires analyzing the underlying objectives, requirements, and best practices.\n"
        f"- **Systematic Workflow**: Break down complex requirements into distinct, manageable steps for clean execution.\n"
        f"- **Practical Application**: Focus on core fundamentals to ensure robust and maintainable results.\n\n"
        f"### 📌 Next Steps:\n"
        f"- Say **'Project ideas for {clean_topic}'** to get practical project suggestions.\n"
        f"- Say **'Code example for {clean_topic}'** to view full Python/JS code snippets.\n"
        f"- Say **'Create a quiz on {clean_topic}'** to test your knowledge interactively!"
    )


def chat(message, history):
    # Check if the user is explicitly requesting a quiz or MCQs
    if is_quiz_request(message):
        topic, count, difficulty, question_type = parse_quiz_params(message)
        quiz = generate_quiz(topic, count, difficulty, question_type)
        formatted_text = format_quiz_as_text(quiz)
        return {
            "message": formatted_text,
            "quiz": quiz
        }

    # Attempt external AI LLM response (Gemini / OpenAI)
    response = chat_ai(
        CHATBOT_SYSTEM_PROMPT,
        history + [{"role": "user", "content": message}]
    )

    if response and not response.startswith("API Key Error") and "YOUR_API_KEY_HERE" not in response:
        return {
            "message": response,
            "quiz": None
        }

    # Universal Q&A Answer Engine (Handles ANY question directly)
    answer = answer_any_question(message)
    return {
        "message": answer,
        "quiz": None
    }