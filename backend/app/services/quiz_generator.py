import uuid
from app.services.ai_service import call_ai
from app.prompts.quiz_prompt import QUIZ_SYSTEM_PROMPT
from app.database.collections import save_quiz


def fallback_quiz(topic, count, difficulty, question_type):
    """
    Generates realistic, varied educational questions for any requested count (even 100+)
    when LLM API is unavailable or times out.
    """
    questions = []
    topic_clean = topic.strip().title()

    # Dynamic subtopic domains to make 100 questions varied and educational
    domains = [
        "Core Fundamentals & Principles",
        "Syntax, Structure & Notation",
        "Architecture & System Design",
        "Algorithm Efficiency & Complexity",
        "Memory Management & Resource Handling",
        "Error Handling & Exception Management",
        "Security, Vulnerabilities & Safeguards",
        "Testing, Quality Assurance & Validation",
        "Scalability, Concurrency & Performance",
        "API Integration & Protocols",
        "Data Structures & Storage",
        "Debugging, Profiling & Diagnostics",
        "Design Patterns & Idioms",
        "Deployment, CI/CD & Environments",
        "State Management & Lifecycle",
        "Modern Ecosystem & Tooling",
        "Industry Best Practices & Standards",
        "Real-World Problem Solving & Case Studies",
        "Edge Cases & Optimization Strategies",
        "Future Trends & Advanced Capabilities"
    ]

    question_stems_mcq = [
        ("What is the primary role of {domain} in {topic}?",
         "It establishes robust operational structure and standardized implementation workflows.",
         ["It establishes robust operational structure and standardized implementation workflows.",
          "It forces backward hardware incompatibility and slow processing.",
          "It is an obsolete legacy syntax with no modern relevance.",
          "It bypasses all system validation routines."]),

        ("Which of the following is considered a primary best practice regarding {domain} in {topic}?",
         "Enforcing rigorous automated validation, clean separation of concerns, and defensive handling.",
         ["Enforcing rigorous automated validation, clean separation of concerns, and defensive handling.",
          "Disabling all logging, unit testing, and telemetry.",
          "Hardcoding arbitrary values directly inside business logic.",
          "Ignoring resource lifecycles and concurrency limits."]),

        ("In the context of {topic}, why is understanding {domain} critical for production reliability?",
         "It prevents runtime crashes, ensures predictability, and safeguards system scalability.",
         ["It prevents runtime crashes, ensures predictability, and safeguards system scalability.",
          "It guarantees zero memory usage under all conditions.",
          "It eliminates the need for any programming compilers or interpreters.",
          "It only applies to simulated academic sandbox environments."]),

        ("When optimizing {topic} applications, how does {domain} directly influence overall performance?",
         "By reducing latency bottlenecks and eliminating redundant computational overhead.",
         ["By reducing latency bottlenecks and eliminating redundant computational overhead.",
          "By artificially delaying execution cycles.",
          "By increasing disk I/O operations unnecessarily.",
          "It has no measurable impact on application metrics."]),

        ("Which common vulnerability or pitfall can occur if {domain} is overlooked in {topic}?",
         "System instability, potential data inconsistencies, and difficult-to-diagnose edge failures.",
         ["System instability, potential data inconsistencies, and difficult-to-diagnose edge failures.",
          "Immediate hardware physical breakdown.",
          "Automatic creation of duplicate databases.",
          "None, because systems always auto-correct without configuration."])
    ]

    question_stems_theory = [
        ("Explain the core purpose of {domain} in {topic} and provide an architectural breakdown.",
         "In {topic}, {domain} is vital for providing consistent execution boundaries, ensuring modularity, and managing dependencies across the application lifecycle.",
         "Core theoretical pillars involve system lifecycle, separation of concerns, and standardized implementation guidelines."),

        ("Compare the trade-offs involved when configuring {domain} for high-traffic or large-scale {topic} environments.",
         "Key trade-offs include memory consumption vs throughput, caching speed vs consistency, and code complexity vs maintainability.",
         "Architects must balance overhead against performance guarantees when tuning {domain}."),

        ("Describe a step-by-step diagnostic workflow for troubleshooting issues related to {domain} in {topic}.",
         "Inspect diagnostic logs and stack traces, verify state invariants, isolate reproduction steps in test suites, and deploy patch fixes with monitoring.",
         "Systematic troubleshooting prevents recurring regressions and minimizes operational downtime."),

        ("What are the recommended industry guidelines for securing and hardening {domain} within {topic} implementations?",
         "Implement strict input sanitization, least-privilege access control, encrypted channels, and periodic security auditing.",
         "Defense-in-depth principles ensure robust protection against unauthorized manipulation."),

        ("How does modern tooling in the {topic} ecosystem streamline workflows around {domain}?",
         "Modern tooling provides automated formatting, static linting, continuous integration benchmarks, and immediate feedback loops.",
         "Developer velocity and system quality improve drastically when utilizing contemporary tooling.")
    ]

    for i in range(1, count + 1):
        domain = domains[(i - 1) % len(domains)]

        if question_type == "theoretical":
            stem_tpl, ans_tpl, exp_tpl = question_stems_theory[((i - 1) // len(domains)) % len(question_stems_theory)]
            q_text = stem_tpl.format(domain=domain, topic=topic_clean)
            q_ans = ans_tpl.format(domain=domain, topic=topic_clean)
            q_exp = exp_tpl.format(domain=domain, topic=topic_clean)

            questions.append({
                "id": i,
                "question": f"Q{i}: {q_text}",
                "options": [],
                "answer": q_ans,
                "explanation": q_exp,
                "topic": topic_clean
            })
        else:
            stem_tpl, correct_ans, opts = question_stems_mcq[((i - 1) // len(domains)) % len(question_stems_mcq)]
            q_text = stem_tpl.format(domain=domain, topic=topic_clean)
            formatted_opts = [opt.format(domain=domain, topic=topic_clean) for opt in opts]
            
            # Rotate options slightly so answer is not always Option A
            shift = (i - 1) % 4
            rotated_opts = formatted_opts[shift:] + formatted_opts[:shift]

            questions.append({
                "id": i,
                "question": f"Q{i}: {q_text}",
                "options": rotated_opts,
                "answer": correct_ans.format(domain=domain, topic=topic_clean),
                "explanation": f"In {topic_clean}, mastering {domain} is fundamental for correctness and peak architectural efficiency.",
                "topic": topic_clean
            })

    return {
        "id": str(uuid.uuid4()),
        "title": f"{topic_clean} Mastery ({count} Questions - {question_type.upper()})",
        "description": f"A comprehensive {difficulty} level test with {count} questions assessing theoretical & practical mastery in {topic_clean}.",
        "topic": topic_clean,
        "difficulty": difficulty,
        "question_type": question_type,
        "questions": questions
    }


def generate_single_batch(topic, batch_count, difficulty, question_type, start_id=1, focus_area=None):
    """
    Generates a single batch of questions using the AI.
    """
    options_instruction = ""
    if question_type == "theoretical":
        options_instruction = '"options": [],'
    else:
        options_instruction = '"options": ["Option A", "Option B", "Option C", "Option D"],'

    focus_prompt = f"Focus particularly on {focus_area}." if focus_area else ""

    prompt = f"""
Create a high-quality educational quiz batch.

Topic: {topic}
Number of Questions: {batch_count} (Start numbering from id: {start_id})
Difficulty: {difficulty}
Type: {question_type}
{focus_prompt}

Return ONLY valid JSON matching this structure:
{{
 "title": "{topic} Quiz",
 "description": "A {difficulty} test on {topic}",
 "topic": "{topic}",
 "difficulty": "{difficulty}",
 "question_type": "{question_type}",
 "questions": [
   {{
     "id": {start_id},
     "question": "Question text here",
     {options_instruction}
     "answer": "Detailed correct answer",
     "explanation": "Theoretical explanation",
     "topic": "{topic}"
   }}
 ]
}}
"""
    return call_ai(QUIZ_SYSTEM_PROMPT, prompt)


def generate_quiz(topic, count=5, difficulty="medium", question_type="mcq"):
    """
    Main quiz generation orchestrator.
    Handles from 1 to 100+ questions seamlessly using intelligent batching and robust fallback.
    """
    # Clamp count to safe range [1, 150]
    safe_count = max(1, min(int(count), 150))
    all_questions = []

    # If count is small (<= 25), generate in a single call
    if safe_count <= 25:
        result = generate_single_batch(topic, safe_count, difficulty, question_type, start_id=1)
        if result and isinstance(result, dict) and "questions" in result and len(result["questions"]) > 0:
            all_questions = result["questions"]
    else:
        # If count > 25 (e.g. 50 or 100 questions):
        # Batch in chunks of 20-25 questions so we never hit LLM token limits or timeouts
        batch_size = 20
        focus_areas = [
            "Core Fundamentals & Concepts",
            "Advanced Techniques & Edge Cases",
            "Practical Real-World Problem Solving",
            "Architecture & System Design",
            "Debugging, Security & Best Practices"
        ]

        remaining = safe_count
        current_id = 1
        batch_idx = 0

        while remaining > 0:
            current_batch_size = min(batch_size, remaining)
            focus = focus_areas[batch_idx % len(focus_areas)]

            batch_res = generate_single_batch(
                topic,
                current_batch_size,
                difficulty,
                question_type,
                start_id=current_id,
                focus_area=focus
            )

            if batch_res and isinstance(batch_res, dict) and "questions" in batch_res and len(batch_res["questions"]) > 0:
                for q in batch_res["questions"]:
                    q["id"] = current_id
                    all_questions.append(q)
                    current_id += 1
                remaining -= len(batch_res["questions"])
            else:
                # If an AI batch fails, break out and let fallback supply the remaining questions
                break

            batch_idx += 1

    # If AI produced fewer questions than requested or failed completely, fill the deficit using fallback
    if len(all_questions) < safe_count:
        needed = safe_count - len(all_questions)
        fallback = fallback_quiz(topic, safe_count, difficulty, question_type)
        fallback_questions = fallback["questions"]
        
        # If we have zero questions, take all from fallback
        if len(all_questions) == 0:
            all_questions = fallback_questions
        else:
            # Append missing count from fallback
            start_num = len(all_questions) + 1
            for q in fallback_questions[len(all_questions):safe_count]:
                q["id"] = start_num
                all_questions.append(q)
                start_num += 1

    # Re-normalize IDs from 1 to safe_count
    for idx, q in enumerate(all_questions, 1):
        q["id"] = idx

    final_quiz = {
        "id": str(uuid.uuid4()),
        "title": f"{topic.strip().title()} Mastery Quiz ({safe_count} Questions)",
        "description": f"Comprehensive {difficulty.title()} practice assessment covering {topic.strip().title()}.",
        "topic": topic.strip().title(),
        "difficulty": difficulty,
        "question_type": question_type,
        "questions": all_questions
    }

    save_quiz(final_quiz)
    return final_quiz