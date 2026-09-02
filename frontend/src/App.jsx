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

      <div className="relative mx-auto max-w-[1400px] px-4 py-6">
        <div className="dashboard-layout">
          <aside className="sidebar-panel glass-panel">
            <div className="sidebar-logo">L</div>
            <nav className="sidebar-nav" aria-label="Sidebar navigation">
              <button type="button" className="sidebar-button active" aria-label="Home">⌂</button>
              <button type="button" className="sidebar-button" aria-label="Reports">▣</button>
              <button type="button" className="sidebar-button" aria-label="Analytics">◫</button>
              <button type="button" className="sidebar-button" aria-label="Tasks">☑</button>
              <button type="button" className="sidebar-button" aria-label="Settings">⚙</button>
            </nav>
            <button type="button" onClick={logout} className="sidebar-logout">↩</button>
          </aside>

          <main className="dashboard-content">
            <div className="content-grid">
              <div className="left-stack">
                <section className="glass-panel dashboard-card hero-card">
                  <div className="hero-header">
                    <div>
                      <p className="eyebrow">Good Evening,</p>
                      <h1>{user.name}</h1>
                    </div>
                    <span className="time-badge">07:45 PM</span>
                  </div>

                  <div className="hero-copy">
                    <p>Stay focused and make it happen.</p>
                  </div>

                  <div className="chart-area" aria-hidden="true">
                    <span className="chart-bar b1" />
                    <span className="chart-bar b2" />
                    <span className="chart-bar b3" />
                    <span className="chart-bar b4" />
                    <span className="chart-bar b5" />
                    <span className="chart-bar b6" />
                    <span className="chart-bar b7" />
                    <span className="chart-bar b8" />
                    <span className="chart-bar b9" />
                    <span className="chart-bar b10" />
                    <span className="chart-bar b11" />
                    <span className="chart-bar b12" />
                  </div>
                </section>

                <div className="stats-row">
                  <section className="glass-panel dashboard-card product-card">
                    <div className="card-topline">
                      <h3>Productivity</h3>
                      <span>Today</span>
                    </div>

                    <div className="product-body">
                      <div className="product-stats">
                        <span className="big-number">78%</span>
                        <p>Great Progress!</p>
                        <div className="mini-metrics">
                          <div>
                            <span>Tasks Completed</span>
                            <strong>14</strong>
                          </div>
                          <div>
                            <span>Total Tasks</span>
                            <strong>18</strong>
                          </div>
                        </div>
                      </div>

                      <div className="ring-wrap">
                        <div className="progress-ring">
                          <div className="ring-inner">
                            <span>78%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="glass-panel dashboard-card focus-card">
                    <div className="card-topline">
                      <h3>Focus Timer</h3>
                    </div>
                    <div className="focus-ring-wrap">
                      <div className="focus-ring">
                        <div className="focus-inner">
                          <span>25:00</span>
                          <small>Deep Work</small>
                        </div>
                      </div>
                    </div>
                    <button type="button" className="focus-button">Start</button>
                  </section>
                </div>

                <section className="glass-panel dashboard-card tasks-card">
                  <div className="card-topline">
                    <h3>Tasks</h3>
                    <button type="button" className="plus-button">+</button>
                  </div>

                  <ul className="task-list">
                    <li>
                      <div className="task-item done">
                        <span className="task-check">✓</span>
                        <span>UI/UX Research</span>
                      </div>
                      <span className="task-status done">Completed</span>
                    </li>
                    <li>
                      <div className="task-item done">
                        <span className="task-check">✓</span>
                        <span>Design Dashboard</span>
                      </div>
                      <span className="task-status done">Completed</span>
                    </li>
                    <li>
                      <div className="task-item">
                        <span className="task-check empty">○</span>
                        <span>Prototype App</span>
                      </div>
                      <span className="task-status progress">In Progress</span>
                    </li>
                    <li>
                      <div className="task-item">
                        <span className="task-check empty">○</span>
                        <span>User Testing</span>
                      </div>
                      <span className="task-status pending">Pending</span>
                    </li>
                  </ul>
                </section>

                <div className="lower-row">
                  <section className="glass-panel dashboard-card activity-card">
                    <div className="card-topline">
                      <h3>Weekly Activity</h3>
                      <span>This Week</span>
                    </div>

                    <div className="activity-graph">
                      <div className="bar b1" /><div className="bar b2" /><div className="bar b3" /><div className="bar b4" /><div className="bar b5" /><div className="bar b6" /><div className="bar b7" />
                    </div>
                    <div className="week-days">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </section>

                  <section className="glass-panel dashboard-card shortcuts-card">
                    <div className="card-topline">
                      <h3>Shortcuts</h3>
                    </div>
                    <div className="shortcut-grid">
                      <div className="shortcut-item"><span>✎</span><small>Notes</small></div>
                      <div className="shortcut-item"><span>▣</span><small>Files</small></div>
                      <div className="shortcut-item"><span>♫</span><small>Music</small></div>
                      <div className="shortcut-item"><span>◫</span><small>Calendar</small></div>
                      <div className="shortcut-item"><span>◉</span><small>Camera</small></div>
                      <div className="shortcut-item"><span>☰</span><small>Slack</small></div>
                    </div>
                  </section>
                </div>
              </div>

              <div className="right-stack">
                <section className="glass-panel dashboard-card weather-card">
                  <div className="card-topline">
                    <h3>May 24, 2025</h3>
                    <span>Saturday</span>
                  </div>

                  <div className="weather-body">
                    <div className="weather-icon">☼</div>
                    <div className="weather-temp">27°</div>
                  </div>

                  <p className="weather-label">Cloudy</p>
                  <p className="weather-range">H: 31°  L: 21°</p>
                </section>

                <section className="glass-panel dashboard-card mood-card">
                  <div className="card-topline">
                    <h3>Current Mood</h3>
                  </div>
                  <div className="mood-title">Focused</div>
                  <div className="mood-chart" aria-hidden="true">
                    <span className="mood-line" />
                  </div>
                  <div className="mood-label">Distractions</div>
                  <div className="mood-level">Low</div>
                </section>

                <section className="glass-panel dashboard-card list-card">
                  <div className="card-topline">
                    <h3>Upcoming Events</h3>
                    <button type="button" className="text-button">View All</button>
                  </div>

                  <ul className="event-list">
                    <li>
                      <div className="event-date">25</div>
                      <div className="event-meta">
                        <strong>Project Meeting</strong>
                        <span>10:00 AM - 11:00 AM</span>
                      </div>
                      <span className="dot dot-blue" />
                    </li>
                    <li>
                      <div className="event-date">26</div>
                      <div className="event-meta">
                        <strong>Design Review</strong>
                        <span>02:00 PM - 03:30 PM</span>
                      </div>
                      <span className="dot dot-orange" />
                    </li>
                    <li>
                      <div className="event-date">28</div>
                      <div className="event-meta">
                        <strong>Client Call</strong>
                        <span>11:00 AM - 12:00 PM</span>
                      </div>
                      <span className="dot dot-green" />
                    </li>
                  </ul>
                </section>

                <section className="glass-panel dashboard-card status-card">
                  <div className="card-topline">
                    <h3>System Status</h3>
                  </div>

                  <div className="system-ring-wrap">
                    <div className="system-ring">
                      <div className="system-inner">
                        <span>92%</span>
                        <small>Optimal</small>
                      </div>
                    </div>
                  </div>

                  <ul className="status-list">
                    <li><span>Storage</span><div className="status-meter"><i style={{ width: "78%" }} /></div><strong>78%</strong></li>
                    <li><span>Battery</span><div className="status-meter"><i style={{ width: "82%" }} /></div><strong>82%</strong></li>
                    <li><span>Network</span><div className="status-meter"><i style={{ width: "94%" }} /></div><strong>94%</strong></li>
                  </ul>
                </section>
              </div>
            </div>

            <section className="glass-panel dashboard-card feed-card">
              <div className="card-topline feed-head">
                <div>
                  <p className="eyebrow">Recent</p>
                  <h3>Lost & Found Feed</h3>
                </div>
                <span className="live-badge">{items.length} active</span>
              </div>

              <div className="feed-grid">
                {isLoadingItems ? (
                  <div className="feed-loading">Loading recent reports...</div>
                ) : items.length ? (
                  items.slice(0, 4).map((item) => (
                    <article key={item.id} className="feed-item" onClick={() => setSelectedItem(item)}>
                      <img src={item.imageUrl || fallbackImage} alt={item.title} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
                      <div className="feed-item-info">
                        <div className="feed-item-top">
                          <span className="feed-type">{item.type}</span>
                          <span className={`status-pill ${statusBadge[item.status] || "border-slate-400/40 bg-slate-500/10 text-slate-200"}`}>{item.status}</span>
                        </div>
                        <h4>{item.title}</h4>
                        <p>{item.category} · {item.location}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-panel">
                    <div className="empty-mark">◇</div>
                    <h3>No reports found</h3>
                    <p>Try changing your filters or report a new item.</p>
                  </div>
                )}
              </div>
            </section>

            <section id="report-form" className="glass-panel dashboard-card form-card">
              <div className="card-topline form-head">
                <div>
                  <p className="eyebrow">Submit</p>
                  <h3>Report an item</h3>
                </div>
                <div className="secure-pill">Secure Flow</div>
              </div>

              <form onSubmit={handleItemSubmit} className="report-form">
                <div className="segmented-control">
                  {[
                    { value: "lost", label: "Lost" },
                    { value: "found", label: "Found" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setItemForm((current) => ({ ...current, type: option.value }))}
                      className={itemForm.type === option.value ? "segmented-active" : ""}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="grid-2">
                  <div className="field-group">
                    <label>Title</label>
                    <input value={itemForm.title} onChange={(event) => setItemForm((current) => ({ ...current, title: event.target.value }))} className="futuristic-input" placeholder="Enter item title" />
                  </div>

                  <div className="field-group">
                    <label>Category</label>
                    <select value={itemForm.category} onChange={(event) => setItemForm((current) => ({ ...current, category: event.target.value }))} className="futuristic-select">
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field-group">
                    <label>Location</label>
                    <input value={itemForm.location} onChange={(event) => setItemForm((current) => ({ ...current, location: event.target.value }))} className="futuristic-input" placeholder="Enter location" />
                  </div>

                  <div className="field-group">
                    <label>Date</label>
                    <input type="date" value={itemForm.eventDate} onChange={(event) => setItemForm((current) => ({ ...current, eventDate: event.target.value }))} className="futuristic-input" />
                  </div>
                </div>

                <div className="field-group">
                  <label>Description</label>
                  <textarea value={itemForm.description} onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))} rows="4" className="futuristic-input min-h-[120px] resize-none" placeholder="Describe the item and where it was last seen." />
                </div>

                <div className="grid-2">
                  <div className="field-group">
                    <label>Verification question</label>
                    <input value={itemForm.verificationQuestion} onChange={(event) => setItemForm((current) => ({ ...current, verificationQuestion: event.target.value }))} className="futuristic-input" placeholder="Ask something only the owner would know" />
                  </div>
                  <div className="field-group">
                    <label>Verification answer</label>
                    <input value={itemForm.verificationAnswer} onChange={(event) => setItemForm((current) => ({ ...current, verificationAnswer: event.target.value }))} className="futuristic-input" placeholder="Private answer" />
                  </div>
                </div>

                <div className="media-row">
                  <div className="upload-panel" onDragOver={(event) => { event.preventDefault(); setIsDraggingImage(true); }} onDragLeave={() => setIsDraggingImage(false)} onDrop={(event) => { event.preventDefault(); setIsDraggingImage(false); const file = event.dataTransfer.files?.[0]; if (file) handleImageChange({ target: { files: [file] } }); }}>
                    <input id="item-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    <label htmlFor="item-upload" className="upload-label">
                      <span className="upload-icon">↑</span>
                      <span className="upload-title">Upload image</span>
                      <small>PNG / JPG / JPEG / GIF</small>
                    </label>
                  </div>

                  <div className="preview-card">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" />
                        <div className="preview-meta">
                          <span>{selectedImage?.name || "image"}</span>
                          <button type="button" onClick={() => { setSelectedImage(null); setImagePreview(""); }}>Remove</button>
                        </div>
                      </>
                    ) : (
                      <div className="empty-preview">No image selected yet.</div>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={isSubmittingItem} className="primary-button w-full justify-center">
                  {isSubmittingItem ? "Submitting report..." : "Submit report"}
                </button>
              </form>
            </section>
          </main>
        </div>
      </div>

      {showClaimModal && selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-[28px] border border-white/10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-300">Secure verification</p>
                <h3 className="mt-2 text-2xl font-bold text-white">Verify ownership</h3>
              </div>
              <button type="button" onClick={() => setShowClaimModal(false)} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-sm text-slate-300 hover:border-white/20">✕</button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              Answer the verification question provided by the person who reported this item.
            </div>

            <form onSubmit={handleClaimSubmit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="label-text">Question</label>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">{selectedItem.verificationQuestion}</div>
              </div>

              <div className="space-y-2">
                <label className="label-text">Your answer</label>
                <input value={claimAnswer} onChange={(event) => setClaimAnswer(event.target.value)} className="futuristic-input" placeholder="Type the answer here..." />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowClaimModal(false)} className="secondary-button justify-center sm:w-auto">Cancel</button>
                <button type="submit" disabled={isClaiming} className="primary-button justify-center sm:w-auto">{isClaiming ? "Verifying..." : "Verify & claim"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;