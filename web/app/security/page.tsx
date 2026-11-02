"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { api, ApiError, jsonBody } from "@/lib/api";
import { Notice } from "@/components/ui";

type SecuritySettings = { sessionIdleMinutes: number; sessionMaxHours: number };

export default function SecurityPage() {
  const [settings, setSettings] = useState<SecuritySettings>({ sessionIdleMinutes: 30, sessionMaxHours: 8 });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    api<{ settings: SecuritySettings }>("/settings")
      .then((result) => setSettings(result.settings))
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : "Could not load security settings."));
  }, []);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await api<{ settings: SecuritySettings }>("/settings", { method: "PUT", body: jsonBody(settings) });
      setSettings(result.settings);
      setMessage("Session settings updated.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not save session settings.");
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await api<{ message: string }>("/settings/password", { method: "PUT", body: jsonBody(password) });
      setMessage(result.message);
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not change password.");
    }
  }

  return (
    <AppShell title="Security settings">
      {error && <Notice bad>{error}</Notice>}{message && <Notice>{message}</Notice>}
      <form className="panel settings-form" onSubmit={changePassword}>
        <div className="form-section-title"><span className="stat-icon purple">◇</span><div><h2>Change password</h2><p>Use at least 8 characters.</p></div></div>
        <div className="form-grid"><label>Current password<input type="password" autoComplete="current-password" required value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} /></label><label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} /></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} /></label></div>
        <div className="form-actions"><button className="button">Change password</button></div>
      </form>
      <form className="panel settings-form" onSubmit={saveSettings}>
        <div className="form-section-title"><span className="stat-icon blue">◷</span><div><h2>Session security</h2><p>Control automatic sign-out timing.</p></div></div>
        <div className="form-grid"><label>Inactivity timeout (minutes)<input type="number" min="5" max="240" required value={settings.sessionIdleMinutes} onChange={(event) => setSettings({ ...settings, sessionIdleMinutes: Number(event.target.value) })} /></label><label>Maximum session (hours)<input type="number" min="1" max="72" required value={settings.sessionMaxHours} onChange={(event) => setSettings({ ...settings, sessionMaxHours: Number(event.target.value) })} /></label></div>
        <div className="form-actions"><button className="button">Save settings</button></div>
      </form>
    </AppShell>
  );
}
