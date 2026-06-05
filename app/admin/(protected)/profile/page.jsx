"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createCsrfHeaders } from "../../../../lib/csrf-client";

const FALLBACK_GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const EMPTY_PROFILE_FORM = {
  firstName: "",
  lastName: "",
  birthDate: "",
  companyName: "Lesaal",
  companyDescription: "",
  gender: "",
  region: "",
  district: "",
  ward: "",
};

function calculateAge(dateString) {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupMode = searchParams.get("setup") === "1";

  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [locationHierarchy, setLocationHierarchy] = useState([]);
  const [genderOptions, setGenderOptions] = useState(FALLBACK_GENDER_OPTIONS);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [emailForm, setEmailForm] = useState({ currentPassword: "", newEmail: "", otp: "" });
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingOtpRequest, setLoadingOtpRequest] = useState(false);
  const [loadingOtpVerify, setLoadingOtpVerify] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [securityError, setSecurityError] = useState("");

  const selectedRegion = useMemo(
    () => locationHierarchy.find((region) => region.name === profileForm.region) || null,
    [locationHierarchy, profileForm.region]
  );

  const selectedDistrict = useMemo(
    () => selectedRegion?.districts?.find((district) => district.name === profileForm.district) || null,
    [selectedRegion, profileForm.district]
  );

  const districts = selectedRegion?.districts || [];
  const wards = selectedDistrict?.wards || [];
  const age = calculateAge(profileForm.birthDate);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError("");

      try {
        const response = await fetch("/api/admin/profile", { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load profile.");
        }

        if (!isMounted) {
          return;
        }

        setProfileForm({
          firstName: payload.profile.firstName || "",
          lastName: payload.profile.lastName || "",
          birthDate: payload.profile.birthDate || "",
          companyName: payload.profile.companyName || "Lesaal",
          companyDescription: payload.profile.companyDescription || "",
          gender: payload.profile.gender || "",
          region: payload.profile.region || "",
          district: payload.profile.district || "",
          ward: payload.profile.ward || "",
        });
        setLocationHierarchy(Array.isArray(payload.locationHierarchy) ? payload.locationHierarchy : []);
        setGenderOptions(Array.isArray(payload.genderOptions) && payload.genderOptions.length > 0 ? payload.genderOptions : FALLBACK_GENDER_OPTIONS);
      } catch (requestError) {
        if (isMounted) {
          setProfileError(requestError.message || "Unable to load profile.");
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleProfileChange(field, value) {
    setProfileMessage("");
    setProfileError("");

    setProfileForm((current) => {
      if (field === "region") {
        return {
          ...current,
          region: value,
          district: "",
          ward: "",
        };
      }

      if (field === "district") {
        return {
          ...current,
          district: value,
          ward: "",
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  async function handleSaveProfile(event) {
    event.preventDefault();

    if (profileSaving) {
      return;
    }

    setProfileError("");
    setProfileMessage("");
    setProfileSaving(true);

    try {
      const response = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: createCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(profileForm),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update profile.");
      }

      setProfileForm((current) => ({
        ...current,
        firstName: payload.profile.firstName || "",
        lastName: payload.profile.lastName || "",
        birthDate: payload.profile.birthDate || "",
        companyName: payload.profile.companyName || "Lesaal",
        companyDescription: payload.profile.companyDescription || "",
        gender: payload.profile.gender || "",
        region: payload.profile.region || "",
        district: payload.profile.district || "",
        ward: payload.profile.ward || "",
      }));
      setProfileMessage("Profile updated successfully.");

      if (setupMode) {
        router.push("/admin/dashboard");
        return;
      }

      router.refresh();
    } catch (requestError) {
      setProfileError(requestError.message || "Unable to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setSecurityError("");
    setPasswordMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSecurityError("New password and confirm password do not match.");
      return;
    }

    setLoadingPassword(true);

    try {
      const response = await fetch("/api/admin/profile/change-password", {
        method: "POST",
        headers: createCsrfHeaders({ "Content-Type": "application/json" }),
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
      setSecurityError(requestError.message || "Unable to change password.");
    } finally {
      setLoadingPassword(false);
    }
  }

  async function handleRequestOtp(event) {
    event.preventDefault();
    setSecurityError("");
    setEmailMessage("");
    setLoadingOtpRequest(true);

    try {
      const response = await fetch("/api/admin/profile/request-email-otp", {
        method: "POST",
        headers: createCsrfHeaders({ "Content-Type": "application/json" }),
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
      setSecurityError(requestError.message || "Unable to send OTP.");
    } finally {
      setLoadingOtpRequest(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setSecurityError("");
    setEmailMessage("");
    setLoadingOtpVerify(true);

    try {
      const response = await fetch("/api/admin/profile/verify-email-otp", {
        method: "POST",
        headers: createCsrfHeaders({ "Content-Type": "application/json" }),
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
      setSecurityError(requestError.message || "Unable to verify OTP.");
    } finally {
      setLoadingOtpVerify(false);
    }
  }

  return (
    <section className="profile-shell">
      <article className="admin-page-card">
        <h1>{setupMode ? "Complete Your Profile" : "Profile"}</h1>
        <p>
          {setupMode
            ? "Please finish your details before continuing to the dashboard."
            : "Manage your personal details and security settings."}
        </p>
        {profileMessage ? <p className="form-success">{profileMessage}</p> : null}
        {profileError ? <p className="form-error">{profileError}</p> : null}
      </article>

      <article className="admin-page-card">
        <h2>Personal Information</h2>

        {profileLoading ? (
          <p>Loading profile details...</p>
        ) : (
          <form onSubmit={handleSaveProfile} className="profile-form-grid">
            <label>
              First Name
              <input
                type="text"
                value={profileForm.firstName}
                onChange={(event) => handleProfileChange("firstName", event.target.value)}
                required
              />
            </label>

            <label>
              Last Name
              <input
                type="text"
                value={profileForm.lastName}
                onChange={(event) => handleProfileChange("lastName", event.target.value)}
                required
              />
            </label>

            <label>
              Birth Date
              <input
                type="date"
                value={profileForm.birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => handleProfileChange("birthDate", event.target.value)}
                required
              />
            </label>

            <label>
              Age (auto-calculated)
              <input type="text" value={age === null ? "" : String(age)} readOnly placeholder="Will auto-fill from birth date" />
            </label>

            <label>
              Company Name
              <input
                type="text"
                value={profileForm.companyName}
                onChange={(event) => handleProfileChange("companyName", event.target.value)}
                required
              />
            </label>

            <label>
              Gender
              <select
                value={profileForm.gender}
                onChange={(event) => handleProfileChange("gender", event.target.value)}
                required
              >
                <option value="">Select gender</option>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Company Description
              <textarea
                rows={4}
                value={profileForm.companyDescription}
                onChange={(event) => handleProfileChange("companyDescription", event.target.value)}
                required
              />
            </label>

            <label>
              Region
              <select
                value={profileForm.region}
                onChange={(event) => handleProfileChange("region", event.target.value)}
                required
              >
                <option value="">Select region</option>
                {locationHierarchy.map((region) => (
                  <option key={region.name} value={region.name}>
                    {region.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              District
              <select
                value={profileForm.district}
                onChange={(event) => handleProfileChange("district", event.target.value)}
                disabled={!profileForm.region}
                required
              >
                <option value="">Select district</option>
                {districts.map((district) => (
                  <option key={district.name} value={district.name}>
                    {district.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ward
              <select
                value={profileForm.ward}
                onChange={(event) => handleProfileChange("ward", event.target.value)}
                disabled={!profileForm.district}
                required
              >
                <option value="">Select ward</option>
                {wards.map((ward) => (
                  <option key={ward} value={ward}>
                    {ward}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={profileSaving}>
              {profileSaving ? "Saving..." : setupMode ? "Complete Profile" : "Save Profile"}
            </button>
          </form>
        )}
      </article>

      <article className="admin-page-card">
        <h2>Security</h2>
        <p>Change your password and update your email with OTP verification.</p>
        {securityError ? <p className="form-error">{securityError}</p> : null}
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
