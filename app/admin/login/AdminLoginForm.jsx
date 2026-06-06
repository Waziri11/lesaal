"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Spinner } from "../../../components/ui/spinner";
import { createCsrfHeaders } from "../../../lib/csrf-client";

const MIN_PASSWORD_LENGTH = 8;
const CAPTCHA_LOAD_ERROR_MESSAGE = "Captcha failed to load. Please disable blockers and refresh the page.";

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
      <div className="space-y-2">
        <div ref={captchaRef} />
        {!captchaReady ? (
          <p className="flex items-center gap-2 text-sm text-[color:var(--ui-muted-foreground)]">
            <Spinner />
            Loading captcha challenge...
          </p>
        ) : null}
        {captchaLoadError ? <p className="text-sm text-[color:var(--ui-destructive)]">{captchaLoadError}</p> : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-8">
      <Card className="w-full" aria-busy={loading}>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">Back to Homepage</Link>
            </Button>
            {isForgotMode ? (
              <Button type="button" variant="ghost" size="sm" onClick={closeForgotMode} disabled={loading}>
                Back to Login
              </Button>
            ) : null}
          </div>

          <div>
            <CardTitle>{isForgotMode ? "Forgot password" : "Sign in"}</CardTitle>
            <CardDescription>
              {isForgotMode
                ? "Use OTP reset to recover your admin account."
                : "Sign in with your admin email and password."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isForgotMode ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                    disabled={loading}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={loading}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>

              {error ? <p className="text-sm text-[color:var(--ui-destructive)]">{error}</p> : null}
              {notice ? <p className="text-sm text-[color:var(--ui-success)]">{notice}</p> : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </Button>
              {renderCaptcha()}

              <Button type="button" variant="ghost" className="w-full" onClick={openForgotMode} disabled={loading}>
                Forgot password? Reset with OTP
              </Button>
            </form>
          ) : null}

          {isForgotMode && forgotStep === "request" ? (
            <form className="space-y-4" onSubmit={handleRequestOtp}>
              <p className="text-sm text-[color:var(--ui-muted-foreground)]">Enter your admin email and we will send you a reset OTP.</p>

              <div className="space-y-2">
                <Label htmlFor="forgot-email">Admin Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="admin@example.com"
                  disabled={loading}
                  required
                />
              </div>

              {error ? <p className="text-sm text-[color:var(--ui-destructive)]">{error}</p> : null}
              {notice ? <p className="text-sm text-[color:var(--ui-success)]">{notice}</p> : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>
              {renderCaptcha()}
            </form>
          ) : null}

          {isForgotMode && forgotStep === "reset" ? (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <p className="text-sm text-[color:var(--ui-muted-foreground)]">Enter the OTP from your email, then choose a new password.</p>

              <div className="space-y-2">
                <Label htmlFor="reset-email">Admin Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="admin@example.com"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  value={forgotOtp}
                  onChange={(event) => setForgotOtp(event.target.value)}
                  placeholder="6-digit OTP"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={forgotPassword}
                  onChange={(event) => setForgotPassword(event.target.value)}
                  placeholder="New password"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmForgotPassword}
                  onChange={(event) => setConfirmForgotPassword(event.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading}
                  required
                />
              </div>

              {error ? <p className="text-sm text-[color:var(--ui-destructive)]">{error}</p> : null}
              {notice ? <p className="text-sm text-[color:var(--ui-success)]">{notice}</p> : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting password..." : "Reset password"}
              </Button>
              {renderCaptcha()}

              <Button
                type="button"
                variant="ghost"
                className="w-full"
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
              </Button>
            </form>
          ) : null}

          <p className="text-sm text-[color:var(--ui-muted-foreground)]">
            Don&apos;t have an account yet?{" "}
            <Link href="/signup" className="font-semibold text-[color:var(--ui-primary)] underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
