import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Question from "../components/Question";
import { evaluateQuiz } from "../services/api";

export default function Quiz({ quiz, setResult, user }) {
  const navigate = useNavigate();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45); // 45 seconds per question
  const [totalTimeElapsed, setTotalTimeElapsed] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (!quiz) return;

    // Reset per-question timer & hint toggle
    setTimeLeft(45);
    setShowExplanation(false);

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      setTotalTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [index, quiz]);

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="empty-state">
        <h2>⚠️ No Active Quiz Found</h2>
        <p>Please generate a quiz from the Quiz Studio or AI Tutor first.</p>
        <button className="btn-primary" onClick={() => navigate("/")}>
          Go to Quiz Studio &rarr;
        </button>
      </div>
    );
  }

  const currentQuestion = quiz.questions[index];
  const totalQuestions = quiz.questions.length;
  const progress = ((index + 1) / totalQuestions) * 100;

  function selectAnswer(answer) {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  }

  async function submitQuiz() {
    setLoading(true);

    try {
      const evalResult = await evaluateQuiz({
        quiz_id: quiz.id,
        quiz,
        answers,
        user_email: user ? user.email : null,
        time_taken: totalTimeElapsed
      });

      setResult(evalResult);
      navigate("/result");
    } catch (error) {
      alert(`Error submitting quiz: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="quiz-play-page">
      <div className="quiz-top-bar">
        <div>
          <div className="quiz-meta-badges">
            <span className="badge badge-difficulty">{quiz.difficulty}</span>
            <span className="badge badge-topic">🏷️ {quiz.topic}</span>
          </div>
          <h1 className="quiz-play-title">{quiz.title}</h1>
        </div>

        <div className={`quiz-timer ${timeLeft <= 10 ? "urgent" : ""}`}>
          ⏱️ {timeLeft}s
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Question Drawer Palette */}
      <div className="question-palette">
        {quiz.questions.map((q, i) => {
          const isAnswered = !!answers[q.id];
          const isCurrent = i === index;

          return (
            <button
              key={i}
              className={`palette-item ${isCurrent ? "current" : ""} ${isAnswered ? "answered" : ""}`}
              onClick={() => setIndex(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <Question
        question={currentQuestion}
        selected={answers[currentQuestion.id]}
        onSelect={selectAnswer}
        questionNumber={index + 1}
        totalQuestions={totalQuestions}
      />

      {/* Instant Explanation Toggle */}
      <div className="instant-explanation-box">
        <button 
          type="button" 
          className="explanation-toggle-btn"
          onClick={() => setShowExplanation(!showExplanation)}
        >
          💡 {showExplanation ? "Hide Instant AI Explanation" : "Reveal Instant AI Hint & Explanation"}
        </button>

        {showExplanation && (
          <div className="explanation-content fade-in">
            <p><strong>💡 Explanation:</strong> {currentQuestion.explanation || "No explanation provided for this question."}</p>
          </div>
        )}
      </div>

      <div className="quiz-actions-bar">
        <button
          className="btn-secondary"
          disabled={index === 0}
          onClick={() => setIndex((prev) => prev - 1)}
        >
          &larr; Previous
        </button>

        {index < totalQuestions - 1 ? (
          <button
            className="btn-primary"
            onClick={() => setIndex((prev) => prev + 1)}
          >
            Next &rarr;
          </button>
        ) : (
          <button
            className="btn-success"
            disabled={loading}
            onClick={submitQuiz}
          >
            {loading ? "Checking Answers..." : "Submit Quiz 🏁"}
          </button>
        )}
      </div>
    </div>
  );
}