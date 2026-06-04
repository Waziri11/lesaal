"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Login failed.");
        return;
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (submitError) {
      setError("Unable to connect right now.");
      console.error(submitError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.bgOrbOne} aria-hidden="true" />
      <div className={styles.bgOrbTwo} aria-hidden="true" />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1>Sign in</h1>

        <div className={styles.field}>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            aria-label="Email"
            required
          />
        </div>

        <div className={styles.field}>
          <div className={styles.passwordRow}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              aria-label="Password"
              className={styles.passwordInput}
              required
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4 4l16 16M10.7 10.7a2 2 0 102.6 2.6M9.9 5.1A10.7 10.7 0 0112 5c5.2 0 9 4.5 10 7-0.4 1-1.3 2.4-2.7 3.7M6 8.2C4.8 9.3 4.2 10.5 4 11c1 2.5 4.8 7 10 7 1.3 0 2.4-.2 3.5-.6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
