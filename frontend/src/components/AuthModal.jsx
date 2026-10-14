import React, { useState } from "react";
import { loginUser, signupUser, googleAuth } from "../services/api";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Google Sign-in dialog state
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [googleNameInput, setGoogleNameInput] = useState("");

  if (!isOpen) return null;

  const handleGoogleQuickSignIn = async (userEmail, userName) => {
    setError("");
    setLoading(true);
    try {
      const emailToUse = (userEmail || googleEmailInput || "").trim().toLowerCase();
      if (!emailToUse || !emailToUse.includes("@")) {
        throw new Error("Please enter a valid Google email address.");
      }
      const displayName = userName || googleNameInput || emailToUse.split("@")[0].replace(/[._]/g, " ");
      const picture = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailToUse)}`;

      const res = await googleAuth(emailToUse, displayName, picture);
      localStorage.setItem("userToken", res.token);
      localStorage.setItem("userData", JSON.stringify(res.user));
      onAuthSuccess(res.user);
      setShowGoogleInput(false);
      onClose();
    } catch (err) {
      setError(err.message || "Google authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let res;
      if (isLogin) {
        res = await loginUser(email, password);
      } else {
        res = await signupUser(name, email, password);
      }
      localStorage.setItem("userToken", res.token);
      localStorage.setItem("userData", JSON.stringify(res.user));
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose}>&times;</button>
        
        <div className="auth-header">
          <div className="auth-icon">🤖</div>
          <h2>{showGoogleInput ? "Google Account Sign In" : isLogin ? "Sign In to AI Assistant" : "Create Your Account"}</h2>
          <p>
            {showGoogleInput
              ? "Connect with your Google account to start chatting"
              : isLogin
              ? "Sign in with Google or Email to unlock AI Assistant & Tutor"
              : "Sign up to start chatting and save your progress"}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {showGoogleInput ? (
          <div className="google-auth-section">
            <div className="google-quick-accounts">
              <p className="quick-acc-title">Choose an account or enter your Google email:</p>
              
              <button
                type="button"
                className="google-account-btn"
                onClick={() => handleGoogleQuickSignIn("student.ai@gmail.com", "Student Learner")}
                disabled={loading}
              >
                <div className="acc-avatar">S</div>
                <div className="acc-info">
                  <span className="acc-name">Student Learner</span>
                  <span className="acc-email">student.ai@gmail.com</span>
                </div>
              </button>

              <button
                type="button"
                className="google-account-btn"
                onClick={() => handleGoogleQuickSignIn("demo.user@gmail.com", "Demo User")}
                disabled={loading}
              >
                <div className="acc-avatar">D</div>
                <div className="acc-info">
                  <span className="acc-name">Demo User</span>
                  <span className="acc-email">demo.user@gmail.com</span>
                </div>
              </button>
            </div>

            <div className="auth-divider">
              <span>Or enter your Gmail</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGoogleQuickSignIn(googleEmailInput, googleNameInput);
              }}
              className="auth-form"
            >
              <div className="auth-input-group">
                <label>Your Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Sharma"
                  value={googleNameInput}
                  onChange={(e) => setGoogleNameInput(e.target.value)}
                />
              </div>

              <div className="auth-input-group">
                <label>Google Email Address</label>
                <input
                  type="email"
                  placeholder="you@gmail.com"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="google-submit-btn" disabled={loading}>
                {loading ? "Authenticating with Google..." : "Continue with this Google Account"}
              </button>

              <button
                type="button"
                className="back-btn"
                onClick={() => {
                  setShowGoogleInput(false);
                  setError("");
                }}
              >
                ← Back to other options
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Primary Google Login Button */}
            <button
              type="button"
              className="google-login-btn"
              onClick={() => {
                setError("");
                setShowGoogleInput(true);
              }}
              disabled={loading}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <div className="auth-input-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="auth-input-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? "Processing..." : isLogin ? "Sign In with Email" : "Create Account"}
              </button>
            </form>

            <div className="auth-switch">
              <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
              <button
                type="button"
                className="auth-switch-btn"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
              >
                {isLogin ? "Sign Up Free" : "Log In"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
