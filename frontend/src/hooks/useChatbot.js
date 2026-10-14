import { useState } from "react";
import { sendChat } from "../services/api";

export default function useChatbot() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionTitle, setSessionTitle] = useState(null);

  async function send(message) {
    if (!message.trim()) return null;

    const userMsg = { role: "user", content: message };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await sendChat(message, updatedMessages, sessionId, sessionTitle);
      const assistantMsg = {
        role: "assistant",
        content: response.message,
        quiz: response.quiz || null
      };

      setMessages([...updatedMessages, assistantMsg]);
      
      if (response.session_id) {
        setSessionId(response.session_id);
      }
      if (response.title) {
        setSessionTitle(response.title);
      }
      return response;
    } catch (error) {
      const errorMsg = {
        role: "assistant",
        content: `⚠️ Error: ${error.message || "Unable to reach AI Assistant & Tutor right now. Please try again."}`
      };
      setMessages([...updatedMessages, errorMsg]);
      return null;
    } finally {
      setLoading(false);
    }
  }

  function loadChat(chatSession) {
    if (!chatSession) return;
    setSessionId(chatSession.id);
    setSessionTitle(chatSession.title);
    setMessages(chatSession.messages || []);
  }

  function resetChat() {
    setSessionId(null);
    setSessionTitle(null);
    setMessages([]);
  }

  return {
    messages,
    loading,
    sessionId,
    sessionTitle,
    send,
    setMessages,
    loadChat,
    resetChat
  };
}