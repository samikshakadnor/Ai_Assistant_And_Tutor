import React, { useState } from "react";
import QuizCard from "./QuizCard";

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="chatgpt-code-block">
      <div className="code-header">
        <span className="code-lang">{language || "code"}</span>
        <button className="copy-code-btn" onClick={handleCopy}>
          {copied ? "✓ Copied!" : "📋 Copy code"}
        </button>
      </div>
      <pre className="code-content">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderFormattedContent(text) {
  if (!text) return null;

  // Split by code blocks ```lang ... ```
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const textBefore = text.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push({ type: "text", content: textBefore });
    }

    parts.push({
      type: "code",
      language: match[1] || "plaintext",
      content: match[2].trim()
    });

    lastIndex = match.index + match[0].length;
  }

  const textAfter = text.substring(lastIndex);
  if (textAfter) {
    parts.push({ type: "text", content: textAfter });
  }

  return (
    <div className="formatted-markdown">
      {parts.map((part, i) => {
        if (part.type === "code") {
          return <CodeBlock key={i} code={part.content} language={part.language} />;
        }

        // Process paragraphs & block structures
        const blocks = part.content.split("\n\n");
        return (
          <div key={i} className="text-blocks">
            {blocks.map((block, bIdx) => renderBlock(block, bIdx))}
          </div>
        );
      })}
    </div>
  );
}

function renderBlock(blockText, blockIdx) {
  if (!blockText.trim()) return null;

  const lines = blockText.split("\n");

  // Single line checks
  if (lines.length === 1) {
    const line = lines[0].trim();
    if (line.startsWith("#### ")) return <h4 key={blockIdx} className="chat-h4">{renderInlineText(line.slice(5))}</h4>;
    if (line.startsWith("### ")) return <h3 key={blockIdx} className="chat-h3">{renderInlineText(line.slice(4))}</h3>;
    if (line.startsWith("## ")) return <h2 key={blockIdx} className="chat-h2">{renderInlineText(line.slice(3))}</h2>;
    if (line.startsWith("# ")) return <h1 key={blockIdx} className="chat-h1">{renderInlineText(line.slice(2))}</h1>;
    if (line === "---" || line === "***") return <hr key={blockIdx} className="chat-hr" />;
  }

  // Entire block is unordered list
  const isUnorderedList = lines.every(l => /^\s*[\-\*]\s+/.test(l));
  if (isUnorderedList) {
    return (
      <ul key={blockIdx} className="chat-ul">
        {lines.map((l, idx) => (
          <li key={idx}>{renderInlineText(l.replace(/^\s*[\-\*]\s+/, ""))}</li>
        ))}
      </ul>
    );
  }

  // Entire block is ordered list
  const isOrderedList = lines.every(l => /^\s*\d+\.\s+/.test(l));
  if (isOrderedList) {
    return (
      <ol key={blockIdx} className="chat-ol">
        {lines.map((l, idx) => (
          <li key={idx}>{renderInlineText(l.replace(/^\s*\d+\.\s+/, ""))}</li>
        ))}
      </ol>
    );
  }

  // Mixed block rendering (paragraphs with embedded headings, lists, or line breaks)
  return (
    <div key={blockIdx} className="chat-block-paragraph">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("#### ")) {
          return <h4 key={lIdx} className="chat-h4">{renderInlineText(trimmed.slice(5))}</h4>;
        }
        if (trimmed.startsWith("### ")) {
          return <h3 key={lIdx} className="chat-h3">{renderInlineText(trimmed.slice(4))}</h3>;
        }
        if (trimmed.startsWith("## ")) {
          return <h2 key={lIdx} className="chat-h2">{renderInlineText(trimmed.slice(3))}</h2>;
        }
        if (trimmed.startsWith("# ")) {
          return <h1 key={lIdx} className="chat-h1">{renderInlineText(trimmed.slice(2))}</h1>;
        }

        if (/^\s*[\-\*]\s+/.test(line)) {
          return (
            <div key={lIdx} className="chat-bullet-item">
              <span className="bullet-dot">•</span>
              <span className="bullet-text">{renderInlineText(line.replace(/^\s*[\-\*]\s+/, ""))}</span>
            </div>
          );
        }

        if (/^\s*\d+\.\s+/.test(line)) {
          const match = line.match(/^\s*(\d+)\.\s+(.*)/);
          return (
            <div key={lIdx} className="chat-num-item">
              <span className="num-badge">{match ? match[1] : "1"}.</span>
              <span className="num-text">{renderInlineText(match ? match[2] : line)}</span>
            </div>
          );
        }

        return (
          <React.Fragment key={lIdx}>
            {renderInlineText(line)}
            {lIdx < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function renderInlineText(text) {
  // Bold **text**, italic *text*, and inline `code`
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index} className="chat-strong">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2 && !part.startsWith("**")) {
      return <em key={index} className="chat-em">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={index} className="inline-code-badge">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function ChatMessage({ message, onStartQuiz, user }) {
  const isAssistant = message.role === "assistant";
  const [speaking, setSpeaking] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const handleSpeak = () => {
    if ("speechSynthesis" in window) {
      if (speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
      } else {
        const plainText = message.content.replace(/[#*`~$\-\+]/g, "");
        const utterance = new SpeechSynthesisUtterance(plainText);
        utterance.rate = 1.0;
        utterance.onend = () => setSpeaking(false);
        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  return (
    <div className={`chatgpt-message-row ${isAssistant ? "assistant" : "user"}`}>
      <div className="chatgpt-avatar-wrapper">
        <div className={`chatgpt-avatar ${isAssistant ? "ai" : "user"}`}>
          {isAssistant ? (
            <span className="ai-symbol">🤖</span>
          ) : user?.picture ? (
            <img src={user.picture} alt={user.name || "User"} className="user-avatar-img" />
          ) : (
            <span>{user?.name?.[0]?.toUpperCase() || "👤"}</span>
          )}
        </div>
      </div>

      <div className="chatgpt-message-body">
        <div className="chatgpt-message-header">
          <span className="chatgpt-sender-name">
            {isAssistant ? "AI Assistant & Tutor" : (user?.name || "You")}
          </span>
          
          {isAssistant && (
            <div className="chat-message-actions">
              <button 
                className="msg-action-btn" 
                onClick={handleSpeak}
                title={speaking ? "Stop speaking" : "Read aloud"}
              >
                {speaking ? "⏹️" : "🔊"}
              </button>
              <button 
                className="msg-action-btn" 
                onClick={handleCopyMessage}
                title="Copy response"
              >
                {copiedMsg ? "✓ Copied" : "📋"}
              </button>
            </div>
          )}
        </div>

        <div className="chatgpt-bubble">
          {renderFormattedContent(message.content)}
        </div>

        {message.quiz && onStartQuiz && (
          <div className="chat-quiz-preview">
            <QuizCard quiz={message.quiz} onStart={() => onStartQuiz(message.quiz)} />
          </div>
        )}
      </div>
    </div>
  );
}