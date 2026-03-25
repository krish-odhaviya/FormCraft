"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Lock, User, Eye, EyeOff, Shield, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(username.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Invalid credentials. Please try again.";
      setError(typeof msg === "string" ? msg : "Invalid credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || isAuthenticated) return null;

  return (
    <div className="login-page">
      {/* Background decoration: Soft ambient light */}
      <div className="login-bg-orb orb-1" />
      <div className="login-bg-orb orb-2" />

      <div className="login-card">
        {/* Logo / Brand */}
        <div className="login-brand">
          <div className="login-icon-wrap">
            <Shield size={28} strokeWidth={2} className="login-shield-icon" />
          </div>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to your FormCraft account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" autoComplete="on">
          {/* Username */}
          <div className="login-field">
            <label htmlFor="login-username" className="login-label">
              Username
            </label>
            <div className="login-input-wrap">
              <User size={18} className="login-field-icon" />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                className="login-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="login-password" className="login-label">
                Password
              </label>
              <Link href="#" style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                Forgot?
              </Link>
            </div>
            <div className="login-input-wrap">
              <Lock size={18} className="login-field-icon" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword((p) => !p)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="login-btn"
            disabled={submitting}
          >
            {submitting ? (
              <span className="login-spinner" />
            ) : (
              <>
                Sign In <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="login-footer-text">
          New to FormCraft?{" "}
          <Link href="/register" className="login-link">
            Create an account
          </Link>
        </p>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f8fafc;
          position: relative;
          overflow: hidden;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        /* Background Soft Orbs */
        .login-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.4;
          pointer-events: none;
        }
        .orb-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, #e0e7ff, transparent);
          top: -200px;
          right: -100px;
          animation: float 12s ease-in-out infinite;
        }
        .orb-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #f5f3ff, transparent);
          bottom: -150px;
          left: -100px;
          animation: float 15s ease-in-out infinite reverse;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(40px, 40px); }
        }

        /* Card Design */
        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 1);
          border-radius: 32px;
          padding: 3rem 2.5rem;
          box-shadow: 
            0 20px 25px -5px rgba(0, 0, 0, 0.05),
            0 10px 10px -5px rgba(0, 0, 0, 0.02);
        }

        .login-brand {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .login-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.2);
          margin-bottom: 1.25rem;
          color: #6366f1;
          border: 1px solid #eef2ff;
        }

        .login-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 0.5rem;
          letter-spacing: -0.025em;
        }

        .login-subtitle {
          font-size: 0.95rem;
          color: #64748b;
          margin: 0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .login-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .login-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          margin-left: 0.25rem;
        }

        .login-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-field-icon {
          position: absolute;
          left: 16px;
          color: #94a3b8;
          pointer-events: none;
        }

        .login-input {
          width: 100%;
          padding: 0.85rem 1rem 0.85rem 3rem;
          background: #f1f5f9;
          border: 1px solid transparent;
          border-radius: 14px;
          color: #1e293b;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .login-input::placeholder {
          color: #94a3b8;
        }

        .login-input:focus {
          background: #fff;
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .login-eye-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          display: flex;
          padding: 4px;
        }

        .login-error {
          font-size: 0.85rem;
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          text-align: center;
          font-weight: 500;
        }

        .login-btn {
          width: 100%;
          padding: 1rem;
          background: #1e293b;
          border: none;
          border-radius: 14px;
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .login-btn:hover:not(:disabled) {
          background: #0f172a;
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .login-footer-text {
          text-align: center;
          margin-top: 2rem;
          font-size: 0.9rem;
          color: #64748b;
        }

        .login-link {
          color: #6366f1;
          font-weight: 700;
          text-decoration: none;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 2.5rem 1.5rem;
            margin: 1rem;
          }
        }
      `}</style>
    </div>
  );
}