"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/formService";
import { useAuth } from "@/context/AuthContext";
import {
  Eye, EyeOff, User, Lock, AlertCircle,
  CheckCircle2, Loader2, ArrowRight, Layers
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace("/");
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Username validation — mirrors backend @Pattern
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (username.trim().length > 50) {
      setError("Username cannot exceed 50 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError("Username can only contain letters, numbers, and underscores.");
      return;
    }

    // Password validation — mirrors backend @Pattern
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
      setError("Password must contain at least one letter and one number.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.register(username.trim(), password);
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      console.log(err);
      if (err.response?.data?.errors) {
        const msgs = err.response.data.errors.map(e => `${e.field}: ${e.message}`).join("\n");
        setError(`Validation Error:\n${msgs}`);
      } else {
        setError(err.response?.data?.message || err.message || "Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1.5rem", position: "relative", overflow: "hidden",
      fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
    }}>

      {/* Dynamic Background Elements */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 500, height: 500, background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", borderRadius: "50%", animation: "float 10s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-5%", left: "-5%", width: 400, height: 400, background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)", borderRadius: "50%", animation: "float 12s ease-in-out infinite reverse" }} />
      </div>

      {/* Main Glass Card */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 420,
        background: "rgba(255, 255, 255, 0.7)",
        border: "1px solid rgba(255, 255, 255, 0.8)",
        borderRadius: 28,
        backdropFilter: "blur(12px)",
        padding: "3rem 2.5rem",
        boxShadow: "0 20px 40px -15px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.02)",
      }}>

        {/* Header Section */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 60, height: 60, borderRadius: 18,
            background: "#fff",
            marginBottom: 20,
            boxShadow: "0 10px 20px rgba(99,102,241,0.15)",
            border: "1px solid rgba(99,102,241,0.1)"
          }}>
            <Layers size={28} style={{ color: "#6366f1" }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1e293b", margin: "0 0 8px", letterSpacing: "-0.03em" }}>
            Join the community
          </h1>
          <p style={{ color: "#64748b", fontSize: 15, margin: 0, lineHeight: 1.5 }}>
            Create your account to start building.
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: "50%", background: "#f0fdf4", marginBottom: 20 }}>
              <CheckCircle2 size={32} style={{ color: "#22c55e" }} />
            </div>
            <h3 style={{ color: "#166534", fontWeight: 700, fontSize: 18, margin: "0 0 8px" }}>Success!</h3>
            <p style={{ color: "#475569", fontSize: 14 }}>We're setting up your workspace...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: 12, padding: "12px 16px" }}>
                <AlertCircle size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#991b1b", fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {/* Input Group: Username */}
            <div className="input-group">
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8, marginLeft: 4 }}>
                Username
              </label>
              <div style={{ position: "relative" }}>
                <User size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(""); }}
                  placeholder="johndoe"
                  required
                  maxLength={50}
                  style={inputStyle}
                />
              </div>
              {username && !/^[a-zA-Z0-9_]+$/.test(username) && (
                <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, marginLeft: 4, fontWeight: 500 }}>
                  Only letters, numbers, and underscores allowed.
                </p>
              )}
            </div>

            {/* Input Group: Password */}
            <div className="input-group">
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8, marginLeft: 4 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={eyeButtonStyle}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && !/(?=.*[A-Za-z])(?=.*\d)/.test(password) && (
                <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, marginLeft: 4, fontWeight: 500 }}>
                  Password must contain at least one letter and one number.
                </p>
              )}
            </div>

            {/* Input Group: Confirm */}
            <div className="input-group">
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8, marginLeft: 4 }}>
                Confirm Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type={showConf ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowConf(!showConf)} style={eyeButtonStyle}>
                  {showConf ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 10,
                width: "100%", padding: "14px",
                borderRadius: 14, border: "none",
                background: loading ? "#94a3b8" : "#1e293b",
                color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><ArrowRight size={18} /> Create Account</>}
            </button>
          </form>
        )}

        {!success && (
          <p style={{ textAlign: "center", marginTop: "2rem", fontSize: 14, color: "#64748b" }}>
            Have an account?{" "}
            <Link href="/login" style={{ color: "#6366f1", fontWeight: 700, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 20px); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus {
          background: #fff !important;
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1) !important;
        }
      `}</style>
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  padding: "12px 16px 12px 48px",
  fontSize: "15px", borderRadius: "12px", outline: "none",
  background: "rgba(0,0,0,0.03)",
  border: "1px solid rgba(0,0,0,0.05)",
  color: "#1e293b",
  transition: "all 0.2s ease",
};

const eyeButtonStyle = {
  position: "absolute", right: 12, top: "50%",
  transform: "translateY(-50%)",
  background: "none", border: "none",
  cursor: "pointer", color: "#94a3b8", padding: 4
};