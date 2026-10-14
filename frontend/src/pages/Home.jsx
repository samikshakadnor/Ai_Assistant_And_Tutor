import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateQuiz } from "../services/api";
import QuizCard from "../components/QuizCard";

const FEATURED_TOPICS = [
  { name: "Computer Science", icon: "💻", color: "from-blue-500 to-indigo-600" },
  { name: "Artificial Intelligence", icon: "🤖", color: "from-purple-500 to-pink-600" },
  { name: "Mathematics", icon: "📐", color: "from-emerald-500 to-teal-600" },
  { name: "World History", icon: "📜", color: "from-amber-500 to-orange-600" },
  { name: "General Physics", icon: "⚛️", color: "from-cyan-500 to-blue-600" },
  { name: "Cyber Security", icon: "🔒", color: "from-rose-500 to-red-600" }
];

export default function Home({ setQuiz }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    topic: "Computer Science",
    count: 5,
    difficulty: "medium",
    question_type: "mcq"
  });

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const quizData = await generateQuiz(form);
      setPreview(quizData);
    } catch (error) {
      alert(`Failed to generate quiz: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectTopic(topicName) {
    setForm((prev) => ({ ...prev, topic: topicName }));
  }

  function startQuiz() {
    if (preview) {
      setQuiz(preview);
      navigate("/quiz");
    }
  }

  return (
    <div className="home-page">
      <section className="hero-card">
        <div className="hero-content">
          <span className="eyebrow">✨ AI-Powered Learning Hub</span>
          <h1 className="hero-title">
            Generate Instant Interactive Quizzes with <span className="text-gradient">AI Tutor</span>
          </h1>
          <p className="hero-description">
            Challenge your mind on any topic in seconds. Chat with AI to build tailored practice tests, track your weak topics, and master new skills.
          </p>
          <div className="hero-actions">
            <button className="btn-primary btn-lg" onClick={() => navigate("/chat")}>
              🤖 Chat with AI Tutor &rarr;
            </button>
          </div>
        </div>
      </section>

      <section className="topics-section">
        <div className="section-header">
          <h2>🔥 Popular Topics</h2>
          <p>Click a topic to instantly populate your quiz generator</p>
        </div>

        <div className="topics-grid">
          {FEATURED_TOPICS.map((topic, i) => (
            <button
              key={i}
              className={`topic-card ${form.topic === topic.name ? "selected" : ""}`}
              onClick={() => handleSelectTopic(topic.name)}
            >
              <div className="topic-icon">{topic.icon}</div>
              <div className="topic-name">{topic.name}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="generator-section">
        <div className="form-card">
          <h2>⚡ Create Custom Quiz</h2>

          <form onSubmit={handleSubmit} className="quiz-form">
            <div className="form-group">
              <label>Quiz Topic</label>
              <input
                type="text"
                placeholder="e.g. Python, World War II, Calculus..."
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Number of Questions: <strong>{form.count}</strong></label>
              <input
                type="range"
                min="3"
                max="20"
                value={form.count}
                onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
                className="range-slider"
              />
            </div>

            <div className="form-group">
              <label>Difficulty</label>
              <div className="pill-group">
                {["easy", "medium", "hard"].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    className={`pill-btn ${form.difficulty === diff ? "active" : ""}`}
                    onClick={() => setForm({ ...form, difficulty: diff })}
                  >
                    {diff === "easy" ? "🌱 Easy" : diff === "medium" ? "⚡ Medium" : "🔥 Hard"}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Question Type</label>
              <div className="pill-group">
                <button
                  type="button"
                  className={`pill-btn ${form.question_type === "mcq" ? "active" : ""}`}
                  onClick={() => setForm({ ...form, question_type: "mcq" })}
                >
                  Multiple Choice
                </button>
                <button
                  type="button"
                  className={`pill-btn ${form.question_type === "true_false" ? "active" : ""}`}
                  onClick={() => setForm({ ...form, question_type: "true_false" })}
                >
                  True / False
                </button>
                <button
                  type="button"
                  className={`pill-btn ${form.question_type === "theoretical" ? "active" : ""}`}
                  onClick={() => setForm({ ...form, question_type: "theoretical" })}
                >
                  📝 Theoretical / Essay
                </button>
              </div>
            </div>


            <button type="submit" className="btn-primary btn-block" disabled={loading}>
              {loading ? "🤖 AI is generating quiz..." : "🚀 Generate Quiz"}
            </button>
          </form>
        </div>
      </section>

      {preview && (
        <section className="preview-section">
          <h2>🎉 Your Quiz is Ready!</h2>
          <QuizCard quiz={preview} onStart={startQuiz} />
        </section>
      )}
    </div>
  );
}