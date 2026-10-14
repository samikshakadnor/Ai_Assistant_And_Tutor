import uuid
from app.services.ai_service import call_ai
from app.prompts.quiz_prompt import QUIZ_SYSTEM_PROMPT
from app.database.collections import save_quiz


def fallback_quiz(topic, count, difficulty, question_type):
    """
    Generates realistic fallback questions for any requested topic when LLM API is unavailable.
    """
    questions = []
    topic_clean = topic.strip().title()

    if question_type == "theoretical":
        theoretical_templates = [
            {
                "q": f"Explain the fundamental core principles of {topic_clean} and why it is critical in modern applications.",
                "ans": f"{topic_clean} provides structured frameworks, modularity, and operational efficiency. It enables scalable systems, clear abstraction, and standardized practices across real-world workflows.",
                "exp": f"Theoretical key concepts include architecture principles, system lifecycle, modularity, and performance optimization in {topic_clean}."
            },
            {
                "q": f"Compare and contrast the primary advantages and potential drawbacks of using {topic_clean}.",
                "ans": f"Advantages of {topic_clean} include high performance, reliability, and widespread ecosystem support. Potential drawbacks include initial complexity, learning curve, and resource overhead.",
                "exp": f"Evaluating trade-offs is essential when adopting {topic_clean} in practical engineering or academic scenarios."
            },
            {
                "q": f"Describe a real-world scenario where {topic_clean} plays a pivotal role. What problem does it solve?",
                "ans": f"In industry applications, {topic_clean} automates workflows, eliminates manual errors, and optimizes resource utilization by providing robust algorithmic and structural solutions.",
                "exp": f"Real-world adoption of {topic_clean} focuses on solving scalability, accuracy, and automation challenges."
            },
            {
                "q": f"What are the best practices and design guidelines when implementing solutions in {topic_clean}?",
                "ans": f"Key best practices include thorough testing, adhering to clean architecture, documenting code/procedures, handling edge cases gracefully, and continuous monitoring.",
                "exp": f"Adhering to standards ensures maintainability, security, and long-term sustainability in {topic_clean}."
            }
        ]

        for i in range(1, count + 1):
            tpl = theoretical_templates[(i - 1) % len(theoretical_templates)]
            questions.append({
                "id": i,
                "question": tpl["q"],
                "options": [],
                "answer": tpl["ans"],
                "explanation": tpl["exp"],
                "topic": topic_clean
            })
    else:
        mcq_templates = [
            {
                "q": f"What is the primary core concept behind {topic_clean}?",
                "opts": [
                    f"Fundamental framework and principles of {topic_clean}",
                    f"Legacy hardware protocol unrelated to {topic_clean}",
                    "An outdated mathematical algorithm",
                    "None of the above"
                ],
                "ans": f"Fundamental framework and principles of {topic_clean}",
                "exp": f"This option accurately describes the foundational purpose of {topic_clean}."
            },
            {
                "q": f"Which of the following is a major advantage of utilizing {topic_clean}?",
                "opts": [
                    "Increased efficiency, reliability, and modularity",
                    "High latency and system degradation",
                    "Incompatibility with modern standards",
                    "Guaranteed syntax errors"
                ],
                "ans": "Increased efficiency, reliability, and modularity",
                "exp": f"Standard practices in {topic_clean} prioritize efficiency and system stability."
            },
            {
                "q": f"In real-world applications, how is {topic_clean} most commonly implemented?",
                "opts": [
                    f"As a key component in modern workflow & system design",
                    "Only in manual pen-and-paper calculations",
                    "Exclusively in 1980s mainframe terminals",
                    "It has no practical applications"
                ],
                "ans": f"As a key component in modern workflow & system design",
                "exp": f"{topic_clean} is widely adopted across industry applications today."
            },
            {
                "q": f"Which common challenge is frequently encountered when working with {topic_clean}?",
                "opts": [
                    "Managing complexity, edge cases, and optimization",
                    "Lack of digital electricity",
                    "Overly fast response execution",
                    "Zero learning curve"
                ],
                "ans": "Managing complexity, edge cases, and optimization",
                "exp": "Optimization and edge-case handling are standard technical considerations."
            },
            {
                "q": f"What is a recommended best practice when studying or applying {topic_clean}?",
                "opts": [
                    "Testing thoroughly, following specifications, and iterating",
                    "Ignoring all documentation and error logs",
                    "Hardcoding arbitrary constants throughout",
                    "Skipping validation completely"
                ],
                "ans": "Testing thoroughly, following specifications, and iterating",
                "exp": "Best practices dictate rigorous testing and adherence to standard guidelines."
            }
        ]

        for i in range(1, count + 1):
            tpl = mcq_templates[(i - 1) % len(mcq_templates)]
            questions.append({
                "id": i,
                "question": tpl["q"],
                "options": tpl["opts"],
                "answer": tpl["ans"],
                "explanation": tpl["exp"],
                "topic": topic_clean
            })

    return {
        "id": str(uuid.uuid4()),
        "title": f"{topic_clean} Mastery ({question_type.title()})",
        "description": f"A {difficulty} level test assessing theoretical & practical concepts in {topic_clean}.",
        "topic": topic_clean,
        "difficulty": difficulty,
        "question_type": question_type,
        "questions": questions
    }


def generate_quiz(topic, count=5, difficulty="medium", question_type="mcq"):
    options_instruction = ""
    if question_type == "theoretical":
        options_instruction = '"options": [],'
    else:
        options_instruction = '"options": ["Option A", "Option B", "Option C", "Option D"],'

    prompt = f"""
Create a high-quality educational quiz.

Topic: {topic}
Questions: {count}
Difficulty: {difficulty}
Type: {question_type} (If theoretical, provide open-ended descriptive questions and model answers in 'answer')

Return ONLY valid JSON matching this structure:
{{
 "title": "{topic} Quiz",
 "description": "A {difficulty} test on {topic}",
 "topic": "{topic}",
 "difficulty": "{difficulty}",
 "question_type": "{question_type}",
 "questions": [
   {{
     "id": 1,
     "question": "Descriptive or multiple choice question text here",
     {options_instruction}
     "answer": "Detailed correct answer or model solution",
     "explanation": "Comprehensive theoretical explanation of the concepts involved",
     "topic": "{topic}"
   }}
 ]
}}
"""

    result = call_ai(QUIZ_SYSTEM_PROMPT, prompt)

    if not result or not isinstance(result, dict) or "questions" not in result:
        result = fallback_quiz(topic, count, difficulty, question_type)

    if "id" not in result:
        result["id"] = str(uuid.uuid4())

    save_quiz(result)
    return result