import React from "react";
import { useNavigate } from "react-router-dom";
import Chatbot from "../components/Chatbot";

export default function Chat({ setQuiz, user, setUser, onOpenAuth, onLogout }) {
  const navigate = useNavigate();

  function handleQuizCreated(quiz) {
    setQuiz(quiz);
    navigate("/quiz");
  }

  return (
    <div className="chat-fullscreen-page">
      <Chatbot
        onQuizCreated={handleQuizCreated}
        user={user}
        setUser={setUser}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
      />
    </div>
  );
}