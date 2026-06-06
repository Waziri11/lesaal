"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageState from "../../../../components/shared/PageState";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Textarea } from "../../../../components/ui/textarea";
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
  profileImageUrl: "",
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

  const [reloadKey, setReloadKey] = useState(0);

  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const profileImageInputRef = useRef(null);
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
          profileImageUrl: payload.profile.profileImageUrl || "",
          gender: payload.profile.gender || "",
          region: payload.profile.region || "",
          district: payload.profile.district || "",
          ward: payload.profile.ward || "",
        });
        setLocationHierarchy(Array.isArray(payload.locationHierarchy) ? payload.locationHierarchy : []);
        setGenderOptions(
          Array.isArray(payload.genderOptions) && payload.genderOptions.length > 0
            ? payload.genderOptions
            : FALLBACK_GENDER_OPTIONS
        );
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
  }, [reloadKey]);

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
        profileImageUrl: payload.profile.profileImageUrl || "",
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

  async function handleProfileImageUpload(file) {
    if (!(file instanceof File)) {
      return;
    }

    if (!file.type?.startsWith("image/")) {
      setProfileError("Only image files can be uploaded.");
      return;
    }

    setProfileError("");
    setProfileMessage("");
    setProfileImageUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: createCsrfHeaders(),
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Image upload failed.");
      }

      setProfileForm((current) => ({
        ...current,
        profileImageUrl: payload.url || "",
      }));
      setProfileMessage("Profile photo uploaded. Save profile to confirm.");
    } catch (error) {
      setProfileError(error.message || "Image upload failed.");
    } finally {
      setProfileImageUploading(false);
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

  if (profileLoading) {
    return <PageState status="loading" resourceLabel="profile" />;
  }

  if (profileError) {
    return (
      <PageState
        status="error"
        errorMessage={profileError}
        onRetry={() => setReloadKey((current) => current + 1)}
      />
    );
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{setupMode ? "Complete Your Profile" : "Profile"}</CardTitle>
          <CardDescription>
            {setupMode
              ? "Please finish your details before continuing to the dashboard."
              : "Manage your personal details and security settings."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profileMessage ? <p className="text-sm text-[color:var(--ui-success)]">{profileMessage}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSaveProfile} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Profile Picture (Optional)</Label>
              <input
                ref={profileImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  handleProfileImageUpload(file);
                  event.target.value = "";
                }}
              />
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4">
                {profileForm.profileImageUrl ? (
                  <img
                    src={profileForm.profileImageUrl}
                    alt="Profile"
                    className="h-16 w-16 rounded-full border border-[color:var(--ui-border)] object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--ui-border)] text-xs text-[color:var(--ui-muted-foreground)]">
                    No Photo
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => profileImageInputRef.current?.click()}
                    disabled={profileImageUploading}
                  >
                    {profileImageUploading ? "Uploading..." : profileForm.profileImageUrl ? "Replace Photo" : "Upload Photo"}
                  </Button>

                  {profileForm.profileImageUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[color:var(--ui-destructive)] text-[color:var(--ui-destructive)] hover:bg-[color:var(--ui-destructive-soft)]"
                      onClick={() => handleProfileChange("profileImageUrl", "")}
                      disabled={profileImageUploading}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input id="first-name" type="text" value={profileForm.firstName} onChange={(event) => handleProfileChange("firstName", event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input id="last-name" type="text" value={profileForm.lastName} onChange={(event) => handleProfileChange("lastName", event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth-date">Birth Date</Label>
              <Input
                id="birth-date"
                type="date"
                value={profileForm.birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => handleProfileChange("birthDate", event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age (auto-calculated)</Label>
              <Input id="age" type="text" value={age === null ? "" : String(age)} readOnly placeholder="Will auto-fill from birth date" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input id="company-name" type="text" value={profileForm.companyName} onChange={(event) => handleProfileChange("companyName", event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={profileForm.gender || "__empty"} onValueChange={(value) => handleProfileChange("gender", value === "__empty" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty">Select gender</SelectItem>
                  {genderOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="company-description">Company Description</Label>
              <Textarea
                id="company-description"
                rows={4}
                value={profileForm.companyDescription}
                onChange={(event) => handleProfileChange("companyDescription", event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={profileForm.region || "__empty"} onValueChange={(value) => handleProfileChange("region", value === "__empty" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty">Select region</SelectItem>
                  {locationHierarchy.map((region) => (
                    <SelectItem key={region.name} value={region.name}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>District</Label>
              <Select
                value={profileForm.district || "__empty"}
                onValueChange={(value) => handleProfileChange("district", value === "__empty" ? "" : value)}
                disabled={!profileForm.region}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty">Select district</SelectItem>
                  {districts.map((district) => (
                    <SelectItem key={district.name} value={district.name}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ward</Label>
              <Select
                value={profileForm.ward || "__empty"}
                onValueChange={(value) => handleProfileChange("ward", value === "__empty" ? "" : value)}
                disabled={!profileForm.district}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty">Select ward</SelectItem>
                  {wards.map((ward) => (
                    <SelectItem key={ward} value={ward}>
                      {ward}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={profileSaving}>
                {profileSaving ? "Saving..." : setupMode ? "Complete Profile" : "Save Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password and update your email with OTP verification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {securityError ? <p className="text-sm text-[color:var(--ui-destructive)]">{securityError}</p> : null}
          {passwordMessage ? <p className="text-sm text-[color:var(--ui-success)]">{passwordMessage}</p> : null}
          {emailMessage ? <p className="text-sm text-[color:var(--ui-success)]">{emailMessage}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                required
              />
            </div>

            <div className="md:col-span-3">
              <Button type="submit" disabled={loadingPassword}>
                {loadingPassword ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Email (OTP)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleRequestOtp} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="otp-current-password">Current Password</Label>
              <Input
                id="otp-current-password"
                type="password"
                value={emailForm.currentPassword}
                onChange={(event) => setEmailForm((current) => ({ ...current, currentPassword: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-email">New Email</Label>
              <Input
                id="new-email"
                type="email"
                value={emailForm.newEmail}
                onChange={(event) => setEmailForm((current) => ({ ...current, newEmail: event.target.value }))}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={loadingOtpRequest}>
                {loadingOtpRequest ? "Sending OTP..." : "Send OTP"}
              </Button>
            </div>
          </form>

          <form onSubmit={handleVerifyOtp} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="otp-code">OTP Code</Label>
              <Input
                id="otp-code"
                type="text"
                value={emailForm.otp}
                onChange={(event) => setEmailForm((current) => ({ ...current, otp: event.target.value }))}
                required
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={loadingOtpVerify}>
                {loadingOtpVerify ? "Verifying..." : "Verify OTP & Update Email"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SMTP Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[color:var(--ui-muted-foreground)]">
            Configure Gmail SMTP in environment variables: <code>SMTP_HOST</code>, <code>SMTP_PORT</code>,
            <code>SMTP_USER</code>, <code>SMTP_PASS</code>, and optional <code>NOTIFY_EMAIL</code>.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
