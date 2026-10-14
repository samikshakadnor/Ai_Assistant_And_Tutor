import React from "react";
import { jsPDF } from "jspdf";

export default function QuizResult({ result }) {
  const percentage = result.percentage || 0;
  const isPass = percentage >= 60;

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      let y = 20;

      // Header Banner
      doc.setFillColor(15, 23, 42); // dark background
      doc.rect(0, 0, 210, 35, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("AI QUIZ & TUTOR - SCORECARD REPORT", 15, 22);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 29);

      y = 45;
      doc.setTextColor(15, 23, 42);

      // Quiz Details
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Quiz: ${result.title || "Interactive Quiz"}`, 15, y);
      y += 8;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Score: ${result.score} / ${result.total} (${percentage}%)`, 15, y);
      y += 6;
      doc.text(`Status: ${isPass ? "PASSED" : "PRACTICE NEEDED"} - ${result.feedback || ""}`, 15, y);
      y += 10;

      // Weak Topics
      if (result.weak_topics && result.weak_topics.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Weak Topics to Focus On:", 15, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.text(result.weak_topics.join(", "), 15, y);
        y += 10;
      }

      // Review Section
      if (result.incorrect && result.incorrect.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Incorrect Questions Review:", 15, y);
        y += 8;

        doc.setFontSize(10);
        result.incorrect.forEach((item, idx) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          doc.setFont("helvetica", "bold");
          const qLines = doc.splitTextToSize(`Q${idx + 1}: ${item.question}`, 180);
          doc.text(qLines, 15, y);
          y += qLines.length * 5;

          doc.setFont("helvetica", "normal");
          doc.setTextColor(220, 38, 38);
          doc.text(`Your Answer: ${item.your_answer || "Not answered"}`, 20, y);
          y += 5;

          doc.setTextColor(22, 163, 74);
          doc.text(`Correct Answer: ${item.correct_answer}`, 20, y);
          y += 5;

          doc.setTextColor(71, 85, 105);
          if (item.explanation) {
            const expLines = doc.splitTextToSize(`Explanation: ${item.explanation}`, 175);
            doc.text(expLines, 20, y);
            y += expLines.length * 5;
          }
          y += 4;
        });
      }

      doc.save(`${(result.title || "Quiz_Result").replace(/\s+/g, "_")}_Scorecard.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Could not generate PDF. Printing view instead.");
      window.print();
    }
  };

  return (
    <div className="result-card">
      <div className="score-summary-header">
        <div className={`score-ring ${isPass ? "pass" : "fail"}`}>
          <div className="score-number">{percentage}%</div>
          <div className="score-label">{result.score} / {result.total} Correct</div>
        </div>

        <div className="score-message-box">
          <h2 className="feedback-title">{result.feedback}</h2>
          <p className="feedback-subtitle">
            {percentage >= 80 
              ? "Outstanding performance! You have mastered this topic." 
              : percentage >= 60 
              ? "Good effort! A little more practice and you'll hit 100%." 
              : "Don't worry! Review the detailed breakdown below to improve."}
          </p>
          <button className="btn-export-pdf" onClick={downloadPDF}>
            📥 Download PDF Scorecard
          </button>
        </div>
      </div>

      {result.weak_topics && result.weak_topics.length > 0 && (
        <div className="weak-topics-section">
          <h3>🎯 Topics to Focus On:</h3>
          <div className="topics-pills">
            {result.weak_topics.map((t, i) => (
              <span key={i} className="topic-pill">{t}</span>
            ))}
          </div>
        </div>
      )}

      {result.incorrect && result.incorrect.length > 0 && (
        <div className="review-section">
          <h3>📝 Detailed Answer Breakdown ({result.incorrect.length} incorrect)</h3>
          <div className="review-list">
            {result.incorrect.map((item, idx) => (
              <div key={idx} className="review-item">
                <div className="review-question">
                  <strong>Q:</strong> {item.question}
                </div>
                <div className="review-answers">
                  <div className="your-answer">
                    <span className="label">Your Answer:</span>
                    <span className="value wrong">❌ {item.your_answer || "Not Answered"}</span>
                  </div>
                  <div className="correct-answer">
                    <span className="label">Correct Answer:</span>
                    <span className="value right">✓ {item.correct_answer}</span>
                  </div>
                </div>
                {item.explanation && (
                  <div className="review-explanation">
                    💡 <strong>Explanation:</strong> {item.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

