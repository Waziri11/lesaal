"use client";

import { useState } from "react";

export default function ProfilePage() {
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [emailForm, setEmailForm] = useState({ currentPassword: "", newEmail: "", otp: "" });
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingOtpRequest, setLoadingOtpRequest] = useState(false);
  const [loadingOtpVerify, setLoadingOtpVerify] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [error, setError] = useState("");

  async function handleChangePassword(event) {
    event.preventDefault();
    setError("");
    setPasswordMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoadingPassword(true);

    try {
      const response = await fetch("/api/admin/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to change password.");
      }

      setPasswordMessage("Password updated successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (requestError) {
      setError(requestError.message || "Unable to change password.");
    } finally {
      setLoadingPassword(false);
    }
  }

  async function handleRequestOtp(event) {
    event.preventDefault();
    setError("");
    setEmailMessage("");
    setLoadingOtpRequest(true);

    try {
      const response = await fetch("/api/admin/profile/request-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: emailForm.currentPassword,
          newEmail: emailForm.newEmail,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to send OTP.");
      }

      if (payload.delivered) {
        setEmailMessage("OTP sent to new email address.");
      } else {
        setEmailMessage("OTP generated but SMTP is not configured yet.");
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to send OTP.");
    } finally {
      setLoadingOtpRequest(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setError("");
    setEmailMessage("");
    setLoadingOtpVerify(true);

    try {
      const response = await fetch("/api/admin/profile/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail: emailForm.newEmail,
          otp: emailForm.otp,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to verify OTP.");
      }

      setEmailMessage("Email updated successfully.");
      setEmailForm({ currentPassword: "", newEmail: "", otp: "" });
    } catch (requestError) {
      setError(requestError.message || "Unable to verify OTP.");
    } finally {
      setLoadingOtpVerify(false);
    }
  }

  return (
    <section className="profile-shell">
      <article className="admin-page-card">
        <h1>Profile Security</h1>
        <p>Change your password and update your email with OTP verification.</p>

        {error ? <p className="form-error">{error}</p> : null}
        {passwordMessage ? <p className="form-success">{passwordMessage}</p> : null}
        {emailMessage ? <p className="form-success">{emailMessage}</p> : null}
      </article>

      <article className="admin-page-card">
        <h2>Change Password</h2>
        <form onSubmit={handleChangePassword} className="profile-form-grid">
          <label>
            Current Password
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
              }
              required
            />
          </label>

          <label>
            New Password
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
              }
              required
            />
          </label>

          <label>
            Confirm New Password
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
              }
              required
            />
          </label>

          <button type="submit" disabled={loadingPassword}>
            {loadingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </article>

      <article className="admin-page-card">
        <h2>Change Email (OTP)</h2>

        <form onSubmit={handleRequestOtp} className="profile-form-grid">
          <label>
            Current Password
            <input
              type="password"
              value={emailForm.currentPassword}
              onChange={(event) =>
                setEmailForm((current) => ({ ...current, currentPassword: event.target.value }))
              }
              required
            />
          </label>

          <label>
            New Email
            <input
              type="email"
              value={emailForm.newEmail}
              onChange={(event) => setEmailForm((current) => ({ ...current, newEmail: event.target.value }))}
              required
            />
          </label>

          <button type="submit" disabled={loadingOtpRequest}>
            {loadingOtpRequest ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>

        <form onSubmit={handleVerifyOtp} className="profile-form-grid">
          <label>
            OTP Code
            <input
              type="text"
              value={emailForm.otp}
              onChange={(event) => setEmailForm((current) => ({ ...current, otp: event.target.value }))}
              required
            />
          </label>

          <button type="submit" disabled={loadingOtpVerify}>
            {loadingOtpVerify ? "Verifying..." : "Verify OTP & Update Email"}
          </button>
        </form>
      </article>

      <article className="admin-page-card">
        <h2>SMTP Configuration</h2>
        <p>
          Configure Gmail SMTP in environment variables: <code>SMTP_HOST</code>, <code>SMTP_PORT</code>,
          <code>SMTP_USER</code>, <code>SMTP_PASS</code>, and optional <code>NOTIFY_EMAIL</code>.
        </p>
      </article>
    </section>
  );
}
