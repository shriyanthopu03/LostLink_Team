import React, { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const defaultForm = {
  type: "lost",
  title: "",
  category: "",
  description: "",
  location: "",
  eventDate: "",
  imageUrl: "",
  verificationQuestion: "",
  verificationAnswer: ""
};

const categories = ["Documents", "Wallet", "Keys", "Electronics", "Bags", "Clothing", "Accessories", "Books", "ID Card", "Other"];

const statusBadge = {
  open: "bg-emerald-100 text-emerald-700",
  match_suggested: "bg-amber-100 text-amber-700",
  claim_pending: "bg-blue-100 text-blue-700",
  verified: "bg-violet-100 text-violet-700",
  returned: "bg-slate-200 text-slate-700",
  closed: "bg-slate-200 text-slate-700"
};

function App() {
  const [authMode, setAuthMode] = useState("login");
  const [token, setToken] = useState(localStorage.getItem("lostlink-token") || "");
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("lostlink-user");
    return stored ? JSON.parse(stored) : null;
  });
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [itemForm, setItemForm] = useState(defaultForm);
  const [items, setItems] = useState([]);
  const [matches, setMatches] = useState([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ type: "", category: "", status: "" });
  const [selectedItem, setSelectedItem] = useState(null);
  const [claimAnswer, setClaimAnswer] = useState("");
  const [message, setMessage] = useState("Connect your MongoDB Atlas URI in frontend/.env and backend/.env, then start both apps.");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadItems();
  }, [search, filters]);

  useEffect(() => {
    if (selectedItem) {
      loadMatches(selectedItem.id);
    } else {
      setMatches([]);
    }
  }, [selectedItem]);

  const headers = useMemo(() => {
    const base = { "Content-Type": "application/json" };
    return token ? { ...base, Authorization: `Bearer ${token}` } : base;
  }, [token]);

  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }
    return data;
  }

  async function loadItems() {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filters.type) params.set("type", filters.type);
      if (filters.category) params.set("category", filters.category);
      if (filters.status) params.set("status", filters.status);
      const data = await request(`/items?${params.toString()}`, { method: "GET" });
      setItems(data);
      if (!selectedItem && data.length) {
        setSelectedItem(data[0]);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadMatches(itemId) {
    try {
      const data = await request(`/items/${itemId}/matches`, { method: "GET" });
      setMatches(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const path = authMode === "register" ? "/auth/register" : "/auth/login";
      const payload = authMode === "register"
        ? authForm
        : { email: authForm.email, password: authForm.password };
      const data = await request(path, { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
      setToken(data.token);
      localStorage.setItem("lostlink-token", data.token);
      localStorage.setItem("lostlink-user", JSON.stringify(data.user));
      setUser(data.user);
      setMessage(`Welcome, ${data.user.name}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleItemSubmit(event) {
    event.preventDefault();
    if (!token) {
      setMessage("Please log in before posting an item.");
      return;
    }

    setLoading(true);
    try {
      await request("/items", {
        method: "POST",
        body: JSON.stringify(itemForm),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      });
      setItemForm(defaultForm);
      setMessage("Item posted successfully.");
      await loadItems();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimSubmit(event) {
    event.preventDefault();
    if (!selectedItem) return;
    if (!token) {
      setMessage("Please log in before claiming an item.");
      return;
    }

    setLoading(true);
    try {
      const data = await request(`/claims/${selectedItem.id}`, {
        method: "POST",
        body: JSON.stringify({ answer: claimAnswer }),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      });
      setMessage(data.verified ? "Claim verified. Item can be returned." : "Claim failed verification.");
      setClaimAnswer("");
      await loadItems();
      await loadMatches(selectedItem.id);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("lostlink-token");
    localStorage.removeItem("lostlink-user");
    setToken("");
    setUser(null);
    setMessage("Logged out.");
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-glow backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">LostLink</p>
              <h1 className="mt-2 text-4xl font-black text-ink sm:text-5xl">Secure digital lost-and-found</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
                Post lost or found items, search by category or description, match similar reports, and verify claims with a hidden question before return.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white">
                    Signed in as <span className="font-semibold">{user.name}</span>
                  </div>
                  <button onClick={logout} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                    Logout
                  </button>
                </>
              ) : null}
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/70 bg-white p-5 shadow-glow">
              <div className="mb-4 flex gap-2">
                <button onClick={() => setAuthMode("login")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${authMode === "login" ? "bg-ink text-white" : "bg-slate-100 text-slate-600"}`}>Login</button>
                <button onClick={() => setAuthMode("register")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${authMode === "register" ? "bg-ink text-white" : "bg-slate-100 text-slate-600"}`}>Register</button>
              </div>
              <form className="space-y-3" onSubmit={handleAuthSubmit}>
                {authMode === "register" && (
                  <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" placeholder="Full name" value={authForm.name} onChange={(e) => setAuthForm((current) => ({ ...current, name: e.target.value }))} />
                )}
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" placeholder="Email" type="email" value={authForm.email} onChange={(e) => setAuthForm((current) => ({ ...current, email: e.target.value }))} />
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm((current) => ({ ...current, password: e.target.value }))} />
                <button disabled={loading} className="w-full rounded-2xl bg-gold px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
                  {authMode === "register" ? "Create account" : "Sign in"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-white/70 bg-white p-5 shadow-glow">
              <h2 className="text-lg font-bold text-ink">Report an item</h2>
              <form className="mt-4 space-y-3" onSubmit={handleItemSubmit}>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
                  {[
                    ["lost", "Lost"],
                    ["found", "Found"]
                  ].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setItemForm((current) => ({ ...current, type: value }))} className={`rounded-xl px-3 py-2 text-sm font-semibold ${itemForm.type === value ? "bg-ink text-white" : "text-slate-500"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" placeholder="Item title" value={itemForm.title} onChange={(e) => setItemForm((current) => ({ ...current, title: e.target.value }))} />
                <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" value={itemForm.category} onChange={(e) => setItemForm((current) => ({ ...current, category: e.target.value }))}>
                  <option value="">Category</option>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
                <textarea className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" rows="3" placeholder="Description" value={itemForm.description} onChange={(e) => setItemForm((current) => ({ ...current, description: e.target.value }))} />
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" placeholder="Location" value={itemForm.location} onChange={(e) => setItemForm((current) => ({ ...current, location: e.target.value }))} />
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" type="date" value={itemForm.eventDate} onChange={(e) => setItemForm((current) => ({ ...current, eventDate: e.target.value }))} />
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" placeholder="Optional image URL" value={itemForm.imageUrl} onChange={(e) => setItemForm((current) => ({ ...current, imageUrl: e.target.value }))} />
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" placeholder="Verification question" value={itemForm.verificationQuestion} onChange={(e) => setItemForm((current) => ({ ...current, verificationQuestion: e.target.value }))} />
                <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" placeholder="Hidden verification answer" value={itemForm.verificationAnswer} onChange={(e) => setItemForm((current) => ({ ...current, verificationAnswer: e.target.value }))} />
                <button disabled={loading} className="w-full rounded-2xl bg-ink px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                  Submit report
                </button>
              </form>
            </section>
          </aside>

          <main className="space-y-6">
            <section className="rounded-3xl border border-white/70 bg-white p-5 shadow-glow">
              <div className="grid gap-3 md:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
                <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" placeholder="Search by title, description, location, category" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" value={filters.type} onChange={(e) => setFilters((current) => ({ ...current, type: e.target.value }))}>
                  <option value="">All types</option>
                  <option value="lost">Lost</option>
                  <option value="found">Found</option>
                </select>
                <select className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" value={filters.category} onChange={(e) => setFilters((current) => ({ ...current, category: e.target.value }))}>
                  <option value="">All categories</option>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
                <select className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}>
                  <option value="">All statuses</option>
                  <option value="open">Open</option>
                  <option value="match_suggested">Match Suggested</option>
                  <option value="claim_pending">Claim Pending</option>
                  <option value="verified">Verified</option>
                  <option value="returned">Returned</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-glow">
                <h2 className="text-lg font-bold text-ink">Recent posts</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {items.map((item) => (
                    <button key={item.id} onClick={() => setSelectedItem(item)} className={`text-left rounded-3xl border p-4 transition hover:-translate-y-1 ${selectedItem?.id === item.id ? "border-gold bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{item.type}</p>
                          <h3 className="mt-1 text-lg font-bold text-ink">{item.title}</h3>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[item.status] || "bg-slate-100 text-slate-700"}`}>{item.status}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">{item.category} · {item.location}</p>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-600">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-3xl border border-white/70 bg-white p-5 shadow-glow">
                  <h2 className="text-lg font-bold text-ink">Selected item</h2>
                  {selectedItem ? (
                    <div className="mt-4 space-y-3 rounded-3xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{selectedItem.type}</p>
                          <h3 className="text-xl font-bold text-ink">{selectedItem.title}</h3>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[selectedItem.status] || "bg-slate-100 text-slate-700"}`}>{selectedItem.status}</span>
                      </div>
                      <p className="text-sm text-slate-600">{selectedItem.category} · {selectedItem.location}</p>
                      <p className="text-sm text-slate-700">{selectedItem.description}</p>
                      <p className="text-sm text-slate-500">Verification question: {selectedItem.verificationQuestion}</p>
                      <form className="mt-4 flex flex-col gap-3" onSubmit={handleClaimSubmit}>
                        <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-gold" placeholder="Answer verification question" value={claimAnswer} onChange={(e) => setClaimAnswer(e.target.value)} />
                        <button disabled={loading} className="rounded-2xl bg-coral px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60">Submit claim</button>
                      </form>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">Select a report to review details and claim workflow.</p>
                  )}
                </section>

                <section className="rounded-3xl border border-white/70 bg-white p-5 shadow-glow">
                  <h2 className="text-lg font-bold text-ink">Possible matches</h2>
                  <div className="mt-4 space-y-3">
                    {matches.map((match) => (
                      <div key={match.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-ink">{match.title}</h3>
                            <p className="text-sm text-slate-600">{match.category} · {match.location}</p>
                          </div>
                          <div className="rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">{match.score}%</div>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">Reasons: {match.reasons.join(", ") || "category/title/location/date similarity"}</p>
                      </div>
                    ))}
                    {!matches.length && <p className="text-sm text-slate-500">No matches yet.</p>}
                  </div>
                </section>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;