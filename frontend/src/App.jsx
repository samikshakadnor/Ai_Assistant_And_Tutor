import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Quiz from "./pages/Quiz";
import Result from "./pages/Result";
import History from "./pages/History";

export default function App() {
  const [quiz, setQuiz] = useState(null);
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("google");
  const location = useLocation();

  const isChatRoute = location.pathname === "/" || location.pathname === "/chat";

  useEffect(() => {
    const savedUser = localStorage.getItem("userData");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }
  }, []);

  const handleOpenAuth = (mode = "google") => {
    setAuthMode(typeof mode === "string" ? mode : "google");
    setAuthModalOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userData");
    setUser(null);
  };

  return (
    <div className={`app-shell ${isChatRoute ? "chat-mode" : "standard-mode"}`}>
      {/* Top Navbar is only shown for non-chat studio/quiz pages to keep ChatGPT UI 100% immersive & identical */}
      {!isChatRoute && (
        <Navbar
          user={user}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
        />
      )}

      <main className={isChatRoute ? "chat-fullscreen-wrapper" : "container"}>
        <Routes>
          <Route
            path="/"
            element={
              <Chat
                setQuiz={setQuiz}
                user={user}
                setUser={setUser}
                onOpenAuth={handleOpenAuth}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/chat"
            element={
              <Chat
                setQuiz={setQuiz}
                user={user}
                setUser={setUser}
                onOpenAuth={handleOpenAuth}
                onLogout={handleLogout}
              />
            }
          />
          <Route path="/quiz" element={<Quiz quiz={quiz} setResult={setResult} user={user} />} />
          <Route path="/result" element={<Result result={result} quiz={quiz} setQuiz={setQuiz} />} />
          <Route path="/history" element={<History setQuiz={setQuiz} user={user} />} />
          <Route path="/studio" element={<Home setQuiz={setQuiz} user={user} onOpenAuth={handleOpenAuth} />} />
        </Routes>
      </main>

      {!isChatRoute && (
        <footer className="app-footer">
          <p>🤖 AI Assistant & Tutor &bull; Interactive Study & Quiz Companion &copy; {new Date().getFullYear()}</p>
        </footer>
      )}

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(userData) => setUser(userData)}
      />
    </div>
  );
}
