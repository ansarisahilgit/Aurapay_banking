import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Wallet,
  Users,
  LogOut,
  Landmark,
  Plus,
  RefreshCw,
  ShieldCheck,
  ReceiptText,
} from "lucide-react";
import api from "./api";

function money(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);
}
function App() {
  const [token, setToken] = useState(localStorage.getItem("bank_token"));
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("overview");
  const [transactions, setTransactions] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState(true);
  const [passwordVisibility, setPasswordVisibility] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "alice@demo.local",
    password: "DemoPass123!",
  });
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    accountNumber: "",
    nickname: "",
  });
  const [transfer, setTransfer] = useState({
    accountNumber: "",
    amount: "",
    note: "",
  });
  const [otpData, setOtpData] = useState(null);
  const [passwordOtpData, setPasswordOtpData] = useState(null);
  const navigate = useNavigate();

  async function refresh() {
    const [me, tx, ben] = await Promise.all([
      api.get("/auth/me"),
      api.get("/transactions"),
      api.get("/beneficiaries"),
    ]);
    setUser(me.data.user);
    setTransactions(tx.data.transactions);
    setBeneficiaries(ben.data.beneficiaries);
  }
  useEffect(() => {
    if (token) refresh().catch(() => logout());
  }, [token]);
  function logout() {
    localStorage.removeItem("bank_token");
    setToken(null);
    setUser(null);
    setOtpData(null);
  }
  async function authenticate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(
        login ? "/auth/login" : "/auth/register",
        authForm,
      );
      localStorage.setItem("bank_token", data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (e) {
      setError(e.response?.data?.message || "Could not authenticate");
    } finally {
      setBusy(false);
    }
  }
  async function addBeneficiary(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      await api.post("/beneficiaries", beneficiaryForm);
      setBeneficiaryForm({ accountNumber: "", nickname: "" });
      await refresh();
      setNotice("Beneficiary added successfully.");
    } catch (e) {
      setError(e.response?.data?.message || "Could not add beneficiary");
    }
  }
  async function removeBeneficiary(id) {
    try {
      await api.delete(`/beneficiaries/${id}`);
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Could not remove beneficiary");
    }
  }
  async function requestOtp(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post("/transfers/request-otp", transfer);
      setOtpData(data);
      setNotice(data.demoOtp ? `Demo OTP: ${data.demoOtp}` : data.message);
    } catch (e) {
      setError(e.response?.data?.message || "Could not initiate transfer");
    } finally {
      setBusy(false);
    }
  }
  async function confirmTransfer(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/transfers/confirm", {
        otpRequestId: otpData.otpRequestId,
        otp: e.currentTarget.otp.value,
      });
      setNotice(`Transfer successful · ${data.transaction.reference}`);
      setOtpData(null);
      setTransfer({ accountNumber: "", amount: "", note: "" });
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Transfer failed");
    } finally {
      setBusy(false);
    }
  }
  async function requestPasswordOtp(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data } = await api.post("/auth/password/request-otp", {
        currentPassword: e.currentTarget.currentPassword.value,
      });

      setPasswordOtpData(data);

      setNotice(data.demoOtp ? `Demo OTP: ${data.demoOtp}` : data.message);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Could not generate password change OTP",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmPasswordChange(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const form = e.currentTarget;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      setBusy(false);
      return;
    }

    try {
      const { data } = await api.post("/auth/password/confirm", {
        otpRequestId: passwordOtpData.otpRequestId,
        otp: form.otp.value,
        newPassword,
      });

      setPasswordOtpData(null);
      window.alert(data.message);
      logout();
    } catch (error) {
      setError(error.response?.data?.message || "Could not change password");
    } finally {
      setBusy(false);
    }
  }
  if (!token)
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand">
            <span className="brand-icon">
              <Landmark />
            </span>
            <span>
              AURAPAY <small> DIGITAL BANK</small>
            </span>
          </div>
          <div className="eyebrow">SECURE BANKING SIMULATOR</div>
          <h1>{login ? "Welcome back." : "Create your account."}</h1>
          <p className="muted">
            A simple, secure space to manage your virtual money.
          </p>
          {error && <div className="alert error">{error}</div>}
          <form onSubmit={authenticate} className="stack">
            {!login && (
              <label>
                Full name
                <input
                  required
                  minLength="2"
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, name: e.target.value })
                  }
                />
              </label>
            )}
            <label>
              Email address
              <input
                required
                type="email"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
              />
            </label>
            <label>
              Password
              <div className="password-wrapper">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={authForm.password}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, password: e.target.value })
                  }
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Please wait…" : login ? "Sign in" : "Create account"}
            </button>
          </form>
          <p className="switch">
            {login ? "New here?" : "Already registered?"}{" "}
            <button
              onClick={() => {
                setLogin(!login);
                setError("");
              }}
            >
              {login ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="demo-hint"></p>
        </section>
      </main>
    );
  if (!user) return <main className="loading">Loading your account…</main>;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">
            <Landmark />
          </span>
          <span>
            AURAPAY <small> DIGITAL BANK</small>
          </span>
        </div>
        <div className="nav-label">MY SPACE</div>
        {[
          ["overview", "Overview", Wallet],
          ["beneficiaries", "Beneficiaries", Users],
          ["transfer", "Transfer money", ArrowLeftRight],
          ["activity", "Transactions", ReceiptText],
          ["password", "Change Password", ShieldCheck],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            className={`nav-item ${tab === id ? "active" : ""}`}
            onClick={() => {
              setTab(id);
              setError("");
              setNotice("");
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">{user.name?.[0]}</div>
            <div>
              <b>{user.name}</b>
              <small>{user.email}</small>
            </div>
          </div>
          <button className="nav-item" onClick={logout}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">PERSONAL BANKING</div>
            <h2>
              {tab === "overview"
                ? "Overview"
                : tab === "beneficiaries"
                  ? "Beneficiaries"
                  : tab === "transfer"
                    ? "Transfer money"
                    : tab === "activity"
                      ? "Transactions"
                      : "Change Password"}
            </h2>
          </div>
          <div className="top-actions">
            <span className="secure">
              <ShieldCheck size={15} /> Secure session
            </span>
            <button
              className="icon-button"
              onClick={() => refresh()}
              title="Refresh"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </header>
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}
        {tab === "overview" && (
          <>
            <section className="welcome">
              <div>
                <div className="eyebrow light">YOUR FINANCIAL SNAPSHOT</div>
                <h1>Good day, {user.name.split(" ")[0]}.</h1>
                <p>Your money, clearly in view.</p>
              </div>
              <div className="balance-box">
                <span>AVAILABLE BALANCE</span>

                <strong>{money(user.balance)}</strong>

                <small>ACCOUNT NUMBER</small>

                <div className="account-number">
                  <b>{user.accountNumber}</b>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(user.accountNumber);
                      setNotice("Account number copied successfully!");
                    }}
                    title="Copy account number"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </section>
            <section className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon">
                  <Wallet />
                </span>
                <small>Available balance</small>
                <strong>{money(user.balance)}</strong>
                <span className="muted">Virtual account funds</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">
                  <ArrowUpRight />
                </span>
                <small>Transfers sent</small>
                <strong>
                  {transactions.filter((t) => t.direction === "DEBIT").length}
                </strong>
                <span className="muted">Recorded transactions</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">
                  <Users />
                </span>
                <small>Beneficiaries</small>
                <strong>{beneficiaries.length}</strong>
                <span className="muted">Saved recipients</span>
              </div>
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Recent activity</h3>
                  <p className="muted">Your latest account movements</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setTab("activity")}
                >
                  View all
                </button>
              </div>
              <TransactionList rows={transactions.slice(0, 5)} />
            </section>
          </>
        )}
        {tab === "beneficiaries" && (
          <div className="content-grid">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Add beneficiary</h3>
                  <p className="muted">Add another registered account.</p>
                </div>
              </div>
              <form className="stack" onSubmit={addBeneficiary}>
                <label>
                  12-digit account number
                  <input
                    required
                    maxLength="12"
                    value={beneficiaryForm.accountNumber}
                    onChange={(e) =>
                      setBeneficiaryForm({
                        ...beneficiaryForm,
                        accountNumber: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    placeholder="e.g. 100000000002"
                  />
                </label>
                <label>
                  Nickname (optional)
                  <input
                    maxLength="40"
                    value={beneficiaryForm.nickname}
                    onChange={(e) =>
                      setBeneficiaryForm({
                        ...beneficiaryForm,
                        nickname: e.target.value,
                      })
                    }
                    placeholder="e.g. Family"
                  />
                </label>
                <button className="primary">
                  <Plus size={16} /> Add beneficiary
                </button>
              </form>
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Saved beneficiaries</h3>
                  <p className="muted">
                    Only your saved recipients appear here.
                  </p>
                </div>
              </div>
              {beneficiaries.length === 0 ? (
                <div className="empty">No beneficiaries added yet.</div>
              ) : (
                beneficiaries.map((b) => (
                  <div className="beneficiary-row" key={b.id}>
                    <div className="avatar">{b.user.name[0]}</div>
                    <div className="grow">
                      <b>{b.nickname || b.user.name}</b>
                      <small>
                        {b.user.accountNumber} · {b.user.email}
                      </small>
                    </div>
                    <button
                      className="remove"
                      onClick={() => removeBeneficiary(b.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </section>
          </div>
        )}
        {tab === "transfer" && (
          <section className="panel transfer-panel">
            <div className="panel-head">
              <div>
                <h3>Send money</h3>
                <p className="muted">
                  Transfer virtual funds to one of your saved beneficiaries.
                </p>
              </div>
              <span className="secure">
                <ShieldCheck size={15} /> OTP protected
              </span>
            </div>
            {!otpData ? (
              <form className="stack" onSubmit={requestOtp}>
                <label>
                  Recipient account
                  <select
                    required
                    value={transfer.accountNumber}
                    onChange={(e) =>
                      setTransfer({
                        ...transfer,
                        accountNumber: e.target.value,
                      })
                    }
                  >
                    <option value="">Choose a beneficiary</option>
                    {beneficiaries.map((b) => (
                      <option key={b.id} value={b.user.accountNumber}>
                        {b.nickname || b.user.name} · {b.user.accountNumber}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Amount (INR)
                  <input
                    required
                    type="number"
                    min="0.01"
                    max="100000"
                    step="0.01"
                    value={transfer.amount}
                    onChange={(e) =>
                      setTransfer({ ...transfer, amount: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </label>
                <label>
                  Note (optional)
                  <input
                    maxLength="120"
                    value={transfer.note}
                    onChange={(e) =>
                      setTransfer({ ...transfer, note: e.target.value })
                    }
                    placeholder="What's this for?"
                  />
                </label>
                <div className="transfer-note">
                  Available balance: <b>{money(user.balance)}</b>
                  <span> · Demo transfer limit ₹1,00,000</span>
                </div>
                <button
                  className="primary"
                  disabled={busy || !beneficiaries.length}
                >
                  {busy ? "Preparing…" : "Review and request OTP"}
                </button>
                {!beneficiaries.length && (
                  <p className="muted">
                    Add a beneficiary before making a transfer.
                  </p>
                )}
              </form>
            ) : (
              <form className="stack" onSubmit={confirmTransfer}>
                <div className="review-card">
                  <span>TRANSFER REVIEW</span>
                  <strong>{money(Number(transfer.amount))}</strong>
                  <p>To account {transfer.accountNumber}</p>
                  <small>{transfer.note || "No note added"}</small>
                </div>
                <label>
                  Enter 6-digit OTP
                  <input
                    name="otp"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength="6"
                    placeholder="000000"
                  />
                </label>
                <button className="primary" disabled={busy}>
                  {busy ? "Confirming…" : "Confirm transfer"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setOtpData(null)}
                >
                  Cancel
                </button>
              </form>
            )}
          </section>
        )}
        {tab === "activity" && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Transaction history</h3>
                <p className="muted">
                  Latest 100 incoming and outgoing transfers.
                </p>
              </div>
            </div>
            <TransactionList rows={transactions} />
          </section>
        )}
        {tab === "password" && (
          <section className="panel transfer-panel">
            <div className="panel-head">
              <div>
                <h3>Change Password</h3>
                <p className="muted">
                  Verify your identity before updating your password.
                </p>
              </div>

              <ShieldCheck size={22} />
            </div>

            {!passwordOtpData ? (
              <form className="stack" onSubmit={requestPasswordOtp}>
                <label>
                  Current Password
                  <div className="password-wrapper">
                    <input
                      name="currentPassword"
                      type={passwordVisibility.current ? "text" : "password"}
                      required
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setPasswordVisibility((v) => ({
                          ...v,
                          current: !v.current,
                        }))
                      }
                    >
                      {passwordVisibility.current ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                <div className="transfer-note">
                  An OTP will be generated after your current password is
                  verified.
                </div>

                <button className="primary" disabled={busy}>
                  {busy ? "Please wait..." : "Verify and Request OTP"}
                </button>
              </form>
            ) : (
              <form className="stack" onSubmit={confirmPasswordChange}>
                <div className="review-card">
                  <span>OTP VERIFICATION</span>
                  <p>Enter the six-digit OTP generated for your account.</p>
                </div>

                <label>
                  Enter OTP
                  <input
                    name="otp"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength="6"
                    placeholder="Enter 6-digit OTP"
                  />
                </label>

                <label>
                  New Password
                  <div className="password-wrapper">
                    <input
                      name="newPassword"
                      type={passwordVisibility.new ? "text" : "password"}
                      required
                      minLength="8"
                      maxLength="72"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setPasswordVisibility((v) => ({
                          ...v,
                          new: !v.new,
                        }))
                      }
                    >
                      {passwordVisibility.new ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
                <label>
                  Confirm New Password
                  <div className="password-wrapper">
                    <input
                      name="confirmPassword"
                      type={passwordVisibility.confirm ? "text" : "password"}
                      required
                      minLength="8"
                      maxLength="72"
                      placeholder="Confirm your new password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setPasswordVisibility((v) => ({
                          ...v,
                          confirm: !v.confirm,
                        }))
                      }
                    >
                      {passwordVisibility.confirm ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                <button className="primary" disabled={busy}>
                  {busy ? "Updating..." : "Confirm OTP and Change Password"}
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => setPasswordOtpData(null)}
                >
                  Cancel
                </button>
              </form>
            )}
          </section>
        )}
        <footer>AURAPAY DIGITAL BANKING</footer>
      </main>
    </div>
  );
}
function TransactionList({ rows }) {
  if (!rows.length)
    return (
      <div className="empty">
        No transactions yet. Your activity will appear here.
      </div>
    );
  return (
    <div className="transaction-list">
      {rows.map((t) => (
        <div className="transaction-row" key={t.reference}>
          <span
            className={`tx-icon ${t.direction === "DEBIT" ? "debit" : "credit"}`}
          >
            {t.direction === "DEBIT" ? (
              <ArrowUpRight size={18} />
            ) : (
              <ArrowDownLeft size={18} />
            )}
          </span>
          <div className="grow">
            <b>
              {t.direction === "DEBIT" ? "Transfer to " : "Transfer from "}
              {t.counterparty?.name}
            </b>
            <small>
              {new Date(t.createdAt).toLocaleString("en-IN")} · {t.reference}
            </small>
            {t.note && <small>{t.note}</small>}
          </div>
          <div
            className={`amount ${t.direction === "DEBIT" ? "negative" : "positive"}`}
          >
            {t.direction === "DEBIT" ? "-" : "+"}
            {money(t.amount)}
            <small>{t.status}</small>
          </div>
        </div>
      ))}
    </div>
  );
}
export default App;
