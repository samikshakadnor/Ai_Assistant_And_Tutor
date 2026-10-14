const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000/api";

function getAuthHeader() {
  const token = localStorage.getItem("userToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Something went wrong");
  }

  return data;
}

export function generateQuiz(data) {
  return request("/quiz/generate", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function sendChat(message, history, session_id = null, title = null) {
  return request("/chatbot/chat", {
    method: "POST",
    body: JSON.stringify({ message, history, session_id, title })
  });
}

export function getChatHistory() {
  return request("/chatbot/history");
}

export function deleteChatHistory(sessionId) {
  return request(`/chatbot/history/${sessionId}`, {
    method: "DELETE"
  });
}

export function evaluateQuiz(data) {
  const user = JSON.parse(localStorage.getItem("userData") || "null");
  const payload = {
    ...data,
    user_email: user ? user.email : null
  };
  return request("/results/evaluate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getHistory() {
  return request("/results/history");
}

export function signupUser(name, email, password) {
  return request("/users/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password })
  });
}

export function loginUser(email, password) {
  return request("/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function getCurrentUser() {
  return request("/users/me");
}

export function googleAuth(email, name = null, picture = null) {
  return request("/users/google", {
    method: "POST",
    body: JSON.stringify({ email, name, picture })
  });
}
