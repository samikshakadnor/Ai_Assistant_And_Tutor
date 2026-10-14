import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory } from "../services/api";

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    getHistory()
      .then((data) => {
        setHistory(data || []);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const totalQuizzes = history.length;
  const avgScore = totalQuizzes
    ? Math.round(history.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalQuizzes)
    : 0;

  const filteredHistory = history.filter((item) =>
    item.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="history-page">
      <div className="page-header">
        <h1>📜 Your Quiz History & Analytics</h1>
        <p className="subtitle">Track your learning journey and performance over time.</p>
      </div>

      {/* Analytics Overview Cards */}
      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-icon">📊</div>
          <div className="analytics-data">
            <h3>{totalQuizzes}</h3>
            <p>Quizzes Completed</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">🎯</div>
          <div className="analytics-data">
            <h3>{avgScore}%</h3>
            <p>Average Score</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">🏆</div>
          <div className="analytics-data">
            <h3>{history.filter(h => (h.percentage || 0) >= 80).length}</h3>
            <p>Mastered (80%+)</p>
          </div>
        </div>
      </div>

      <div className="history-search-bar">
        <input
          type="text"
          placeholder="🔍 Search history by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-state">Loading your quiz history...</div>
      ) : filteredHistory.length === 0 ? (
        <div className="empty-state">
          <h2>No quiz attempts found</h2>
          <p>{searchTerm ? "No matches found for your search." : "Take a quiz to see your history logged here!"}</p>
          <button className="btn-primary" onClick={() => navigate("/")}>
            Create a Quiz Now &rarr;
          </button>
        </div>
      ) : (
        <div className="history-list">
          {filteredHistory.map((item, index) => {
            const pct = item.percentage || 0;
            const badgeClass = pct >= 80 ? "badge-success" : pct >= 60 ? "badge-warning" : "badge-danger";

            return (
              <div className="history-card" key={index}>
                <div className="history-info">
                  <h3 className="history-title">{item.title}</h3>
                  <small className="history-date">
                    📅 {item.created_at ? new Date(item.created_at).toLocaleString() : "Recently"}
                  </small>
                </div>

                <div className="history-score-box">
                  <span className={`score-badge ${badgeClass}`}>{pct}%</span>
                  <span className="score-details">{item.score} / {item.total} correct</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}