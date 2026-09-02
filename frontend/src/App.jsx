import React, { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://lost-link-team-backend.vercel.app/api";
const fallbackImage = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";

const defaultForm = {
  type: "lost",
  title: "",
  category: "",
  description: "",
  location: "",
  eventDate: "",
  verificationQuestion: "",
  verificationAnswer: ""
};

const categories = ["Documents", "Wallet", "Keys", "Electronics", "Bags", "Clothing", "Accessories", "Books", "ID Card", "Other"];

const statusBadge = {
  open: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  match_suggested: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  claim_pending: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200",
  verified: "border-violet-400/40 bg-violet-500/10 text-violet-200",
  returned: "border-slate-400/40 bg-slate-500/10 text-slate-200",
  closed: "border-slate-400/40 bg-slate-500/10 text-slate-200"
};

function App() {
  const [authMode, setAuthMode] = useState("login");
  const [token, setToken] = useState(() => localStorage.getItem("lostlink-token") || "");
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
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [message, setMessage] = useState("Sign in or create an account to start reporting items.");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [reportInterface, setReportInterface] = useState("classic");
  const [currentPage, setCurrentPage] = useState("dashboard");

  const isAuthenticated = Boolean(user && token);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setSelectedItem(null);
      setMatches([]);
      return;
    }

    loadItems();
  }, [isAuthenticated, search, filters, token]);

  useEffect(() => {
    if (!isAuthenticated || !selectedItem) {
      setMatches([]);
      return;
    }

    loadMatches(selectedItem.id);
  }, [selectedItem, isAuthenticated, token]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  async function loadItems() {
    if (!isAuthenticated) return;

    setIsLoadingItems(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filters.type) params.set("type", filters.type);
      if (filters.category) params.set("category", filters.category);
      if (filters.status) params.set("status", filters.status);

      const data = await request(`/items?${params.toString()}`, { method: "GET" });
      setItems(data);

      if (data.length) {
        const currentItemStillExists = selectedItem && data.some((item) => item.id === selectedItem.id);
        if (!currentItemStillExists) {
          setSelectedItem(data[0]);
        }
      } else {
        setSelectedItem(null);
      }
    } catch (error) {
      setMessage(error.message || "Unable to load recent posts.");
    } finally {
      setIsLoadingItems(false);
    }
  }

  async function loadMatches(itemId) {
    if (!itemId || !isAuthenticated) return;

    setIsLoadingMatches(true);
    try {
      const data = await request(`/items/${itemId}/matches`, { method: "GET" });
      setMatches(data);
    } catch (error) {
      setMessage(error.message || "Unable to load matches.");
    } finally {
      setIsLoadingMatches(false);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setIsAuthenticating(true);
    try {
      const path = authMode === "register" ? "/auth/register" : "/auth/login";
      const payload = authMode === "register" ? authForm : { email: authForm.email, password: authForm.password };

      const data = await request(path, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      });

      localStorage.setItem("lostlink-token", data.token);
      localStorage.setItem("lostlink-user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setAuthForm({ name: "", email: "", password: "" });
      setAuthMode("login");
      setMessage(`Welcome, ${data.user.name}`);
    } catch (error) {
      setMessage(error.message || "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleItemSubmit(event) {
    event.preventDefault();
    if (!token) {
      setMessage("Please log in before posting an item.");
      return;
    }

    setIsSubmittingItem(true);
    try {
      const formData = new FormData();
      Object.entries(itemForm).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      const response = await fetch(`${API_URL}/items`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Unable to submit item");
      }

      setItemForm(defaultForm);
      setSelectedImage(null);
      setImagePreview("");
      setMessage("Report submitted successfully.");
      await loadItems();
      setCurrentPage("dashboard");
    } catch (error) {
      setMessage(error.message || "Unable to submit item");
    } finally {
      setIsSubmittingItem(false);
    }
  }

  async function handleClaimSubmit(event) {
    event.preventDefault();
    if (!selectedItem) return;
    if (!token) {
      setMessage("Please log in before claiming an item.");
      return;
    }

    setIsClaiming(true);
    try {
      const data = await request(`/claims/${selectedItem.id}`, {
        method: "POST",
        body: JSON.stringify({ answer: claimAnswer }),
        headers: { "Content-Type": "application/json" }
      });

      setMessage(data.verified ? "Claim verified. Item can be returned." : "Claim failed verification.");
      setClaimAnswer("");
      setShowClaimModal(false);
      await loadItems();
      await loadMatches(selectedItem.id);
    } catch (error) {
      setMessage(error.message || "Unable to submit claim");
    } finally {
      setIsClaiming(false);
    }
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedImage(null);
      setImagePreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Please choose a valid image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("Image size must be 10MB or less.");
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setImagePreview(nextPreview);
    setMessage("Image attached and ready to upload.");
  }

  function logout() {
    localStorage.removeItem("lostlink-token");
    localStorage.removeItem("lostlink-user");
    setToken("");
    setUser(null);
    setAuthForm({ name: "", email: "", password: "" });
    setAuthMode("login");
    setSelectedItem(null);
    setMatches([]);
    setMessage("Logged out successfully. Please sign in again.");
  }

  function formatDate(value) {
    if (!value) return "Unknown date";
    return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  if (!isAuthenticated) {
    return (
      <div className="dashboard-shell min-h-screen px-4 py-8 text-slate-100">
        <div className="grid-pattern" />
        <div className="relative mx-auto max-w-md pt-10">
          <header className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-[0_0_40px_rgba(99,102,241,0.18)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-cyan-300">LostLink</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white">Secure digital lost & found</h1>
            <p className="mt-3 text-sm text-slate-300">Access the live recovery network, verify claims, and report newly found items.</p>
          </header>

          <section className="glass-panel mt-6 rounded-[28px] border border-white/10 p-5">
            <div className="mb-5 flex rounded-2xl border border-white/10 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${authMode === "login" ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.28)]" : "text-slate-300 hover:text-white"}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${authMode === "register" ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.28)]" : "text-slate-300 hover:text-white"}`}
              >
                Register
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleAuthSubmit}>
              {authMode === "register" && (
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                  className="futuristic-input"
                  placeholder="Full name"
                />
              )}
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                className="futuristic-input"
                placeholder="Email"
              />
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                className="futuristic-input"
                placeholder="Password"
              />
              <button type="submit" disabled={isAuthenticating} className="primary-button w-full justify-center">
                {isAuthenticating ? "Please wait..." : authMode === "register" ? "Create account" : "Login"}
              </button>
            </form>
          </section>

          <p className="mt-4 text-center text-sm text-slate-400">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell min-h-screen text-slate-100">
      <div className="grid-pattern" />

      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <header className="glass-panel sticky top-4 z-20 mb-6 rounded-[28px] border border-white/10 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                <span className="text-sm font-black tracking-[0.2em] text-white">L</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-cyan-300">LostLink</p>
                <p className="mt-1 text-sm text-slate-400">Find it. Return it.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <nav className="flex items-center gap-1 rounded-2xl border border-white/10 bg-slate-950/60 p-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage("dashboard")}
                  className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                    currentPage === "dashboard"
                      ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage("report")}
                  className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                    currentPage === "report"
                      ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Report an Item
                </button>
              </nav>

              <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-200">
                Signed in as <span className="font-semibold text-white">{user.name}</span>
              </div>
              <button type="button" onClick={logout} className="nav-button">Logout</button>
            </div>
          </div>
        </header>

        <main className="space-y-6">
          {currentPage === "dashboard" ? (
            <>
              <section className="glass-panel relative overflow-hidden rounded-[28px] border border-white/10 p-5 sm:p-6">
            <div className="absolute -top-16 right-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-10 h-28 w-28 rounded-full bg-cyan-500/20 blur-3xl" />

            <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-200">
                  <span className="h-2 w-2 rounded-full bg-cyan-300" />
                  Live network
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Welcome back, <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">{user.name}</span>
                </h1>
                <p className="mt-4 max-w-xl text-base text-slate-300">
                  Reconnect lost belongings with their owners and keep each recovery flow moving in real time.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentPage("report")}
                    className="primary-button"
                  >
                    Report an item
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage("dashboard");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="secondary-button"
                  >
                    Browse reports
                  </button>
                </div>
              </div>

              <div className="glass-panel rounded-[24px] border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-slate-400">
                  <span>System status</span>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[9px] text-emerald-300">Online</span>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Open reports</p>
                    <p className="mt-2 text-3xl font-black text-white">{items.length}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Matches</p>
                      <p className="mt-2 text-xl font-bold text-cyan-300">{matches.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Claims</p>
                      <p className="mt-2 text-xl font-bold text-purple-300">{items.filter((item) => item.status === "claim_pending").length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-[26px] border border-white/10 p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300">◉</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="futuristic-input pl-10"
                  placeholder="Search lost items, locations, descriptions..."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:w-[46rem]">
                <select
                  value={filters.type}
                  onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
                  className="futuristic-select"
                >
                  <option value="">All types</option>
                  <option value="lost">Lost</option>
                  <option value="found">Found</option>
                </select>

                <select
                  value={filters.category}
                  onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                  className="futuristic-select"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <select
                  value={filters.status}
                  onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                  className="futuristic-select"
                >
                  <option value="">All statuses</option>
                  <option value="open">Open</option>
                  <option value="match_suggested">Match Suggested</option>
                  <option value="claim_pending">Claim Pending</option>
                  <option value="verified">Verified</option>
                  <option value="returned">Returned</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <section className="glass-panel rounded-[28px] border border-white/10 p-4 sm:p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">Feed</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Recent posts</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                  {items.length} items
                </span>
              </div>

              {isLoadingItems ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map((index) => (
                    <div key={index} className="animate-pulse rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="h-44 rounded-2xl bg-slate-700/80" />
                      <div className="mt-4 h-3 w-20 rounded-full bg-slate-700/80" />
                      <div className="mt-3 h-5 w-3/4 rounded-full bg-slate-700/80" />
                      <div className="mt-3 h-3 w-full rounded-full bg-slate-700/80" />
                      <div className="mt-2 h-3 w-2/3 rounded-full bg-slate-700/80" />
                    </div>
                  ))}
                </div>
              ) : items.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className={`group cursor-pointer overflow-hidden rounded-3xl border p-3 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.18)] ${selectedItem?.id === item.id ? "border-cyan-400/40 bg-cyan-500/5" : "border-white/10 bg-white/[0.02]"}`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="overflow-hidden rounded-2xl">
                        <img
                          src={item.imageUrl || fallbackImage}
                          alt={item.title}
                          className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(event) => {
                            event.currentTarget.src = fallbackImage;
                          }}
                        />
                      </div>

                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">{item.type}</p>
                          <h3 className="mt-2 text-xl font-bold text-white">{item.title}</h3>
                        </div>
                        <span className={`status-pill ${statusBadge[item.status] || "border-slate-400/40 bg-slate-500/10 text-slate-200"}`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-slate-300">
                        <p>{item.category} · {item.location}</p>
                        <p>{formatDate(item.eventDate || item.createdAt)}</p>
                      </div>

                      <p className="mt-3 line-clamp-3 text-sm text-slate-400">{item.description}</p>

                      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                        <span className="text-xs text-slate-500">By {item.owner?.name || "Unknown"}</span>
                        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 transition hover:bg-cyan-500/20">
                          View
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-panel">
                  <div className="empty-mark">◇</div>
                  <h3>No reports found</h3>
                  <p>Try changing your filters or report a new item.</p>
                </div>
              )}
            </section>

            <div className="space-y-6">
              <section className="glass-panel rounded-[28px] border border-white/10 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">Details</p>
                    <h2 className="mt-2 text-2xl font-bold text-white">Selected item</h2>
                  </div>
                </div>

                {selectedItem ? (
                  <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="overflow-hidden rounded-2xl">
                      <img
                        src={selectedItem.imageUrl || fallbackImage}
                        alt={selectedItem.title}
                        className="h-56 w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = fallbackImage;
                        }}
                      />
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">{selectedItem.type}</p>
                        <h3 className="mt-2 text-2xl font-bold text-white">{selectedItem.title}</h3>
                      </div>
                      <span className={`status-pill ${statusBadge[selectedItem.status] || "border-slate-400/40 bg-slate-500/10 text-slate-200"}`}>
                        {selectedItem.status}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                      <p><span className="text-white">Category:</span> {selectedItem.category}</p>
                      <p><span className="text-white">Location:</span> {selectedItem.location}</p>
                      <p><span className="text-white">Date:</span> {formatDate(selectedItem.eventDate || selectedItem.createdAt)}</p>
                      <p><span className="text-white">Owner:</span> {selectedItem.owner?.name || "Unknown"}</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
                      {selectedItem.description}
                    </div>

                    <div className="rounded-2xl border border-dashed border-cyan-400/30 bg-cyan-500/5 p-3 text-sm text-slate-300">
                      <span className="text-white">Verification question:</span> {selectedItem.verificationQuestion}
                    </div>

                    <button type="button" onClick={() => setShowClaimModal(true)} className="primary-button w-full justify-center">
                      Verify claim
                    </button>
                  </div>
                ) : (
                  <div className="empty-panel mt-4">
                    <div className="empty-mark">◇</div>
                    <h3>Select a report</h3>
                    <p>Choose an item to view its details and claim information.</p>
                  </div>
                )}
              </section>

              <section className="glass-panel rounded-[28px] border border-white/10 p-4 sm:p-5">
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">AI matching</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Possible matches</h2>
                </div>

                {isLoadingMatches ? (
                  <div className="space-y-3">
                    {[1, 2].map((index) => (
                      <div key={index} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="h-4 w-1/3 rounded-full bg-slate-700/80" />
                        <div className="mt-3 h-4 w-2/3 rounded-full bg-slate-700/80" />
                        <div className="mt-3 h-3 w-full rounded-full bg-slate-700/80" />
                      </div>
                    ))}
                  </div>
                ) : matches.length ? (
                  <div className="space-y-3">
                    {matches.map((match) => (
                      <div key={match.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-bold text-white">{match.title}</h3>
                            <p className="mt-1 text-sm text-slate-300">{match.category} · {match.location}</p>
                          </div>
                          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                            {match.score || 0}%
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-400">{match.reasons?.join(", ") || "Similar title, category, and location"}</p>
                        <button type="button" onClick={() => setSelectedItem(match)} className="mt-3 inline-flex rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-white/20">
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-panel mt-4">
                    <div className="empty-mark">◇</div>
                    <h3>No matches yet</h3>
                    <p>Similar reports will appear here when detected.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      ) : (
            <div className="space-y-6">
              <section className="glass-panel relative overflow-hidden rounded-[28px] border border-white/10 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <button
                      type="button"
                      onClick={() => setCurrentPage("dashboard")}
                      className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 hover:underline"
                    >
                      ← Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Report an Item</h1>
                    <p className="mt-2 text-sm text-slate-300">Submit details and photo to list a lost or found item on the network.</p>
                  </div>
                </div>
              </section>

              <section id="report-form" className="glass-panel rounded-[30px] border border-white/10 p-4 sm:p-5 lg:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">Submit</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Report an item</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/50 p-1">
                {[{ value: "classic", label: "Dashboard" }, { value: "focused", label: "Focused" }].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setReportInterface(option.value)}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${reportInterface === option.value ? "bg-purple-500/20 text-purple-200" : "text-slate-500 hover:text-slate-200"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {reportInterface === "focused" ? (
              <form onSubmit={handleItemSubmit} className="report-focus-form">
                <div className="report-type-switch">
                  {[{ value: "lost", label: "Lost" }, { value: "found", label: "Found" }].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setItemForm((current) => ({ ...current, type: option.value }))}
                      className={itemForm.type === option.value ? "active" : ""}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="report-focus-grid">
                  <label><span>Title</span><input value={itemForm.title} onChange={(event) => setItemForm((current) => ({ ...current, title: event.target.value }))} placeholder="Enter item title" /></label>
                  <label><span>Category</span><select value={itemForm.category} onChange={(event) => setItemForm((current) => ({ ...current, category: event.target.value }))}><option value="">Select category</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                  <label><span>Location</span><input value={itemForm.location} onChange={(event) => setItemForm((current) => ({ ...current, location: event.target.value }))} placeholder="Enter location" /></label>
                  <label><span>Date</span><input type="date" value={itemForm.eventDate} onChange={(event) => setItemForm((current) => ({ ...current, eventDate: event.target.value }))} /></label>
                </div>

                <label className="report-focus-wide"><span>Description</span><textarea value={itemForm.description} onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))} rows="4" placeholder="Describe the item, identifying details, and where it was last seen." /></label>

                <div className="report-focus-grid">
                  <label><span>Verification question</span><input value={itemForm.verificationQuestion} onChange={(event) => setItemForm((current) => ({ ...current, verificationQuestion: event.target.value }))} placeholder="Ask something only the owner would know" /></label>
                  <label><span>Verification answer</span><input value={itemForm.verificationAnswer} onChange={(event) => setItemForm((current) => ({ ...current, verificationAnswer: event.target.value }))} placeholder="Private answer" /></label>
                </div>

                <div className="report-focus-actions">
                  <label className="report-focus-upload" htmlFor="focused-item-upload">
                    <input id="focused-item-upload" type="file" accept="image/*" onChange={handleImageChange} />
                    <span>+ Add photo</span>
                    <small>{selectedImage?.name || "Optional - max 10 MB"}</small>
                  </label>
                  <button type="submit" disabled={isSubmittingItem} className="primary-button">
                    {isSubmittingItem ? "Submitting report..." : "Submit report"}
                  </button>
                </div>
              </form>
            ) : (
            <form onSubmit={handleItemSubmit} className="space-y-5">
              <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:grid-cols-2">
                {[
                  { value: "lost", label: "Lost" },
                  { value: "found", label: "Found" }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setItemForm((current) => ({ ...current, type: option.value }))}
                    className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${itemForm.type === option.value ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]" : "text-slate-300 hover:text-white"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="label-text">Title</label>
                  <input value={itemForm.title} onChange={(event) => setItemForm((current) => ({ ...current, title: event.target.value }))} className="futuristic-input" placeholder="Enter item title" />
                </div>

                <div className="space-y-2">
                  <label className="label-text">Category</label>
                  <select value={itemForm.category} onChange={(event) => setItemForm((current) => ({ ...current, category: event.target.value }))} className="futuristic-select">
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="label-text">Location</label>
                  <input value={itemForm.location} onChange={(event) => setItemForm((current) => ({ ...current, location: event.target.value }))} className="futuristic-input" placeholder="Enter location" />
                </div>

                <div className="space-y-2">
                  <label className="label-text">Date</label>
                  <input type="date" value={itemForm.eventDate} onChange={(event) => setItemForm((current) => ({ ...current, eventDate: event.target.value }))} className="futuristic-input" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-text">Description</label>
                <textarea value={itemForm.description} onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))} rows="4" className="futuristic-input min-h-[120px] resize-none" placeholder="Describe the item, identifying details, and where it was last seen." />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="label-text">Verification question</label>
                  <input value={itemForm.verificationQuestion} onChange={(event) => setItemForm((current) => ({ ...current, verificationQuestion: event.target.value }))} className="futuristic-input" placeholder="Ask something only the owner would know" />
                </div>

                <div className="space-y-2">
                  <label className="label-text">Verification answer</label>
                  <input value={itemForm.verificationAnswer} onChange={(event) => setItemForm((current) => ({ ...current, verificationAnswer: event.target.value }))} className="futuristic-input" placeholder="Private answer" />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div
                  className={`upload-panel ${isDraggingImage ? "upload-panel-active" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingImage(true);
                  }}
                  onDragLeave={() => setIsDraggingImage(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDraggingImage(false);
                    const file = event.dataTransfer.files?.[0];
                    if (file) {
                      const eventLike = { target: { files: [file] } };
                      handleImageChange(eventLike);
                    }
                  }}
                >
                  <input id="item-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  <label htmlFor="item-upload" className="flex cursor-pointer flex-col items-center justify-center text-center">
                    <span className="text-3xl text-cyan-300">↑</span>
                    <span className="mt-4 text-lg font-bold text-white">Upload image</span>
                    <span className="mt-2 max-w-xs text-sm text-slate-400">Drag & drop or browse</span>
                    <span className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">PNG / JPG / JPEG / GIF</span>
                    <span className="mt-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-300">Max 10 MB</span>
                  </label>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                  {imagePreview ? (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-2xl border border-white/10">
                        <img src={imagePreview} alt="Preview" className="h-52 w-full object-cover" />
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
                        <div>
                          <p className="font-medium text-white">{selectedImage?.name || "image"}</p>
                          <p className="text-xs text-slate-400">
                            {selectedImage ? `${Math.round((selectedImage.size / (1024 * 1024)) * 10) / 10} MB` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview("");
                          }}
                          className="rounded-xl border border-white/10 bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300 hover:border-red-400/40 hover:text-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-center text-sm text-slate-500">
                      No image selected yet.
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={isSubmittingItem} className="primary-button w-full justify-center">
                {isSubmittingItem ? "Submitting report..." : "Submit report"}
              </button>
            </form>
            )}
          </section>
        </div>
      )}
        </main>
      </div>

      {showClaimModal && selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-[28px] border border-white/10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-300">Secure verification</p>
                <h3 className="mt-2 text-2xl font-bold text-white">Verify ownership</h3>
              </div>
              <button type="button" onClick={() => setShowClaimModal(false)} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-sm text-slate-300 hover:border-white/20">
                ✕
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              Answer the verification question provided by the person who reported this item.
            </div>

            <form onSubmit={handleClaimSubmit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="label-text">Question</label>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
                  {selectedItem.verificationQuestion}
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-text">Your answer</label>
                <input
                  value={claimAnswer}
                  onChange={(event) => setClaimAnswer(event.target.value)}
                  className="futuristic-input"
                  placeholder="Type the answer here..."
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowClaimModal(false)} className="secondary-button justify-center sm:w-auto">
                  Cancel
                </button>
                <button type="submit" disabled={isClaiming} className="primary-button justify-center sm:w-auto">
                  {isClaiming ? "Verifying..." : "Verify & claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;