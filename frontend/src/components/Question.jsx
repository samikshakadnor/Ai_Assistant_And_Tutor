import React, { useState } from "react";
import AnswerOption from "./AnswerOption";

export default function Question({ question, selected, onSelect, questionNumber, totalQuestions }) {
  const [showHint, setShowHint] = useState(false);
  const isTheoretical = !question.options || question.options.length === 0;

  return (
    <div className="question-card">
      <div className="question-card-header">
        <span className="question-badge">
          {isTheoretical ? "📝 Theoretical Question" : "🎯 MCQ"} {questionNumber || question.id} / {totalQuestions}
        </span>
        {question.explanation && (
          <button 
            type="button" 
            className="hint-btn" 
            onClick={() => setShowHint(!showHint)}
          >
            {showHint ? "🙈 Hide Hint" : "💡 Need a Hint?"}
          </button>
        )}
      </div>

      <h2 className="question-text">{question.question}</h2>

      {showHint && question.explanation && (
        <div className="hint-box">
          <strong>Hint / Overview:</strong> {question.explanation}
        </div>
      )}

      {isTheoretical ? (
        <div className="theoretical-input-box">
          <label className="theoretical-label">✍️ Type your detailed theoretical answer below:</label>
          <textarea
            className="theoretical-textarea"
            rows="5"
            placeholder="Explain key concepts, points, and theory here..."
            value={selected || ""}
            onChange={(e) => onSelect(e.target.value)}
          />
        </div>
      ) : (
        <div className="options-grid">
          {question.options.map((option, index) => {
            const letter = String.fromCharCode(65 + index);
            return (
              <AnswerOption
                key={index}
                letter={letter}
                text={option}
                selected={selected === option}
                onClick={() => onSelect(option)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}