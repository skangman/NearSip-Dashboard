"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicMockAccount } from "@/lib/auth-types";
import { ROLE_LABELS } from "@/lib/auth-types";

type LoginFormProps = {
  accounts: PublicMockAccount[];
};

const REMEMBERED_LOGIN_KEY = "nearsip_mock_remembered_login";

function clearRememberedLogin() {
  try {
    window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
  } catch {
    // The form remains usable when browser storage is unavailable.
  }
}

export function LoginForm({ accounts }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    try {
      const savedLogin = window.localStorage.getItem(REMEMBERED_LOGIN_KEY);
      if (!savedLogin) return;

      const credentials: unknown = JSON.parse(savedLogin);
      if (
        !credentials ||
        typeof credentials !== "object" ||
        !("username" in credentials) ||
        !("password" in credentials) ||
        typeof credentials.username !== "string" ||
        typeof credentials.password !== "string"
      ) {
        clearRememberedLogin();
        return;
      }

      setUsername(credentials.username);
      setPassword(credentials.password);
      setRemember(true);
    } catch {
      clearRememberedLogin();
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, remember }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "ไม่สามารถเข้าสู่ระบบได้");
        return;
      }

      try {
        if (remember) {
          window.localStorage.setItem(
            REMEMBERED_LOGIN_KEY,
            JSON.stringify({ username, password }),
          );
        } else {
          clearRememberedLogin();
        }
      } catch {
        // Login remains usable when browser storage is unavailable.
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบเข้าสู่ระบบได้");
    } finally {
      setPending(false);
    }
  }

  function useAccount(account: PublicMockAccount) {
    setUsername(account.username);
    setPassword(account.password);
    setError("");
  }

  function handleRememberChange(checked: boolean) {
    setRemember(checked);
    if (checked) return;
    clearRememberedLogin();
  }

  return (
    <section className="login-panel" aria-labelledby="login-form-title">
      <div className="login-panel-head">
        <span>ยินดีต้อนรับ</span>
        <h2 id="login-form-title">เข้าสู่ระบบ Dashboard</h2>
        <p>ใช้ Username และ Password ที่ได้รับจาก NearSip</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="กรอก Username"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="กรอก Password"
          required
        />

        <div className="login-options">
          <label className="login-remember" htmlFor="remember">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              checked={remember}
              onChange={(event) => handleRememberChange(event.target.checked)}
              disabled={pending}
            />
            <span>จดจำการเข้าสู่ระบบ</span>
          </label>
          <small>จำ Username และ Password บนอุปกรณ์นี้</small>
        </div>

        {error ? (
          <p className="login-error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="login-submit" type="submit" disabled={pending}>
          {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
      </form>

      {/* <div className="demo-accounts">
        <div className="demo-accounts-head">
          <span>Mock Accounts</span>
          <small>เลือกเพื่อกรอกอัตโนมัติ</small>
        </div>
        {accounts.map((account) => (
          <button
            key={account.username}
            type="button"
            className="demo-account"
            onClick={() => useAccount(account)}
          >
            <span className={`demo-role role-${account.role}`}>
              {ROLE_LABELS[account.role]}
            </span>
            <strong>{account.username}</strong>
            <code>{account.password}</code>
            <small>{account.scope}</small>
          </button>
        ))}
      </div> */}
    </section>
  );
}
