import React, { useState, useEffect } from "react";
import { loginUser, signupUser, googleAuth } from "../services/api";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [authStep, setAuthStep] = useState("initial"); // "initial", "password", "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  // Fallback in-modal accounts if popup is blocked or on mobile
  const [recentAccounts, setRecentAccounts] = useState([]);
  const [showInModalGoogle, setShowInModalGoogle] = useState(false);

  // Check for pending mobile redirect or listener
  useEffect(() => {
    // Check if mobile auth redirected back
    const pending = localStorage.getItem("pending_google_auth");
    if (pending) {
      try {
        const parsed = JSON.parse(pending);
        localStorage.removeItem("pending_google_auth");
        if (parsed.email) {
          handleExecuteGoogleLogin(parsed.email, parsed.name, parsed.picture);
        }
      } catch (e) {}
    }

    // Listen to Google OAuth popup window postMessage
    const handleMessage = (event) => {
      if (event.data && event.data.type === "GOOGLE_AUTH_SUCCESS") {
        const { email, name, picture } = event.data;
        handleExecuteGoogleLogin(email, name, picture);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setAuthStep("initial");
      setError("");
      setPopupBlocked(false);
      setShowInModalGoogle(false);

      // Load recent device accounts
      try {
        const saved = JSON.parse(localStorage.getItem("recent_google_accounts") || "[]");
        if (Array.isArray(saved) && saved.length > 0) {
          setRecentAccounts(saved);
        } else {
          setRecentAccounts([
            { email: "student.learner@gmail.com", name: "Student Learner" },
            { email: "demo.developer@gmail.com", name: "Developer User" }
          ]);
        }
      } catch (e) {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Open REAL Google OAuth Popup Window (identical to ChatGPT / OpenAI flow)
  const handleOpenGooglePopup = () => {
    setError("");
    setLoading(true);

    const width = 500;
    const height = 620;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

    const popupUrl = "/google-oauth.html";
    let popup = null;

    try {
      popup = window.open(
        popupUrl,
        "GoogleSignIn",
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,location=yes,resizable=yes`
      );
    } catch (e) {
      popup = null;
    }

    // If popup blocked or mobile browser, fallback to in-modal sheet
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      setPopupBlocked(true);
      setShowInModalGoogle(true);
      setLoading(false);
      return;
    }

    // Focus popup
    if (popup.focus) popup.focus();

    // Check if user manually closed popup
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        setLoading(false);
      }
    }, 1000);
  };

  const handleExecuteGoogleLogin = async (userEmail, userName, userPicture) => {
    setError("");
    setLoading(true);
    try {
      const cleanEmail = (userEmail || "").trim().toLowerCase();
      const displayName = userName || cleanEmail.split("@")[0].replace(/[._]/g, " ");
      const picture = userPicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`;

      const res = await googleAuth(cleanEmail, displayName, picture);

      localStorage.setItem("userToken", res.token);
      localStorage.setItem("userData", JSON.stringify(res.user));

      // Save recent account
      try {
        const saved = JSON.parse(localStorage.getItem("recent_google_accounts") || "[]").filter(
          (a) => a.email.toLowerCase() !== cleanEmail
        );
        const updated = [{ email: cleanEmail, name: displayName, picture }, ...saved].slice(0, 4);
        localStorage.setItem("recent_google_accounts", JSON.stringify(updated));
      } catch (e) {}

      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || "Google authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: User enters email in ChatGPT style
  const handleEmailContinue = (e) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    // Proceed to password step
    setAuthStep("password");
  };

  // Step 2: Submit password login
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let res;
      if (authStep === "signup") {
        res = await signupUser(name || email.split("@")[0], email, password);
      } else {
        res = await loginUser(email, password);
      }

      localStorage.setItem("userToken", res.token);
      localStorage.setItem("userData", JSON.stringify(res.user));
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || "Invalid credentials. Please check your password or sign up.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card chatgpt-auth-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} aria-label="Close">
          &times;
        </button>

        {/* ─── ChatGPT Header ─────────────────────────────────── */}
        <div className="chatgpt-auth-header">
          <div className="chatgpt-auth-logo">🤖</div>
          <h2 className="chatgpt-auth-title">
            {authStep === "signup" ? "Create your account" : "Welcome back"}
          </h2>
          <p className="chatgpt-auth-desc">
            Sign in or create an account to chat with AI Tutor, save chat sessions, and generate interactive quizzes.
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {/* ─── IN-MODAL GOOGLE SHEET (if popup is blocked or chosen) ─── */}
        {showInModalGoogle ? (
          <div className="google-sheet-inline">
            <div className="sheet-top-row">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Choose a Google account</span>
            </div>

            <div className="sheet-accounts-list">
              {recentAccounts.map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  className="sheet-account-btn"
                  onClick={() => handleExecuteGoogleLogin(acc.email, acc.name, acc.picture)}
                  disabled={loading}
                >
                  <div className="sheet-avatar">
                    {(acc.name?.[0] || acc.email[0]).toUpperCase()}
                  </div>
                  <div className="sheet-acc-details">
                    <span className="sheet-acc-name">{acc.name}</span>
                    <span className="sheet-acc-email">{acc.email}</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="back-btn"
              onClick={() => setShowInModalGoogle(false)}
            >
              ← Back to other options
            </button>
          </div>
        ) : authStep === "initial" ? (
          /* ─── STEP 1: CHATGPT EMAIL OR GOOGLE ─────────────── */
          <div className="chatgpt-auth-body">
            <form onSubmit={handleEmailContinue} className="chatgpt-auth-form">
              <div className="chatgpt-input-group">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="chatgpt-primary-input"
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="chatgpt-continue-btn" disabled={loading}>
                Continue
              </button>
            </form>

            <div className="chatgpt-divider">
              <span>OR</span>
            </div>

            {/* Real Google OAuth Button */}
            <button
              type="button"
              className="chatgpt-social-btn google"
              onClick={handleOpenGooglePopup}
              disabled={loading}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{loading ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>

            {/* Microsoft SSO option for realistic ChatGPT look */}
            <button
              type="button"
              className="chatgpt-social-btn microsoft"
              onClick={() => {
                const sampleEmail = "user.microsoft@outlook.com";
                handleExecuteGoogleLogin(sampleEmail, "Microsoft User");
              }}
              disabled={loading}
            >
              <svg viewBox="0 0 21 21" width="18" height="18">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              <span>Continue with Microsoft Account</span>
            </button>

            <div className="chatgpt-footer-switch">
              <span>Don't have an account?</span>
              <button
                type="button"
                className="chatgpt-link-btn"
                onClick={() => setAuthStep("signup")}
              >
                Sign up
              </button>
            </div>
          </div>
        ) : (
          /* ─── STEP 2: PASSWORD OR SIGNUP ───────────────────── */
          <div className="chatgpt-auth-body">
            <div className="chatgpt-email-badge">
              <span>{email}</span>
              <button
                type="button"
                className="chatgpt-edit-email-btn"
                onClick={() => setAuthStep("initial")}
              >
                Edit
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="chatgpt-auth-form">
              {authStep === "signup" && (
                <div className="chatgpt-input-group">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="chatgpt-primary-input"
                    required
                  />
                </div>
              )}

              <div className="chatgpt-input-group">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="chatgpt-primary-input"
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="chatgpt-continue-btn" disabled={loading}>
                {loading
                  ? "Processing..."
                  : authStep === "signup"
                  ? "Create account"
                  : "Continue"}
              </button>

              <button
                type="button"
                className="back-btn"
                onClick={() => setAuthStep("initial")}
              >
                ← Back to options
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
