import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import ChatMessage from "./ChatMessage";
import useChatbot from "../hooks/useChatbot";
import { getHistory, getChatHistory, deleteChatHistory } from "../services/api";

const STARTER_PROMPTS = [
  {
    icon: "💡",
    title: "Explain a concept",
    prompt: "Explain how photosynthesis works in plants with key stages and formulas."
  },
  {
    icon: "🐍",
    title: "Write & debug code",
    prompt: "Write a clean Python function for binary search with comments and time complexity analysis."
  },
  {
    icon: "📝",
    title: "Generate practice quiz",
    prompt: "Create a 5-question multiple choice quiz on General Science with explanations."
  },
  {
    icon: "📐",
    title: "Solve math problem",
    prompt: "Explain how to solve quadratic equations using the quadratic formula with step-by-step examples."
  }
];

const QUICK_TOPICS = [
  { name: "Python Programming", icon: "🐍" },
  { name: "General Science", icon: "🔬" },
  { name: "Mathematics & Calculus", icon: "📐" },
  { name: "World History", icon: "📜" },
  { name: "Physics & Mechanics", icon: "⚛️" }
];

export default function Chatbot({ onQuizCreated, user, setUser, onOpenAuth, onLogout }) {
  const { messages, loading, sessionId, sessionTitle, send, setMessages, loadChat, resetChat } = useChatbot();
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatSessions, setChatSessions] = useState([]);
  const [quizHistoryItems, setQuizHistoryItems] = useState([]);
  const [listening, setListening] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") !== "light");
  const chatEndRef = useRef(null);

  const isAuthenticated = Boolean(user && user.email);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode((prev) => !prev);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const refreshHistory = () => {
    if (isAuthenticated) {
      getChatHistory()
        .then((data) => setChatSessions(data || []))
        .catch((err) => console.log("Failed to fetch chat history:", err));

      getHistory()
        .then((data) => setQuizHistoryItems(data || []))
        .catch((err) => console.log("Failed to fetch quiz history:", err));
    } else {
      setChatSessions([]);
      setQuizHistoryItems([]);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, [isAuthenticated]);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }

    const messageText = input;
    setInput("");

    const data = await send(messageText);
    refreshHistory();

    if (data?.quiz) {
      // Quiz generated
    }
  }

  function handlePromptCardClick(promptText) {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    setInput(promptText);
  }

  function handleQuizHistoryItemClick(item) {
    const historyText = `**Past Quiz Summary: ${item.title}**\n\n- **Score:** ${item.score} / ${item.total} (${item.percentage}%)\n- **Feedback:** ${item.feedback}\n- **Date:** ${new Date(item.created_at || Date.now()).toLocaleString()}\n${item.weak_topics?.length ? `\n- **Weak Topics:** ${item.weak_topics.join(", ")}` : ""}`;
    
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: historyText
      }
    ]);
  }

  async function handleDeleteChat(chatId) {
    try {
      await deleteChatHistory(chatId);
      setChatSessions((prev) => prev.filter((c) => c.id !== chatId));
      if (sessionId === chatId) {
        resetChat();
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  }

  function handleStartNewChat() {
    resetChat();
  }

  const startVoiceInput = () => {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognition.start();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chatgpt-layout-container">
      {/* Mobile Overlay when sidebar is open on small screens */}
      {sidebarOpen && (
        <div
          className="chatgpt-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar (ChatGPT Style) */}
      <aside className={`chatgpt-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-top">
          {/* Header Row in Sidebar */}
          <div className="sidebar-header-row">
            <button className="new-chat-btn" onClick={handleStartNewChat} title="New chat">
              <span className="plus-icon">+</span>
              <span className="new-chat-text">New chat</span>
            </button>
            <button
              className="sidebar-close-icon-btn"
              onClick={() => setSidebarOpen(false)}
              title="Close sidebar"
            >
              ✕
            </button>
          </div>

          {/* Quick Hub Navigation */}
          <div className="sidebar-section-title">Study Tools</div>
          <div className="sidebar-nav-links">
            <Link to="/studio" className="sidebar-nav-item">
              <span className="nav-item-icon">⚡</span>
              <span className="nav-item-text">Quiz Studio</span>
            </Link>
            <Link to="/history" className="sidebar-nav-item">
              <span className="nav-item-icon">📊</span>
              <span className="nav-item-text">Quiz History</span>
            </Link>
          </div>

          {/* Stored Question / Chat History */}
          <div className="sidebar-section-title">Recent Chats & Questions</div>
          <div className="sidebar-history-list">
            {chatSessions.length === 0 ? (
              <div className="sidebar-empty-history">
                {isAuthenticated ? "No past questions yet" : "Sign in to save chat history"}
              </div>
            ) : (
              chatSessions.map((chat) => (
                <div
                  key={chat.id}
                  className={`sidebar-chat-item-row ${sessionId === chat.id ? "active" : ""}`}
                >
                  <button
                    className="sidebar-history-item"
                    onClick={() => loadChat(chat)}
                    title={chat.title}
                  >
                    <span className="history-icon">💬</span>
                    <span className="history-text">{chat.title}</span>
                  </button>
                  <button
                    className="chat-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(chat.id);
                    }}
                    title="Delete chat"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quick Topics */}
          <div className="sidebar-section-title">Explore Topics</div>
          <div className="sidebar-topics-list">
            {QUICK_TOPICS.map((topic, i) => (
              <button
                key={i}
                className="sidebar-topic-item"
                onClick={() => {
                  if (!isAuthenticated) {
                    onOpenAuth();
                  } else {
                    setInput(`Explain ${topic.name} in detail with key concepts and examples`);
                  }
                }}
              >
                <span className="topic-icon">{topic.icon}</span>
                <span className="topic-label">{topic.name}</span>
              </button>
            ))}
          </div>

          {/* Past Quiz Results Section */}
          {quizHistoryItems.length > 0 && (
            <>
              <div className="sidebar-section-title">Past Quiz Scores</div>
              <div className="sidebar-history-list">
                {quizHistoryItems.slice(0, 4).map((item, idx) => (
                  <button
                    key={idx}
                    className="sidebar-history-item"
                    onClick={() => handleQuizHistoryItemClick(item)}
                    title={`${item.title} (${item.percentage}%)`}
                  >
                    <span className="history-icon">🎯</span>
                    <span className="history-text">{item.title} ({item.percentage}%)</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sidebar Bottom: User Profile & Sign Out / In */}
        <div className="sidebar-bottom">
          {isAuthenticated ? (
            <div className="sidebar-user-card">
              <div className="sidebar-user-left">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="sidebar-user-avatar-img" />
                ) : (
                  <div className="sidebar-user-avatar">
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{user.name}</span>
                  <span className="sidebar-user-email">{user.email}</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="sidebar-logout-btn"
                title="Sign out of account"
              >
                <span className="logout-icon">🚪</span>
                <span className="logout-text">Sign out</span>
              </button>
            </div>
          ) : (
            <button className="sidebar-auth-btn" onClick={onOpenAuth}>
              <svg className="google-icon-sm" viewBox="0 0 24 24" width="16" height="16">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Workspace (ChatGPT Style) */}
      <main className="chatgpt-main-workspace">
        {/* Sleek Top Header */}
        <header className="chatgpt-header">
          <div className="chatgpt-header-left">
            {!sidebarOpen && (
              <button
                className="toggle-sidebar-btn"
                onClick={() => setSidebarOpen(true)}
                title="Open sidebar"
              >
                ☰
              </button>
            )}

            <div className="model-selector-pill">
              <span className="model-sparkle">🤖</span>
              <span className="model-name">AI Assistant & Tutor</span>
              <span className="badge-online">● Ready</span>
            </div>
          </div>

          <div className="chatgpt-header-right">
            <button className="header-new-chat-btn" onClick={handleStartNewChat} title="New chat">
              + New chat
            </button>

            <button
              className="theme-toggle-header"
              onClick={toggleTheme}
              title="Toggle theme"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            {isAuthenticated ? (
              <div className="header-user-badge">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="header-avatar-img" />
                ) : (
                  <span className="header-avatar-initial">{user.name?.[0]?.toUpperCase() || "U"}</span>
                )}
                <button
                  onClick={onLogout}
                  className="header-logout-btn"
                  title="Sign out of account"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button className="header-login-btn" onClick={onOpenAuth}>
                Continue with Google
              </button>
            )}
          </div>
        </header>

        {/* Message Feed Area */}
        <div className="chatgpt-messages-feed">
          {/* Non-authenticated lock overlay/card */}
          {!isAuthenticated ? (
            <div className="chatgpt-auth-lock-card">
              <div className="auth-lock-icon">🤖</div>
              <h2 className="auth-lock-title">Welcome to AI Assistant & Tutor</h2>
              <p className="auth-lock-subtitle">
                Please sign in with your Google or email account to chat, solve problems, and generate custom study quizzes.
              </p>

              <div className="auth-lock-actions">
                <button className="auth-lock-google-btn" onClick={onOpenAuth}>
                  <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button className="auth-lock-email-btn" onClick={onOpenAuth}>
                  Sign in with Email
                </button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            /* Empty State / Welcome Screen like ChatGPT */
            <div className="chatgpt-welcome-container">
              <div className="welcome-avatar-icon">🤖</div>
              <h2 className="welcome-title">How can I help you today?</h2>
              <p className="welcome-subtitle">
                Ask any question in Marathi, Hindi, English, or any language on Science, Math, Coding, or History!
              </p>

              <div className="starter-prompts-grid">
                {STARTER_PROMPTS.map((card, i) => (
                  <button
                    key={i}
                    className="starter-prompt-card"
                    onClick={() => handlePromptCardClick(card.prompt)}
                  >
                    <div className="card-top">
                      <span className="card-icon">{card.icon}</span>
                      <span className="card-title">{card.title}</span>
                    </div>
                    <p className="card-prompt-preview">{card.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Feed */
            messages.map((msg, index) => (
              <ChatMessage
                key={index}
                message={msg}
                onStartQuiz={onQuizCreated}
                user={user}
              />
            ))
          )}

          {loading && (
            <div className="chatgpt-typing-row">
              <div className="chatgpt-avatar ai">
                <span className="ai-symbol">🤖</span>
              </div>
              <div className="typing-dots-wrapper">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="typing-label">AI Assistant & Tutor is thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Floating ChatGPT Input Footer Area */}
        <div className="chatgpt-footer-area">
          <form className="chatgpt-input-form" onSubmit={handleSubmit}>
            <button
              type="button"
              className={`mic-btn ${listening ? "listening" : ""}`}
              onClick={startVoiceInput}
              title={listening ? "Listening..." : "Voice Input"}
            >
              🎤
            </button>

            <input
              type="text"
              className="chatgpt-input-box"
              placeholder={
                isAuthenticated
                  ? "Message AI Assistant & Tutor (Ask in any language: Marathi, Hindi, English...)"
                  : "Please sign in or continue with Google to message..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || !isAuthenticated}
              onClick={() => {
                if (!isAuthenticated) onOpenAuth();
              }}
            />

            <button
              type="submit"
              className="chatgpt-send-btn"
              disabled={loading || !input.trim() || !isAuthenticated}
              title="Send message"
            >
              ↑
            </button>
          </form>

          <div className="chatgpt-disclaimer">
            AI Assistant & Tutor can make mistakes. Verify important info.
          </div>
        </div>
      </main>
    </div>
  );
}