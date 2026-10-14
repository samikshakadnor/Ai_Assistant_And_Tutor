import React from "react";
import { Link, useNavigate } from "react-router-dom";
import QuizResult from "../components/QuizResult";

export default function Result({ result, setQuiz }) {
  const navigate = useNavigate();

  if (!result) {
    return (
      <div className="empty-state">
        <h2>⚠️ No Result Found</h2>
        <p>You haven't completed a quiz yet.</p>
        <Link className="btn-primary" to="/">
          Go to Home &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="result-page">
      <div className="page-header">
        <h1>🎉 Quiz Results</h1>
        <p className="subtitle">Here is a comprehensive summary of your performance.</p>
      </div>

      <QuizResult result={result} />

      <div className="result-actions">
        <button className="btn-secondary" onClick={() => navigate("/history")}>
          📜 View Quiz History
        </button>
        <button className="btn-primary" onClick={() => navigate("/")}>
          🚀 Create Another Quiz
        </button>
      </div>
    </div>
  );
}