import os
import json
import urllib.request
import urllib.parse
from dotenv import load_dotenv

load_dotenv()


def is_valid_key(key):
    return bool(key and len(key) > 10 and "YOUR_API_KEY" not in key and "YOUR_" not in key)


def call_gemini_api(system_prompt, user_prompt):
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not is_valid_key(api_key):
        return None

    configured_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    models_to_try = [configured_model, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
    seen_models = set()

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": f"{system_prompt}\n\n{user_prompt}"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "responseMimeType": "application/json"
        }
    }

    for model in models_to_try:
        if model in seen_models:
            continue
        seen_models.add(model)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=25) as res:
                res_data = json.loads(res.read().decode("utf-8"))
                raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                clean_text = raw_text.replace("```json", "").replace("```", "").strip()
                return json.loads(clean_text)
        except Exception as e:
            print(f"[Gemini API Error - Model {model}]: {e}")
            try:
                payload["generationConfig"].pop("responseMimeType", None)
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=25) as res:
                    res_data = json.loads(res.read().decode("utf-8"))
                    raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                    clean_text = raw_text.replace("```json", "").replace("```", "").strip()
                    return json.loads(clean_text)
            except Exception as inner_e:
                print(f"[Gemini API Fallback Error - Model {model}]: {inner_e}")

    return None


def chat_gemini_api(system_prompt, messages):
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not is_valid_key(api_key):
        return None

    configured_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    models_to_try = [configured_model, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
    seen_models = set()

    contents = []
    contents.append({"role": "user", "parts": [{"text": f"System Context: {system_prompt}"}]})
    contents.append({"role": "model", "parts": [{"text": "Understood. I am your AI Assistant & Tutor."}]})

    for m in messages:
        role = "model" if m.get("role") in ["assistant", "model"] else "user"
        contents.append({"role": role, "parts": [{"text": m.get("content", "")}]})

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7
        }
    }

    for model in models_to_try:
        if model in seen_models:
            continue
        seen_models.add(model)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        for attempt in range(3):
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=25) as res:
                    res_data = json.loads(res.read().decode("utf-8"))
                    return res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            except Exception as e:
                print(f"[Gemini Chat Error - Model {model} Attempt {attempt+1}]: {e}")
                if attempt < 2:
                    import time
                    time.sleep(1)

    return None


def call_pollinations_api(system_prompt, user_prompt):
    """
    Zero-config free AI POST endpoint that returns structured JSON for quizzes.
    """
    url = "https://text.pollinations.ai/"
    payload = {
        "messages": [
            {"role": "system", "content": system_prompt + "\nIMPORTANT: Respond strictly with valid JSON only."},
            {"role": "user", "content": user_prompt}
        ],
        "model": "openai",
        "jsonMode": True
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=4) as res:
            raw_text = res.read().decode("utf-8").strip()
            clean_text = raw_text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
    except Exception as e:
        print(f"[Pollinations JSON AI Error]: {e}")
        return None


def chat_pollinations_api(system_prompt, messages):
    """
    Zero-config free AI chat POST endpoint that returns complete markdown answers to any question.
    """
    url = "https://text.pollinations.ai/"
    
    formatted_messages = [{"role": "system", "content": system_prompt}]
    for m in messages[-6:]:
        role = "assistant" if m.get("role") in ["assistant", "model"] else "user"
        formatted_messages.append({"role": role, "content": m.get("content", "")})

    payload = {
        "messages": formatted_messages,
        "model": "openai"
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as res:
            res_text = res.read().decode("utf-8").strip()
            if res_text and len(res_text) > 10:
                return res_text
    except Exception as e:
        print(f"[Pollinations Chat Error]: {e}")
        return None


def call_ai(system_prompt, user_prompt):
    # 1. Gemini API (if key configured)
    gemini_res = call_gemini_api(system_prompt, user_prompt)
    if gemini_res:
        return gemini_res

    # 2. OpenAI API (if key configured)
    api_key = os.getenv("OPENAI_API_KEY")
    if is_valid_key(api_key):
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt}
                ]
            )
            text = response.choices[0].message.content.strip()
            text = text.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
        except Exception as e:
            print(f"[OpenAI Error]: {e}")

    # 3. Free Zero-Config Pollinations AI Endpoint Fallback
    pollinations_res = call_pollinations_api(system_prompt, user_prompt)
    if pollinations_res:
        return pollinations_res

    return None


def chat_ai(system_prompt, messages):
    # 1. Gemini API (if key configured)
    gemini_chat = chat_gemini_api(system_prompt, messages)
    if gemini_chat:
        return gemini_chat

    # 2. OpenAI API (if key configured)
    api_key = os.getenv("OPENAI_API_KEY")
    if is_valid_key(api_key):
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    *messages
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[OpenAI Chat Error]: {e}")

    # 3. Free Zero-Config Pollinations AI Endpoint Fallback
    pollinations_chat = chat_pollinations_api(system_prompt, messages)
    if pollinations_chat:
        return pollinations_chat

    return None




