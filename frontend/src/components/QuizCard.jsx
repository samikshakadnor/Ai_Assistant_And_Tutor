import React from "react";

export default function QuizCard({ quiz, onStart }) {
  const difficultyColors = {
    easy: "badge-easy",
    medium: "badge-medium",
    hard: "badge-hard"
  };

  const badgeClass = difficultyColors[quiz.difficulty?.toLowerCase()] || "badge-medium";

  return (
    <div className="quiz-preview-card">
      <div className="quiz-card-header">
        <span className={`difficulty-badge ${badgeClass}`}>
          {quiz.difficulty || "medium"}
        </span>
        <span className="quiz-topic-tag">🏷️ {quiz.topic}</span>
      </div>

      <h3 className="quiz-card-title">{quiz.title}</h3>
      <p className="quiz-card-description">{quiz.description}</p>

      <div className="quiz-card-meta">
        <span>❓ <strong>{quiz.questions?.length || 0}</strong> Questions</span>
        <span>⏱️ ~{Math.ceil((quiz.questions?.length || 10) * 0.8)} mins</span>
      </div>

      <button className="btn-primary start-quiz-btn" onClick={onStart}>
        Start Quiz Now &rarr;
      </button>
    </div>
  );
}