"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api, ApiError, jsonBody } from "@/lib/api";

export default function LoginPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api("/auth/login", { method: "POST", body: jsonBody({ username, password }) });
      await refresh();
      router.replace("/");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <a className="brand login-brand" href="/"><span className="brand-mark">₹</span><span>Loan <strong>Sathi</strong></span></a>
        <div><span className="eyebrow">A CLEARER VIEW OF YOUR FINANCES</span><h1>Your loans,<br />clearly organised.</h1><p>Manage accounts, EMIs, principal, interest and repayment progress in one secure workspace.</p></div>
        <div className="login-points"><span>✓ Secure loan records</span><span>✓ EMI and interest tracking</span><span>✓ Repayment insights at a glance</span></div>
      </section>
      <section className="login-card">
        <span className="login-symbol">◆</span><h2>Welcome back</h2><p>Sign in securely to access your dashboard.</p>
        {error && <div className="notice notice-bad">{error}</div>}
        <form onSubmit={submit} className="form-stack">
          <label>Username<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required autoFocus /></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <button className="button button-wide" disabled={submitting}>{submitting ? "Signing in…" : "Login to dashboard"}</button>
        </form>
        <small className="login-footnote">Administrator access is provisioned securely by your system administrator.</small>
      </section>
    </main>
  );
}
