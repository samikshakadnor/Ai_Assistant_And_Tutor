import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar({ user, onOpenAuth, onLogout }) {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved !== "light"; // Default to modern sleek dark mode
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <>
      <header className="navbar">
        <Link className="brand" to="/">
          <div className="brand-icon">🤖</div>
          <span className="brand-text">AI Assistant <span className="brand-accent">& Tutor</span></span>
        </Link>

        <nav className="nav-links desktop-nav">
          <Link 
            to="/" 
            className={location.pathname === "/" || location.pathname === "/chat" ? "nav-link active" : "nav-link"}
          >
            <span className="nav-icon">💬</span> Chat & Study
          </Link>
        </nav>

        <div className="nav-actions">
          <button 
            className="theme-toggle" 
            onClick={toggleTheme} 
            aria-label="Toggle Theme"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          {user ? (
            <div className="user-profile-badge">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="user-avatar-img" />
              ) : (
                <span className="user-avatar">{user.name?.[0]?.toUpperCase() || "U"}</span>
              )}
              <div className="user-details-min">
                <span className="user-name">{user.name}</span>
              </div>
              <button onClick={onLogout} className="logout-btn" title="Sign Out">
                🚪 Sign out
              </button>
            </div>
          ) : (
            <button className="auth-btn" onClick={onOpenAuth}>
              🔑 Sign In
            </button>
          )}
        </div>
      </header>

      {/* Mobile Bottom Dock Bar */}
      <nav className="mobile-bottom-dock">
        <Link 
          to="/" 
          className={location.pathname === "/" || location.pathname === "/chat" ? "dock-item active" : "dock-item"}
        >
          <span className="dock-icon">🤖</span>
          <span className="dock-label">AI Tutor</span>
        </Link>

        {user ? (
          <button className="dock-item" onClick={onLogout}>
            <span className="dock-icon">🚪</span>
            <span className="dock-label">Logout</span>
          </button>
        ) : (
          <button className="dock-item" onClick={onOpenAuth}>
            <span className="dock-icon">🔑</span>
            <span className="dock-label">Sign In</span>
          </button>
        )}
      </nav>
    </>
  );
}


