"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Spinner } from "../../../components/ui/spinner";
import { createCsrfHeaders } from "../../../lib/csrf-client";
import "../../styles/auth.css";

const MIN_PASSWORD_LENGTH = 8;
const CAPTCHA_LOAD_ERROR_MESSAGE = "Captcha failed to load. Please disable blockers and refresh the page.";

function sanitizeNextPath(value) {
  const candidate = String(value || "").trim();

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "";
  }

  if (!candidate.startsWith("/admin")) {
    return "";
  }

  return candidate;
}

function getCaptchaErrorMessage(errorCode) {
  const code = String(errorCode || "").trim();

  if (code === "400020" || code === "110100" || code === "110110") {
    return "Turnstile site key is invalid. Update TURNSTILE_SITE_KEY.";
  }

  if (code === "110200") {
    return "This domain is not allowed for the Turnstile widget. Add localhost in Turnstile Hostname Management.";
  }

  if (!code) {
    return CAPTCHA_LOAD_ERROR_MESSAGE;
  }

  return `Captcha failed to load (Turnstile error ${code}).`;
}

export default function AdminLoginForm({ turnstileSiteKey, nextPath = "", sessionExpired = false }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState("request");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [confirmForgotPassword, setConfirmForgotPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaLoadError, setCaptchaLoadError] = useState("");
  const captchaRef = useRef(null);
  const widgetIdRef = useRef(null);
  const captchaTokenRef = useRef("");
  const safeNextPath = sanitizeNextPath(nextPath);

  useEffect(() => {
    if (sessionExpired) {
      setNotice("Session expired. Please sign in again.");
    }
  }, [sessionExpired]);

  useEffect(() => {
    captchaTokenRef.current = captchaToken;
  }, [captchaToken]);

  useEffect(() => {
    if (!turnstileSiteKey || typeof window === "undefined") {
      return undefined;
    }

    let isCancelled = false;
    let timeoutId = null;

    function cleanupWidget() {
      if (widgetIdRef.current !== null && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (error) {
          console.warn("Unable to remove Turnstile widget during cleanup.", error);
        } finally {
          widgetIdRef.current = null;
          captchaTokenRef.current = "";
          setCaptchaToken("");
        }
      }
    }

    function markCaptchaLoadError() {
      if (isCancelled) {
        return;
      }
      setCaptchaReady(false);
      setCaptchaLoadError(CAPTCHA_LOAD_ERROR_MESSAGE);
    }

    function renderTurnstile() {
      if (isCancelled || !window.turnstile || !captchaRef.current || widgetIdRef.current !== null) {
        return;
      }

      try {
        widgetIdRef.current = window.turnstile.render(captchaRef.current, {
          sitekey: turnstileSiteKey,
          appearance: "always",
          callback: (token) => {
            const normalizedToken = token || "";
            captchaTokenRef.current = normalizedToken;
            setCaptchaToken(normalizedToken);
          },
          "expired-callback": () => {
            captchaTokenRef.current = "";
            setCaptchaToken("");
          },
          "error-callback": (errorCode) => {
            captchaTokenRef.current = "";
            setCaptchaToken("");
            setCaptchaLoadError(getCaptchaErrorMessage(errorCode));
          },
        });

        setCaptchaReady(true);
        setCaptchaLoadError("");
      } catch (captchaError) {
        console.error("Failed to render captcha widget.", captchaError);
        markCaptchaLoadError();
      }
    }

    if (window.turnstile) {
      renderTurnstile();
      return () => {
        isCancelled = true;
        cleanupWidget();
      };
    }

    const existingScript = document.querySelector('script[data-turnstile-script="true"]');
    const handleScriptError = () => {
      markCaptchaLoadError();
    };

    const startLoadTimeout = () => {
      timeoutId = window.setTimeout(() => {
        if (!window.turnstile && !widgetIdRef.current) {
          markCaptchaLoadError();
        }
      }, 6000);
    };

    if (existingScript) {
      existingScript.addEventListener("load", renderTurnstile);
      existingScript.addEventListener("error", handleScriptError);
      renderTurnstile();
      startLoadTimeout();
      return () => {
        isCancelled = true;
        existingScript.removeEventListener("load", renderTurnstile);
        existingScript.removeEventListener("error", handleScriptError);
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        cleanupWidget();
      };
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = "true";
    script.addEventListener("load", renderTurnstile);
    script.addEventListener("error", handleScriptError);
    document.head.appendChild(script);
    startLoadTimeout();

    return () => {
      isCancelled = true;
      script.removeEventListener("load", renderTurnstile);
      script.removeEventListener("error", handleScriptError);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      cleanupWidget();
    };
  }, [turnstileSiteKey]);

  function resetCaptcha() {
    if (widgetIdRef.current === null || !window.turnstile?.reset) {
      return;
    }

    if (!captchaRef.current || !document.body.contains(captchaRef.current)) {
      return;
    }

    try {
      window.turnstile.reset(widgetIdRef.current);
    } catch (error) {
      console.warn("Unable to reset Turnstile widget.", error);
    } finally {
      captchaTokenRef.current = "";
      setCaptchaToken("");
    }
  }

  function clearMessages() {
    setError("");
    setNotice("");
  }

  async function waitForCaptchaToken(timeoutMs = 8000) {
    if (captchaTokenRef.current) {
      return captchaTokenRef.current;
    }

    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const intervalId = window.setInterval(() => {
        if (captchaTokenRef.current) {
          window.clearInterval(intervalId);
          resolve(captchaTokenRef.current);
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          window.clearInterval(intervalId);
          reject(new Error("Captcha token timeout"));
        }
      }, 150);
    });
  }

  async function getCaptchaTokenForSubmission() {
    if (!turnstileSiteKey) {
      return "";
    }

    if (captchaTokenRef.current) {
      return captchaTokenRef.current;
    }

    if (widgetIdRef.current !== null && window.turnstile?.execute) {
      try {
        window.turnstile.execute(widgetIdRef.current);
        return await waitForCaptchaToken();
      } catch (executionError) {
        console.error("Failed to execute captcha challenge.", executionError);
      }
    }

    return captchaTokenRef.current || "";
  }

  function openForgotMode() {
    clearMessages();
    setForgotEmail(email || forgotEmail);
    setForgotStep("request");
    setForgotOtp("");
    setForgotPassword("");
    setConfirmForgotPassword("");
    setIsForgotMode(true);
  }

  function closeForgotMode() {
    clearMessages();
    setIsForgotMode(false);
    setForgotStep("request");
    setForgotOtp("");
    setForgotPassword("");
    setConfirmForgotPassword("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    clearMessages();

    if (!turnstileSiteKey) {
      setError("Captcha is not configured.");
      return;
    }

    const submissionCaptchaToken = await getCaptchaTokenForSubmission();

    if (!submissionCaptchaToken) {
      setError(captchaLoadError || "Please complete the captcha challenge.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: createCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ email, password, captchaToken: submissionCaptchaToken }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Login failed.");
        setLoading(false);
        resetCaptcha();
        return;
      }

      const destination = payload.requiresProfileSetup ? "/admin/profile?setup=1" : safeNextPath || "/admin/dashboard";
      router.push(destination);
      router.refresh();
    } catch (submitError) {
      setError("Unable to connect right now.");
      console.error(submitError);
      setLoading(false);
      resetCaptcha();
    }
  }

  async function handleRequestOtp(event) {
    event.preventDefault();
    if (loading) return;

    clearMessages();

    if (!turnstileSiteKey) {
      setError("Captcha is not configured.");
      return;
    }

    const submissionCaptchaToken = await getCaptchaTokenForSubmission();

    if (!submissionCaptchaToken) {
      setError(captchaLoadError || "Please complete the captcha challenge.");
      return;
    }

    const normalizedEmail = forgotEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/forgot-password/request-otp", {
        method: "POST",
        headers: createCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ email: normalizedEmail, captchaToken: submissionCaptchaToken }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Unable to send reset code right now.");
        setLoading(false);
        resetCaptcha();
        return;
      }

      setForgotEmail(normalizedEmail);
      setEmail(normalizedEmail);
      setForgotStep("reset");
      setNotice(payload.message || "If an account with that email exists, a reset code has been sent.");
      setLoading(false);
      resetCaptcha();
    } catch (requestError) {
      setError("Unable to connect right now.");
      console.error(requestError);
      setLoading(false);
      resetCaptcha();
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    if (loading) return;

    clearMessages();

    if (!turnstileSiteKey) {
      setError("Captcha is not configured.");
      return;
    }

    const submissionCaptchaToken = await getCaptchaTokenForSubmission();

    if (!submissionCaptchaToken) {
      setError(captchaLoadError || "Please complete the captcha challenge.");
      return;
    }

    if (forgotPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (forgotPassword !== confirmForgotPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/forgot-password/reset", {
        method: "POST",
        headers: createCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otp: forgotOtp,
          newPassword: forgotPassword,
          captchaToken: submissionCaptchaToken,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Unable to reset password right now.");
        setLoading(false);
        resetCaptcha();
        return;
      }

      setPassword("");
      setShowPassword(false);
      setForgotOtp("");
      setForgotPassword("");
      setConfirmForgotPassword("");
      setIsForgotMode(false);
      setForgotStep("request");
      setNotice("Password reset successful. Sign in with your new password.");
      setLoading(false);
      resetCaptcha();
    } catch (resetError) {
      setError("Unable to connect right now.");
      console.error(resetError);
      setLoading(false);
      resetCaptcha();
    }
  }

  function renderCaptcha() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
        <div ref={captchaRef} />
        {!captchaReady ? (
          <p style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#666", margin: 0 }}>
            <Spinner />
            Loading captcha challenge...
          </p>
        ) : null}
        {captchaLoadError ? <p className="auth--error">{captchaLoadError}</p> : null}
      </div>
    );
  }

  return (
    <div className="auth--page">
      <div className="auth--page-logo">
        <Link href="/">LESAAL</Link>
      </div>
      <div className="auth--container">
        <div className="auth--header">
          {isForgotMode ? (
            <div className="auth--header--nav" style={{ justifyContent: "center" }}>
              <button type="button" className="button--link-back" onClick={closeForgotMode} disabled={loading}>
                Back to Login
              </button>
            </div>
          ) : null}
          <h1>{isForgotMode ? "Forgot Password" : "Sign In"}</h1>
        </div>

        <div className="auth--content">
          {!isForgotMode ? (
            <form className="auth--form" onSubmit={handleSubmit}>
              <div className="auth--group">
                <label htmlFor="email" className="auth--label">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  disabled={loading}
                  required
                  className="auth--input"
                />
              </div>

              <div className="auth--group">
                <label htmlFor="password" className="auth--label">Password</label>
                <div className="relative-container">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                    disabled={loading}
                    className="auth--input auth--input-password"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error ? <p className="auth--error">{error}</p> : null}
              {notice ? <p className="auth--notice">{notice}</p> : null}

              <button type="submit" className="button-auth" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </button>
              
              {renderCaptcha()}

              <button type="button" className="button--text-link" onClick={openForgotMode} disabled={loading}>
                Forgot password? Reset with OTP
              </button>
            </form>
          ) : null}

          {isForgotMode && forgotStep === "request" ? (
            <form className="auth--form" onSubmit={handleRequestOtp}>
              <p className="auth--desc">Enter your admin email and we will send you a reset OTP.</p>

              <div className="auth--group">
                <label htmlFor="forgot-email" className="auth--label">Admin Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="admin@example.com"
                  disabled={loading}
                  required
                  className="auth--input"
                />
              </div>

              {error ? <p className="auth--error">{error}</p> : null}
              {notice ? <p className="auth--notice">{notice}</p> : null}

              <button type="submit" className="button-auth" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
              
              {renderCaptcha()}
            </form>
          ) : null}

          {isForgotMode && forgotStep === "reset" ? (
            <form className="auth--form" onSubmit={handleResetPassword}>
              <p className="auth--desc">Enter the OTP from your email, then choose a new password.</p>

              <div className="auth--group">
                <label htmlFor="reset-email" className="auth--label">Admin Email</label>
                <input
                  id="reset-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="admin@example.com"
                  disabled={loading}
                  required
                  className="auth--input"
                />
              </div>

              <div className="auth--group">
                <label htmlFor="otp" className="auth--label">OTP Code</label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  value={forgotOtp}
                  onChange={(event) => setForgotOtp(event.target.value)}
                  placeholder="6-digit OTP"
                  disabled={loading}
                  required
                  className="auth--input"
                />
              </div>

              <div className="auth--group">
                <label htmlFor="new-password" className="auth--label">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  value={forgotPassword}
                  onChange={(event) => setForgotPassword(event.target.value)}
                  placeholder="New password"
                  disabled={loading}
                  required
                  className="auth--input"
                />
              </div>

              <div className="auth--group">
                <label htmlFor="confirm-password" className="auth--label">Confirm New Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmForgotPassword}
                  onChange={(event) => setConfirmForgotPassword(event.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading}
                  required
                  className="auth--input"
                />
              </div>

              {error ? <p className="auth--error">{error}</p> : null}
              {notice ? <p className="auth--notice">{notice}</p> : null}

              <button type="submit" className="button-auth" disabled={loading}>
                {loading ? "Resetting password..." : "Reset password"}
              </button>
              
              {renderCaptcha()}

              <button
                type="button"
                className="button--text-link"
                onClick={() => {
                  clearMessages();
                  setForgotStep("request");
                  setForgotOtp("");
                  setForgotPassword("");
                  setConfirmForgotPassword("");
                }}
                disabled={loading}
              >
                Request a new OTP
              </button>
            </form>
          ) : null}

          <p className="auth--signup-prompt">
            Don&apos;t have an account yet?{" "}
            <Link href="/signup" className="auth--signup-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
