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
  open: "bg-emerald-100 text-emerald-700",
  match_suggested: "bg-amber-100 text-amber-700",
  claim_pending: "bg-blue-100 text-blue-700",
  verified: "bg-violet-100 text-violet-700",
  returned: "bg-slate-200 text-slate-700",
  closed: "bg-slate-200 text-slate-700"
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
  const [message, setMessage] = useState("Sign in or create an account to start reporting items.");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md">
          <header className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-glow backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-600">LostLink</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Secure digital lost & found</h1>
            <p className="mt-2 text-sm text-slate-600">Sign in to view reports, match items, and post updates.</p>
          </header>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="mb-5 flex gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${authMode === "login" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${authMode === "register" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-amber-500"
                  placeholder="Full name"
                />
              )}
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-amber-500"
                placeholder="Email"
              />
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-amber-500"
                placeholder="Password"
              />
              <button type="submit" disabled={isAuthenticating} className="w-full btn-primary">
                {isAuthenticating ? "Please wait..." : authMode === "register" ? "Create account" : "Login"}
              </button>
            </form>
          </section>

          <p className="mt-4 text-center text-sm text-slate-600">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-glow backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-600">LostLink</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Lost & Found dashboard</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-sm">
                Signed in as <span className="font-semibold">{user.name}</span>
              </div>
              <button type="button" onClick={logout} className="btn-outline">Logout</button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {message}
          </div>
        </header>

        <main className="mt-8 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
            <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="search-input"
                placeholder="Search by title, description, location, item..."
              />
              <select
                value={filters.type}
                onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-amber-500"
              >
                <option value="">All types</option>
                <option value="lost">Lost</option>
                <option value="found">Found</option>
              </select>
              <select
                value={filters.category}
                onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-amber-500"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-amber-500"
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
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">Recent posts</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                  {items.length} items
                </span>
              </div>

              {isLoadingItems ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map((index) => (
                    <div key={index} className="animate-pulse rounded-3xl border border-slate-200 bg-slate-100 p-4">
                      <div className="h-36 rounded-2xl bg-slate-200" />
                      <div className="mt-4 h-4 w-20 rounded bg-slate-200" />
                      <div className="mt-3 h-6 w-3/4 rounded bg-slate-200" />
                      <div className="mt-3 h-4 w-full rounded bg-slate-200" />
                      <div className="mt-2 h-4 w-2/3 rounded bg-slate-200" />
                    </div>
                  ))}
                </div>
              ) : items.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`cursor-pointer rounded-3xl border p-3 transition duration-200 hover:-translate-y-1 hover:shadow-soft ${selectedItem?.id === item.id ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}
                    >
                      <div className="overflow-hidden rounded-2xl">
                        <img
                          src={item.imageUrl || fallbackImage}
                          alt={item.title}
                          className="h-40 w-full object-cover transition duration-200 hover:scale-[1.02]"
                          onError={(event) => {
                            event.currentTarget.src = fallbackImage;
                          }}
                        />
                      </div>

                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">{item.type}</p>
                          <h3 className="mt-2 text-lg font-bold text-slate-900">{item.title}</h3>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusBadge[item.status] || "bg-slate-200 text-slate-700"}`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <p>{item.category} · {item.location}</p>
                        <p>{formatDate(item.eventDate || item.createdAt)}</p>
                      </div>

                      <p className="mt-3 line-clamp-3 text-sm text-slate-600">{item.description}</p>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                        <span className="text-xs text-slate-500">Posted by {item.owner?.name || "Unknown"}</span>
                        <button type="button" className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700">View details</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <p className="text-lg font-semibold text-slate-700">No posts match your filters</p>
                  <p className="mt-2 text-sm text-slate-500">Try a different search or report a new item.</p>
                </div>
              )}
            </section>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
                <h2 className="text-xl font-bold text-slate-900">Selected item</h2>

                {selectedItem ? (
                  <div className="mt-4 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
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

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">{selectedItem.type}</p>
                        <h3 className="mt-2 text-2xl font-bold text-slate-900">{selectedItem.title}</h3>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusBadge[selectedItem.status] || "bg-slate-200 text-slate-700"}`}>
                        {selectedItem.status}
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p><span className="font-semibold text-slate-900">Category:</span> {selectedItem.category}</p>
                      <p><span className="font-semibold text-slate-900">Location:</span> {selectedItem.location}</p>
                      <p><span className="font-semibold text-slate-900">Date:</span> {formatDate(selectedItem.eventDate || selectedItem.createdAt)}</p>
                      <p><span className="font-semibold text-slate-900">Posted by:</span> {selectedItem.owner?.name || "Unknown"}</p>
                    </div>

                    <div className="rounded-2xl bg-white p-3 text-sm text-slate-700">
                      {selectedItem.description}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">Verification question:</span> {selectedItem.verificationQuestion}
                    </div>

                    <form onSubmit={handleClaimSubmit} className="space-y-3">
                      <input
                        value={claimAnswer}
                        onChange={(event) => setClaimAnswer(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-amber-500"
                        placeholder="Answer the verification question"
                      />
                      <button type="submit" disabled={isClaiming} className="w-full btn-accent">{isClaiming ? "Checking claim..." : "Submit claim"}</button>
                    </form>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                    Select a report to view its full details and verification workflow.
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
                <h2 className="text-xl font-bold text-slate-900">Possible matches</h2>

                {isLoadingMatches ? (
                  <div className="mt-4 space-y-3">
                    {[1, 2].map((index) => (
                      <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-slate-100 p-4">
                        <div className="h-4 w-1/3 rounded bg-slate-200" />
                        <div className="mt-2 h-4 w-2/3 rounded bg-slate-200" />
                        <div className="mt-3 h-4 w-full rounded bg-slate-200" />
                      </div>
                    ))}
                  </div>
                ) : matches.length ? (
                  <div className="mt-4 space-y-3">
                    {matches.map((match) => (
                      <div key={match.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{match.title}</h3>
                            <p className="mt-1 text-sm text-slate-600">{match.category} · {match.location}</p>
                          </div>
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                            {match.score}%
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">{match.reasons?.join(", ") || "Similar title, category, and location"}</p>
                        <button type="button" onClick={() => setSelectedItem(match)} className="mt-3 inline-flex rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                    No possible matches yet. Try posting a more descriptive item.
                  </div>
                )}
              </section>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Report an item</h2>
                <p className="mt-1 text-sm text-slate-500">Submit a lost or found report with an image upload.</p>
              </div>
            </div>

            <form onSubmit={handleItemSubmit} className="mt-5 space-y-4">
              <div className="grid gap-2 rounded-2xl bg-slate-100 p-2 sm:grid-cols-2">
                {["lost", "found"].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setItemForm((current) => ({ ...current, type: value }))}
                    className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${itemForm.type === value ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {value === "lost" ? "Lost" : "Found"}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={itemForm.title}
                  onChange={(event) => setItemForm((current) => ({ ...current, title: event.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-amber-500"
                  placeholder="Item title"
                />
                <select
                  value={itemForm.category}
                  onChange={(event) => setItemForm((current) => ({ ...current, category: event.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-amber-500"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={itemForm.location}
                  onChange={(event) => setItemForm((current) => ({ ...current, location: event.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-amber-500"
                  placeholder="Location"
                />
                <input
                  type="date"
                  value={itemForm.eventDate}
                  onChange={(event) => setItemForm((current) => ({ ...current, eventDate: event.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-amber-500"
                />
              </div>

              <textarea
                value={itemForm.description}
                onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-amber-500"
                rows="4"
                placeholder="Tell us what happened, what it looks like, and any identifying details."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={itemForm.verificationQuestion}
                  onChange={(event) => setItemForm((current) => ({ ...current, verificationQuestion: event.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-amber-500"
                  placeholder="Verification question"
                />
                <input
                  value={itemForm.verificationAnswer}
                  onChange={(event) => setItemForm((current) => ({ ...current, verificationAnswer: event.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-amber-500"
                  placeholder="Hidden verification answer"
                />
              </div>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-600 transition hover:border-amber-400 hover:text-slate-900">
                  <span className="font-semibold text-slate-800">Upload item image</span>
                  <span className="mt-1 text-xs text-slate-500">PNG, JPG, WEBP, or GIF up to 10MB</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>

                {imagePreview ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <img src={imagePreview} alt="Preview" className="h-48 w-full object-cover" />
                  </div>
                ) : null}
              </div>

              <button type="submit" disabled={isSubmittingItem} className="w-full btn-dark">{isSubmittingItem ? "Uploading report..." : "Submit report"}</button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;