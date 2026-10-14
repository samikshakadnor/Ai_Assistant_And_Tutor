from datetime import datetime
from app.database.collections import save_result


def evaluate(quiz, answers, user_email=None, time_taken=None):
    questions = quiz.get("questions", [])
    score = 0
    incorrect = []
    weak_topics = []

    for question in questions:
        question_id = question["id"]
        user_answer = (
            answers.get(str(question_id))
            or answers.get(question_id)
        )
        correct_answer = question["answer"]
        options = question.get("options") or []
        is_theoretical = len(options) == 0 or quiz.get("question_type") == "theoretical"

        if is_theoretical:
            # Theoretical answer evaluation
            if user_answer and len(str(user_answer).strip()) >= 5:
                score += 1
            else:
                incorrect.append({
                    "question": question["question"],
                    "your_answer": user_answer or "No answer provided",
                    "correct_answer": correct_answer,
                    "explanation": question["explanation"]
                })
                weak_topics.append(question.get("topic", quiz.get("topic", "General")))
        else:
            # Multiple Choice / True-False evaluation
            if user_answer == correct_answer:
                score += 1
            else:
                incorrect.append({
                    "question": question["question"],
                    "your_answer": user_answer,
                    "correct_answer": correct_answer,
                    "explanation": question["explanation"]
                })
                weak_topics.append(question.get("topic", quiz.get("topic", "General")))

    total = len(questions)
    percentage = round(score / total * 100, 2) if total else 0

    if percentage >= 80:
        feedback = "Excellent performance! 🌟 Deep theoretical understanding demonstrated!"
    elif percentage >= 60:
        feedback = "Good effort! 👍 Review theoretical model answers to master details."
    else:
        feedback = "Keep practicing! 💪 Review model answers and practice key concepts."

    result = {
        "title": quiz.get("title", "Quiz Results"),
        "topic": quiz.get("topic", "General"),
        "score": score,
        "total": total,
        "percentage": percentage,
        "feedback": feedback,
        "weak_topics": list(set(weak_topics)),
        "incorrect": incorrect,
        "user_email": user_email,
        "time_taken": time_taken,
        "created_at": datetime.now().isoformat()
    }

    save_result(result)
    return result