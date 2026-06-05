"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import { createCsrfHeaders } from "../../../lib/csrf-client";

const MIN_PASSWORD_LENGTH = 8;
const CAPTCHA_LOAD_ERROR_MESSAGE =
  "Captcha failed to load. Please disable blockers and refresh the page.";

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


export default function AdminLoginForm({ turnstileSiteKey }) {
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

  useEffect(() => {
    captchaTokenRef.current = captchaToken;
  }, [captchaToken]);

  useEffect(() => {
    if (!turnstileSiteKey || typeof window === "undefined") {
      return undefined;
    }

    let isCancelled = false;
    let timeoutId = null;

    function markCaptchaLoadError() {
      if (isCancelled) {
        return;
      }
      setCaptchaReady(false);
      setCaptchaLoadError(CAPTCHA_LOAD_ERROR_MESSAGE);
    }

    function renderTurnstile() {
      if (
        isCancelled ||
        !window.turnstile ||
        !captchaRef.current ||
        widgetIdRef.current !== null
      ) {
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
    };
  }, [turnstileSiteKey]);

  function resetCaptcha() {
    if (widgetIdRef.current !== null && window.turnstile?.reset) {
      window.turnstile.reset(widgetIdRef.current);
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

      router.push(payload.requiresProfileSetup ? "/admin/profile?setup=1" : "/admin/dashboard");
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
      <div className={styles.turnstileWrap}>
        <div ref={captchaRef} />
        {!captchaReady ? <p className={styles.turnstileHint}>Loading captcha challenge...</p> : null}
        {captchaLoadError ? <p className={styles.error}>{captchaLoadError}</p> : null}
      </div>
    );
  }


  return (
    <div className={styles.shell}>
      <div className={styles.bgOrbOne} aria-hidden="true" />
      <div className={styles.bgOrbTwo} aria-hidden="true" />


      <div className={styles.card} aria-busy={loading}>
        <div className={styles.topActions}>
          <Link href="/" className={styles.secondaryLink}>
            Back to Homepage
          </Link>
          {isForgotMode ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={closeForgotMode}
              disabled={loading}
            >
              Back to Login
            </button>
          ) : null}
        </div>

        <h1>{isForgotMode ? "Forgot password" : "Sign in"}</h1>

        {!isForgotMode ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                aria-label="Email"
                disabled={loading}
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
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={loading}
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
            {notice ? <p className={styles.notice}>{notice}</p> : null}

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? (
                <span className={styles.buttonContent}>
                  <span className={styles.spinner} aria-hidden="true" />
                  Signing in...
                </span>
              ) : (
                "Login"
              )}
            </button>
            {renderCaptcha()}

            <button
              type="button"
              className={styles.inlineAction}
              onClick={openForgotMode}
              disabled={loading}
            >
              Forgot password? Reset with OTP
            </button>
          </form>
        ) : null}

        {isForgotMode && forgotStep === "request" ? (
          <form className={styles.form} onSubmit={handleRequestOtp}>
            <p className={styles.helperText}>Enter your admin email and we will send you a reset OTP.</p>

            <div className={styles.field}>
              <input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                placeholder="admin@example.com"
                aria-label="Admin email"
                disabled={loading}
                required
              />
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}
            {notice ? <p className={styles.notice}>{notice}</p> : null}

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? (
                <span className={styles.buttonContent}>
                  <span className={styles.spinner} aria-hidden="true" />
                  Sending OTP...
                </span>
              ) : (
                "Send OTP"
              )}
            </button>
            {renderCaptcha()}
          </form>
        ) : null}

        {isForgotMode && forgotStep === "reset" ? (
          <form className={styles.form} onSubmit={handleResetPassword}>
            <p className={styles.helperText}>Enter the OTP from your email, then choose a new password.</p>

            <div className={styles.field}>
              <input
                id="reset-email"
                type="email"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                placeholder="admin@example.com"
                aria-label="Admin email"
                disabled={loading}
                required
              />
            </div>

            <div className={styles.field}>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                value={forgotOtp}
                onChange={(event) => setForgotOtp(event.target.value)}
                placeholder="6-digit OTP"
                aria-label="OTP"
                disabled={loading}
                required
              />
            </div>

            <div className={styles.field}>
              <input
                id="new-password"
                type="password"
                value={forgotPassword}
                onChange={(event) => setForgotPassword(event.target.value)}
                placeholder="New password"
                aria-label="New password"
                disabled={loading}
                required
              />
            </div>

            <div className={styles.field}>
              <input
                id="confirm-password"
                type="password"
                value={confirmForgotPassword}
                onChange={(event) => setConfirmForgotPassword(event.target.value)}
                placeholder="Confirm new password"
                aria-label="Confirm new password"
                disabled={loading}
                required
              />
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}
            {notice ? <p className={styles.notice}>{notice}</p> : null}

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? (
                <span className={styles.buttonContent}>
                  <span className={styles.spinner} aria-hidden="true" />
                  Resetting password...
                </span>
              ) : (
                "Reset password"
              )}
            </button>
            {renderCaptcha()}

            <button
              type="button"
              className={styles.inlineAction}
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

        <p className={styles.footerText}>
          Don&apos;t have an account yet?{" "}
          <Link href="/signup" className={styles.footerLink}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
