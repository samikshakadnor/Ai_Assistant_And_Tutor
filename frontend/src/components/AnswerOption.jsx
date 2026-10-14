import React from "react";

export default function AnswerOption({ letter, text, selected, onClick }) {
  return (
    <button
      type="button"
      className={`option-btn ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      <span className="option-letter">{letter}</span>
      <span className="option-text">{text}</span>
      <span className="option-check">{selected ? "✓" : ""}</span>
    </button>
  );
}