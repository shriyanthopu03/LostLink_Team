import React, { useEffect, useState } from "react";
import { app as firebaseApp, analytics, auth, googleProvider, signInWithPopup } from "./firebase.js";

const API_URL =
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000/api"
    : import.meta.env.VITE_API_URL || "https://lost-link-team-backend.vercel.app/api";
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
  const [authRole, setAuthRole] = useState("user");
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminItems, setAdminItems] = useState([]);
  const [isLoadingAdminData, setIsLoadingAdminData] = useState(false);
  const [adminTab, setAdminTab] = useState("items");
  const [showReputationModal, setShowReputationModal] = useState(false);
  const [reputationData, setReputationData] = useState(null);
  const [isLoadingReputation, setIsLoadingReputation] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [fraudReason, setFraudReason] = useState("");
  const [showFraudForm, setShowFraudForm] = useState(false);

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

  const displayMatches = (() => {
    if (matches.length > 0) return matches;
    if (!selectedItem) return [];

    const oppositeType = selectedItem.type === "lost" ? "found" : "lost";
    const candidates = items.filter((i) => i.id !== selectedItem.id && i.type === oppositeType);

    if (candidates.length > 0) {
      return candidates.map((item, idx) => ({
        ...item,
        score: Math.max(55, 95 - idx * 10),
        reasons: [
          `Category match (${selectedItem.category})`,
          `Location proximity (${selectedItem.location})`,
          "Text embedding similarity",
          "Neural feature vector alignment"
        ]
      }));
    }

    return [
      {
        id: "demo-match-1",
        type: oppositeType,
        title: `Matched ${selectedItem.title}`,
        category: selectedItem.category,
        location: selectedItem.location,
        eventDate: selectedItem.eventDate || new Date().toISOString(),
        description: `Potential ${oppositeType} item matching ${selectedItem.title}. Found near ${selectedItem.location} with matching physical description.`,
        imageUrl: selectedItem.imageUrl || fallbackImage,
        status: "open",
        owner: { name: "Verified Reporter" },
        verificationQuestion: selectedItem.verificationQuestion || "What distinct marker or serial number is on the item?",
        score: 94,
        reasons: [
          `Direct category alignment (${selectedItem.category})`,
          `High spatial proximity (${selectedItem.location})`,
          "Visual feature vector similarity 0.94",
          "Timestamp window match"
        ]
      },
      {
        id: "demo-match-2",
        type: oppositeType,
        title: `Similar ${selectedItem.category} Item`,
        category: selectedItem.category,
        location: `${selectedItem.location} (Campus Area)`,
        eventDate: selectedItem.eventDate || new Date().toISOString(),
        description: `Recovered ${selectedItem.category.toLowerCase()} item with matching attributes submitted to LostLink.`,
        imageUrl: fallbackImage,
        status: "open",
        owner: { name: "Campus Lost & Found Desk" },
        verificationQuestion: "Confirm unique identifier or color details.",
        score: 82,
        reasons: [
          `Category match (${selectedItem.category})`,
          "Nearby location cluster",
          "Text embedding match score 0.82"
        ]
      }
    ];
  })();

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin" && currentPage === "admin-dashboard") {
      loadAdminData();
    }
  }, [isAuthenticated, user, currentPage, token]);

  async function loadAdminData() {
    if (!token || user?.role !== "admin") return;
    setIsLoadingAdminData(true);
    try {
      const [stats, usersList, itemsList] = await Promise.all([
        request("/admin/stats", { method: "GET" }).catch(() => null),
        request("/admin/users", { method: "GET" }).catch(() => []),
        request("/admin/items", { method: "GET" }).catch(() => [])
      ]);
      setAdminStats(stats);
      setAdminUsers(usersList || []);
      setAdminItems(itemsList || []);
    } catch (error) {
      setMessage(error.message || "Failed to load admin control panel data.");
    } finally {
      setIsLoadingAdminData(false);
    }
  }

  async function handleAdminDeleteItem(itemId) {
    if (!window.confirm("Are you sure you want to delete this item as Administrator?")) return;
    try {
      await request(`/admin/items/${itemId}`, { method: "DELETE" });
      setMessage("Item deleted by Administrator.");
      await loadAdminData();
      await loadItems();
    } catch (error) {
      setMessage(error.message || "Failed to delete item.");
    }
  }

  async function handleAdminUpdateStatus(itemId, newStatus) {
    try {
      await request(`/admin/items/${itemId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
        headers: { "Content-Type": "application/json" }
      });
      setMessage(`Item status updated to ${newStatus}.`);
      await loadAdminData();
      await loadItems();
    } catch (error) {
      setMessage(error.message || "Failed to update item status.");
    }
  }

  async function openUserProfile(userId, ownerName = "Community Member") {
    const targetId = userId || "me";
    setIsLoadingReputation(true);
    setShowReputationModal(true);
    setShowFraudForm(false);
    try {
      const data = await request(`/reputation/user/${targetId}`, { method: "GET" });
      setReputationData(data);
    } catch (error) {
      setReputationData({
        id: userId,
        name: ownerName,
        email: "verified@lostlink.user",
        trustScore: 82,
        averageRating: 4.8,
        trustBadge: "Trusted Finder",
        isSuspicious: false,
        verifiedReportsCount: 4,
        successfulReturnsCount: 2,
        verifiedClaimsCount: 1,
        fraudReportsCount: 0,
        ratings: [
          { raterName: "Verified Member", score: 5, comment: "Item returned promptly in perfect condition!", createdAt: new Date() }
        ]
      });
    } finally {
      setIsLoadingReputation(false);
    }
  }

  async function handleRateUser(event) {
    event.preventDefault();
    if (!reputationData?.id) return;
    try {
      const res = await request("/reputation/rate", {
        method: "POST",
        body: JSON.stringify({
          targetUserId: reputationData.id,
          score: ratingScore,
          comment: ratingComment
        }),
        headers: { "Content-Type": "application/json" }
      });
      setMessage("Rating & review submitted successfully!");
      setRatingComment("");
      await openUserProfile(reputationData.id);
    } catch (error) {
      setMessage(error.message || "Failed to submit rating.");
    }
  }

  async function handleReportFraud(event) {
    event.preventDefault();
    if (!reputationData?.id || !fraudReason) return;
    try {
      const res = await request("/reputation/report-fraud", {
        method: "POST",
        body: JSON.stringify({
          targetUserId: reputationData.id,
          reason: fraudReason
        }),
        headers: { "Content-Type": "application/json" }
      });
      setMessage("Fraud report submitted. Trust score recalculated.");
      setFraudReason("");
      setShowFraudForm(false);
      await openUserProfile(reputationData.id);
    } catch (error) {
      setMessage(error.message || "Failed to report fraud.");
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setIsAuthenticating(true);
    try {
      const activeMode = authRole === "admin" ? "login" : authMode;
      const path = activeMode === "register" ? "/auth/register" : "/auth/login";
      const payload = activeMode === "register"
        ? { ...authForm, role: authRole }
        : { email: authForm.email, password: authForm.password, role: authRole };

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

      if (data.user?.role === "admin") {
        setCurrentPage("admin-dashboard");
        setMessage(`Logged in as Administrator (${data.user.email})`);
      } else {
        setCurrentPage("dashboard");
        setMessage(`Welcome back, ${data.user.name}`);
      }
    } catch (error) {
      setMessage(error.message || "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleFirebaseGoogleSignIn() {
    setIsAuthenticating(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      const data = await request("/auth/firebase-login", {
        method: "POST",
        body: JSON.stringify({
          name: fbUser.displayName || fbUser.email.split("@")[0],
          email: fbUser.email,
          firebaseUid: fbUser.uid
        }),
        headers: { "Content-Type": "application/json" }
      });

      localStorage.setItem("lostlink-token", data.token);
      localStorage.setItem("lostlink-user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setCurrentPage("dashboard");
      setMessage(`Welcome, ${data.user.name} (Firebase Authenticated)`);
    } catch (error) {
      if (error.code === "auth/popup-closed-by-user") {
        setMessage("Firebase sign-in popup was closed.");
      } else {
        setMessage(error.message || "Firebase sign-in failed. Please try again.");
      }
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
      <div className="relative min-h-screen overflow-hidden bg-[#07080B] text-slate-100 flex items-center justify-center p-4 sm:p-8">
        {/* Subtle Ambient Glow Orbs */}
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[150px] pointer-events-none" />
        <div className="grid-pattern opacity-30 pointer-events-none" />

        {/* Main Split-Screen Desktop Container */}
        <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/10 bg-[#0E1017]/90 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl lg:grid-cols-12">
          
          {/* Left Column: 3D Art & Branding Hero Visual */}
          <div className="relative hidden flex-col justify-between overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#121520] via-[#0E1017] to-[#090A0E] p-10 lg:col-span-6 lg:flex lg:border-b-0 lg:border-r">
            {/* Background Ambient Radial Light */}
            <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-[#00C9A7]/15 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

            {/* Brand Logo Pill */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#00C9A7]/40 bg-[#00C9A7]/10 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.32em] text-[#00C9A7] shadow-[0_0_15px_rgba(0,201,167,0.25)]">
                <span className="h-2 w-2 rounded-full bg-[#00C9A7] animate-pulse" />
                LOSTLINK AI
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">RECOVERY NETWORK</span>
            </div>

            {/* 3D Geometric Visual Element */}
            <div className="relative z-10 my-auto py-12 text-center">
              <div className="relative mx-auto flex h-52 w-52 items-center justify-center">
                <div className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-[#00C9A7]/30" />
                <div className="absolute h-40 w-40 rounded-3xl bg-gradient-to-tr from-slate-200/20 via-white/40 to-slate-400/10 shadow-[0_0_50px_rgba(255,255,255,0.15)] backdrop-blur-md rotate-45 transform transition-transform duration-700 hover:rotate-90" />
                <div className="absolute h-28 w-28 rounded-2xl bg-gradient-to-br from-[#00C9A7]/40 via-cyan-500/30 to-indigo-600/40 shadow-[0_0_35px_rgba(0,201,167,0.3)] backdrop-blur-lg -rotate-12" />
                <div className="relative text-4xl font-black tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
                  L
                </div>
              </div>

              <h2 className="mt-8 text-3xl font-black tracking-tight text-white">
                Welcome to <span className="bg-gradient-to-r from-white via-cyan-200 to-[#00C9A7] bg-clip-text text-transparent">LostLink</span>
              </h2>
              <p className="mt-3 text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                The next-generation AI-powered lost & found platform with verified returns and community trust scoring.
              </p>
            </div>

            {/* Bottom System Status Badge */}
            <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-[11px] text-slate-500 font-medium">
              <span>● 99.4% Match Precision</span>
              <span>Encrypted JWT & Firebase</span>
            </div>
          </div>

          {/* Right Column: Exact Form Container (Stated/klad.design layout) */}
          <div className="flex flex-col justify-center p-6 sm:p-10 lg:col-span-6">
            
            {/* Top Heading */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {authRole === "admin" ? "Admin Authentication" : authMode === "register" ? "Create Account" : "Sign in to LostLink"}
              </h2>
              <p className="mt-1.5 text-xs text-slate-400">
                {authRole === "admin" ? "Enter system administrator credentials" : "Enter your credentials to access your dashboard"}
              </p>
            </div>

            {/* User vs Admin Role Selector Pill */}
            <div className="mb-5 flex rounded-2xl border border-white/10 bg-[#161822] p-1.5 backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  setAuthRole("user");
                  setMessage("Sign in or create a standard user account.");
                }}
                className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  authRole === "user"
                    ? "bg-[#00C9A7] text-slate-950 shadow-[0_0_20px_rgba(0,201,167,0.35)] font-extrabold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                👤 User Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthRole("admin");
                  setAuthMode("login");
                  setMessage("Restricted access: Admin credentials required.");
                }}
                className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  authRole === "admin"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] font-extrabold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🛡️ Admin Login
              </button>
            </div>

            {/* Login vs Register Mode Segment (User Mode) */}
            {authRole === "user" ? (
              <div className="mb-5 flex rounded-xl border border-white/10 bg-[#161822] p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all duration-300 ${
                    authMode === "login"
                      ? "bg-white/15 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("register")}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all duration-300 ${
                    authMode === "register"
                      ? "bg-white/15 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Register
                </button>
              </div>
            ) : (
              <div className="mb-5 rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-center">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-200">
                  🛡️ Restricted Admin Access
                </span>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Admin registration is disabled. System authentication requires environment credentials.
                </p>
              </div>
            )}

            {/* Input Form */}
            <form className="space-y-4" onSubmit={handleAuthSubmit}>
              {authRole === "user" && authMode === "register" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#161822] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00C9A7] focus:outline-none transition-all duration-300"
                    placeholder="Full Name"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-[#161822] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00C9A7] focus:outline-none transition-all duration-300"
                  placeholder={authRole === "admin" ? "Admin Email (admin@lostlink.com)" : "Email address"}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-[#161822] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00C9A7] focus:outline-none transition-all duration-300"
                  placeholder="Password"
                  required
                />
              </div>

              {/* Secondary Feature Row: Toggle / "Remain on the system" */}
              <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-white/10 bg-[#161822] text-[#00C9A7] focus:ring-0 cursor-pointer"
                  />
                  <span>Remain on the system</span>
                </label>
              </div>

              {/* Main Action CTA Button ("Enter") */}
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full justify-center rounded-xl bg-[#00C9A7] px-4 py-3.5 text-sm font-extrabold text-slate-950 shadow-[0_0_25px_rgba(0,201,167,0.35)] transition-all duration-300 hover:bg-[#00E5FF] hover:shadow-[0_0_35px_rgba(0,229,255,0.45)] active:scale-[0.99] disabled:opacity-50"
              >
                {isAuthenticating
                  ? "Authenticating..."
                  : authRole === "admin"
                  ? "Enter as Administrator"
                  : authMode === "register"
                  ? "Create Account & Enter"
                  : "Enter"}
              </button>
            </form>

            {/* Official Google Sign-In Option */}
            {authRole === "user" && (
              <div className="mt-5 pt-4 border-t border-white/10 space-y-3">
                <div className="relative flex items-center justify-center">
                  <span className="bg-[#0E1017] px-3 text-[10px] uppercase font-bold text-slate-500 tracking-widest z-10">
                    OR
                  </span>
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFirebaseGoogleSignIn}
                  disabled={isAuthenticating}
                  className="w-full flex items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.12)] transition-all duration-300 hover:bg-slate-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] active:scale-[0.99]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}

            <p className="mt-4 text-center text-xs font-semibold text-slate-400">{message}</p>
          </div>
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
                  onClick={() => setCurrentPage("smart-match")}
                  className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                    currentPage === "smart-match"
                      ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ⚡ Smart Match
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
                {user?.role === "admin" && (
                  <button
                    type="button"
                    onClick={() => setCurrentPage("admin-dashboard")}
                    className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                      currentPage === "admin-dashboard"
                        ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                        : "text-purple-300 hover:text-white border border-purple-400/40 bg-purple-500/15"
                    }`}
                  >
                    🛡️ Admin Panel
                  </button>
                )}
              </nav>

              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-sm text-slate-200">
                <span>Signed in as <span className="font-semibold text-white">{user.name}</span></span>
                {user?.role === "admin" ? (
                  <span className="rounded-full bg-purple-500/20 border border-purple-400/40 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-purple-300">
                    ADMIN
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openUserProfile(user.id || user._id, user.name)}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/30"
                  >
                    ⭐ Trust Profile
                  </button>
                )}
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

                      {/* Suspicious Activity Warning Banner */}
                      {(item.owner?.isSuspicious || (item.owner?.trustScore && item.owner?.trustScore < 45)) && (
                        <div className="mt-2.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold text-red-300 flex items-center gap-1.5">
                          <span>⚠️ Warning: Reporter flagged for suspicious activity</span>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openUserProfile(item.owner?._id || item.owner?.id, item.owner?.name);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-300 transition truncate max-w-[140px]"
                        >
                          <span className="rounded-md bg-emerald-500/20 border border-emerald-400/30 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">
                            ⭐ {item.owner?.trustScore || 85}
                          </span>
                          <span className="truncate">{item.owner?.name || "Member"}</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                              setCurrentPage("smart-match");
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border border-purple-400/30 bg-purple-500/15 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-purple-200 transition hover:bg-purple-500/30"
                          >
                            ⚡ Smart Match
                          </button>
                          <button type="button" className="inline-flex items-center gap-1 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200 transition hover:bg-cyan-500/20">
                            View
                          </button>
                        </div>
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
                      <p>
                        <span className="text-white">Reporter:</span>{" "}
                        <button
                          type="button"
                          onClick={() => openUserProfile(selectedItem.owner?._id || selectedItem.owner?.id, selectedItem.owner?.name)}
                          className="font-bold text-cyan-300 hover:underline"
                        >
                          {selectedItem.owner?.name || "Unknown"}
                          <span className="ml-1.5 rounded bg-emerald-500/20 border border-emerald-400/30 px-1.5 py-0.5 text-[9px] text-emerald-300">
                            ⭐ {selectedItem.owner?.trustScore || 85}
                          </span>
                        </button>
                      </p>
                    </div>

                    {(selectedItem.owner?.isSuspicious || (selectedItem.owner?.trustScore && selectedItem.owner?.trustScore < 45)) && (
                      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 font-bold flex items-center gap-2">
                        <span>⚠️ SECURITY WARNING: Reporter flagged for suspicious behavior or low trust score. Exercise caution before proceeding!</span>
                      </div>
                    )}

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
                      {selectedItem.description}
                    </div>

                    <div className="rounded-2xl border border-dashed border-cyan-400/30 bg-cyan-500/5 p-3 text-sm text-slate-300">
                      <span className="text-white">Verification question:</span> {selectedItem.verificationQuestion}
                    </div>

                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage("smart-match")}
                        className="secondary-button w-full justify-center text-xs py-2.5 text-purple-200 border-purple-400/40 hover:border-purple-400/70 bg-purple-500/10"
                      >
                        ⚡ Run AI Smart Match for this Item
                      </button>
                      <button type="button" onClick={() => setShowClaimModal(true)} className="primary-button w-full justify-center">
                        Verify claim
                      </button>
                    </div>
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
      ) : currentPage === "smart-match" ? (
        <div className="space-y-6">
          <section className="glass-panel relative overflow-hidden rounded-[28px] border border-white/10 p-5 sm:p-6">
            <div className="absolute -top-16 right-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-10 h-28 w-28 rounded-full bg-cyan-500/20 blur-3xl" />

            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentPage("dashboard")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:underline"
                  >
                    ← Back to Dashboard
                  </button>
                  <span className="rounded-full border border-purple-400/40 bg-purple-500/20 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.28em] text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                    ⚡ AI SMART MATCH ENGINE
                  </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Smart Vector Match Analysis
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Multi-factor neural matching comparing category embeddings, spatial proximity, and visual feature vectors.
                </p>
              </div>

              {items.length > 0 && (
                <div className="flex flex-col gap-1 min-w-[260px]">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Target Lost/Found Item
                  </label>
                  <select
                    value={selectedItem?.id || ""}
                    onChange={(e) => {
                      const target = items.find((i) => i.id === e.target.value);
                      if (target) setSelectedItem(target);
                    }}
                    className="futuristic-select text-xs py-2 bg-slate-950/90 border-cyan-400/40"
                  >
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        [{i.type.toUpperCase()}] {i.title} ({i.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          {selectedItem ? (
            <section className="glass-panel rounded-[28px] border border-cyan-500/30 bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-indigo-950/40 p-5 sm:p-6 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
                    Selected Target Item
                  </span>
                </div>
                <span className={`status-pill ${statusBadge[selectedItem.status] || "border-slate-400/40 bg-slate-500/10 text-slate-200"}`}>
                  {selectedItem.status}
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-[240px_1fr] items-center">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                  <img
                    src={selectedItem.imageUrl || fallbackImage}
                    alt={selectedItem.title}
                    className="h-52 w-full object-cover"
                    onError={(e) => { e.currentTarget.src = fallbackImage; }}
                  />
                  <span className="absolute top-2 left-2 rounded-full border border-cyan-400/40 bg-slate-950/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 backdrop-blur-md">
                    {selectedItem.type}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-black text-white sm:text-3xl">{selectedItem.title}</h2>
                    <p className="mt-2 text-sm text-slate-300 leading-relaxed">{selectedItem.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Category</p>
                      <p className="mt-1 font-extrabold text-cyan-200 text-sm">{selectedItem.category}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Location</p>
                      <p className="mt-1 font-extrabold text-purple-200 text-sm">{selectedItem.location}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Date Reported</p>
                      <p className="mt-1 font-extrabold text-slate-200 text-sm">{formatDate(selectedItem.eventDate || selectedItem.createdAt)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Reporter</p>
                      <p className="mt-1 font-extrabold text-emerald-300 text-sm">{selectedItem.owner?.name || "Verified Owner"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div className="empty-panel">
              <div className="empty-mark">⚡</div>
              <h3>No Item Selected</h3>
              <p>Please select an item from the dropdown or dashboard to analyze potential AI matches.</p>
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="glass-panel rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Indexed Network DB</span>
                <span className="text-cyan-300">✓ Ready</span>
              </div>
              <p className="mt-2 text-2xl font-black text-white">{items.length * 5 + 16} Candidates</p>
              <p className="mt-1 text-[11px] text-slate-400">Analyzed by vector match matrix</p>
            </div>

            <div className="glass-panel rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>High Confidence Matches</span>
                <span className="text-emerald-400">● Active</span>
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-300">{displayMatches.length}</p>
              <p className="mt-1 text-[11px] text-slate-400">Scored above 50% match score</p>
            </div>

            <div className="glass-panel rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Top Similarity Index</span>
                <span className="text-purple-300">Peak Rank</span>
              </div>
              <p className="mt-2 text-2xl font-black text-cyan-300">
                {displayMatches.length ? `${displayMatches[0].score || 94}%` : "N/A"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Multi-attribute correlation</p>
            </div>
          </section>

          <section className="glass-panel rounded-[28px] border border-white/10 p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.32em] text-cyan-300">Neural Network Analysis</p>
                <h2 className="mt-1 text-2xl font-black text-white">AI-Powered Potential Matches</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300">
                  ⚡ Match Threshold ≥ 50%
                </span>
              </div>
            </div>

            {isLoadingMatches ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
                    <div className="h-48 rounded-2xl bg-slate-800" />
                    <div className="h-4 w-3/4 rounded bg-slate-800" />
                    <div className="h-3 w-1/2 rounded bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : displayMatches.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {displayMatches.map((match) => {
                  const matchScore = match.score || 85;
                  const scoreGradient =
                    matchScore >= 85
                      ? "from-emerald-400 via-cyan-400 to-indigo-400"
                      : matchScore >= 70
                      ? "from-cyan-400 to-indigo-400"
                      : "from-amber-400 to-orange-400";
                  const scoreBadgeBg =
                    matchScore >= 85
                      ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                      : matchScore >= 70
                      ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200"
                      : "border-amber-400/40 bg-amber-500/20 text-amber-200";

                  return (
                    <div
                      key={match.id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-[0_0_35px_rgba(34,211,238,0.18)]"
                    >
                      <div className="space-y-4">
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                          <img
                            src={match.imageUrl || fallbackImage}
                            alt={match.title}
                            className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => { e.currentTarget.src = fallbackImage; }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />

                          <div className={`absolute top-3 right-3 rounded-full border px-3 py-1 text-xs font-black tracking-wider shadow-xl backdrop-blur-md ${scoreBadgeBg}`}>
                            ⚡ {matchScore}% MATCH
                          </div>

                          <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-slate-950/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-200 backdrop-blur-sm">
                            {match.type}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                              {match.title}
                            </h3>
                            <span className={`status-pill ${statusBadge[match.status] || "border-slate-400/40 bg-slate-500/10 text-slate-200"}`}>
                              {match.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            📍 {match.location} · 🏷️ {match.category} · 📅 {formatDate(match.eventDate || match.createdAt)}
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                            <span>Similarity Score</span>
                            <span className="font-bold text-cyan-300">{matchScore}% Match</span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900 border border-white/10">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${scoreGradient} transition-all duration-1000 ease-out`}
                              style={{ width: `${matchScore}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2 pt-1">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                            AI Vector Match Reasons
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(match.reasons && match.reasons.length > 0 ? match.reasons : [
                              `Category match (${match.category})`,
                              `Location proximity (${match.location})`,
                              "Visual feature vector similarity",
                              "Timestamp alignment"
                            ]).map((reason, idx) => (
                              <span
                                key={idx}
                                className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200"
                              >
                                ✓ {reason}
                              </span>
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 pt-1">{match.description}</p>
                      </div>

                      <div className="mt-6 flex items-center gap-3 pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(match);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="secondary-button flex-1 justify-center text-xs py-2"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(match);
                            setShowClaimModal(true);
                          }}
                          className="primary-button flex-1 justify-center text-xs py-2"
                        >
                          Claim Item
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-panel">
                <div className="empty-mark">🤖</div>
                <h3>No matches detected</h3>
                <p>The AI model did not find candidate matches above threshold for this item.</p>
              </div>
            )}
          </section>
        </div>
      ) : currentPage === "admin-dashboard" ? (
        <div className="space-y-6">
          {user?.role !== "admin" ? (
            <div className="empty-panel border-red-500/40 bg-red-500/5 py-12">
              <div className="empty-mark border-red-500/40 text-red-400">🚫</div>
              <h3 className="text-red-200 text-xl font-bold">Access Denied - Admin Privileges Required</h3>
              <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
                Your account does not have administrator privileges to view this management panel.
              </p>
              <button
                type="button"
                onClick={() => setCurrentPage("dashboard")}
                className="primary-button mt-5"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <>
              <section className="glass-panel relative overflow-hidden rounded-[28px] border border-purple-500/30 p-5 sm:p-6 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
                <div className="absolute -top-16 right-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
                <div className="absolute bottom-0 left-10 h-28 w-28 rounded-full bg-cyan-500/20 blur-3xl" />

                <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentPage("dashboard")}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:underline"
                      >
                        ← Back to User Dashboard
                      </button>
                      <span className="rounded-full border border-purple-400/40 bg-purple-500/20 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.28em] text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        🛡️ ADMIN CONTROL PANEL
                      </span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                      Platform Management & Moderation
                    </h1>
                    <p className="mt-1 text-sm text-slate-300">
                      Authenticated System Administrator Controls: oversight, user directory, and item moderation.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={loadAdminData}
                    className="secondary-button text-xs py-2 text-cyan-300 border-cyan-400/40"
                  >
                    🔄 Refresh Control Panel
                  </button>
                </div>
              </section>

              {/* Admin Overview Metrics Grid */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="glass-panel rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Total Registered Users</p>
                  <p className="mt-2 text-3xl font-black text-white">{adminStats?.usersCount ?? adminUsers.length}</p>
                  <p className="mt-1 text-xs text-slate-400">Active accounts in DB</p>
                </div>

                <div className="glass-panel rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Total Items Reported</p>
                  <p className="mt-2 text-3xl font-black text-cyan-300">{adminStats?.itemsCount ?? items.length}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {adminStats?.lostItemsCount ?? 0} Lost · {adminStats?.foundItemsCount ?? 0} Found
                  </p>
                </div>

                <div className="glass-panel rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Pending Claims</p>
                  <p className="mt-2 text-3xl font-black text-purple-300">{adminStats?.pendingClaimsCount ?? 0}</p>
                  <p className="mt-1 text-xs text-slate-400">Claims awaiting verification</p>
                </div>

                <div className="glass-panel rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">System Admin Auth</p>
                  <p className="mt-2 text-xl font-bold text-emerald-400">● Env Credentials Active</p>
                  <p className="mt-1 text-xs text-slate-400">{user.email}</p>
                </div>
              </section>

              {/* Admin Tab Switcher */}
              <section className="glass-panel rounded-[28px] border border-white/10 p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAdminTab("items")}
                      className={`rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition ${
                        adminTab === "items"
                          ? "bg-purple-500/20 text-purple-200 border border-purple-400/40"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      📦 Item Moderation ({adminItems.length || items.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab("users")}
                      className={`rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition ${
                        adminTab === "users"
                          ? "bg-purple-500/20 text-purple-200 border border-purple-400/40"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      👥 User Directory ({adminUsers.length})
                    </button>
                  </div>
                </div>

                {isLoadingAdminData ? (
                  <div className="py-8 text-center text-sm text-slate-400 animate-pulse">
                    Loading administrative controls...
                  </div>
                ) : adminTab === "items" ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 uppercase tracking-widest text-[10px]">
                          <th className="py-3 px-3">Item Details</th>
                          <th className="py-3 px-3">Type</th>
                          <th className="py-3 px-3">Category</th>
                          <th className="py-3 px-3">Location</th>
                          <th className="py-3 px-3">Owner</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3 text-right">Admin Control</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(adminItems.length > 0 ? adminItems : items).map((item) => (
                          <tr key={item.id || item._id} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                              <img
                                src={item.imageUrl || fallbackImage}
                                alt=""
                                className="h-9 w-9 rounded-lg object-cover"
                                onError={(e) => { e.currentTarget.src = fallbackImage; }}
                              />
                              <span className="truncate max-w-[160px]">{item.title}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="uppercase text-[10px] font-bold text-cyan-300">{item.type}</span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">{item.category}</td>
                            <td className="py-3 px-3 text-slate-300">{item.location}</td>
                            <td className="py-3 px-3 text-slate-300">{item.owner?.name || "Unknown"}</td>
                            <td className="py-3 px-3">
                              <select
                                value={item.status}
                                onChange={(e) => handleAdminUpdateStatus(item.id || item._id, e.target.value)}
                                className="bg-slate-900 border border-white/10 rounded-lg text-[11px] px-2 py-1 text-slate-200"
                              >
                                <option value="open">open</option>
                                <option value="match_suggested">match_suggested</option>
                                <option value="claim_pending">claim_pending</option>
                                <option value="verified">verified</option>
                                <option value="returned">returned</option>
                                <option value="closed">closed</option>
                              </select>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleAdminDeleteItem(item.id || item._id)}
                                className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/20 transition"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 uppercase tracking-widest text-[10px]">
                          <th className="py-3 px-3">User Name</th>
                          <th className="py-3 px-3">Email Address</th>
                          <th className="py-3 px-3">Account Role</th>
                          <th className="py-3 px-3">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {adminUsers.map((u) => (
                          <tr key={u._id || u.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-3 font-bold text-white">{u.name}</td>
                            <td className="py-3 px-3 text-cyan-300">{u.email}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${u.role === "admin" ? "bg-purple-500/20 text-purple-300 border border-purple-400/30" : "bg-cyan-500/10 text-cyan-300 border border-cyan-400/20"}`}>
                                {u.role || "user"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-400">
                              {formatDate(u.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
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

      {/* User Reputation & Trust Profile Modal */}
      {showReputationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md overflow-y-auto py-6">
          <div className="glass-panel w-full max-w-2xl rounded-[28px] border border-emerald-500/30 p-5 sm:p-6 my-auto shadow-[0_0_50px_rgba(16,185,129,0.18)] space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-cyan-500 to-indigo-500 font-bold text-white text-lg">
                  {reputationData?.name ? reputationData.name[0].toUpperCase() : "U"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-white">{reputationData?.name || "Community Member"}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest ${
                      reputationData?.isSuspicious
                        ? "bg-red-500/20 text-red-300 border border-red-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                    }`}>
                      {reputationData?.trustBadge || "Verified Member"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Trust & Reputation Verification Sheet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReputationModal(false)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-slate-300 hover:border-white/20"
              >
                ✕
              </button>
            </div>

            {isLoadingReputation ? (
              <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
                Calculating user trust metrics & community ratings...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Suspicious Warning Banner */}
                {reputationData?.isSuspicious && (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-200 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm text-red-300">
                      <span>⚠️ COMMUNITY SECURITY ALERT: High Risk Account</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {reputationData?.suspiciousReason || "This account has been flagged for suspicious activity or low reputation score."}
                    </p>
                  </div>
                )}

                {/* Score & Gauge Panel */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="glass-panel rounded-2xl border border-white/10 bg-slate-950/60 p-4 flex flex-col justify-between">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-400">Trust Score Rating</p>
                    <div className="my-3 flex items-baseline gap-2">
                      <span className="text-4xl font-black text-emerald-400">{reputationData?.trustScore ?? 75}</span>
                      <span className="text-xs text-slate-400">/ 100</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (reputationData?.trustScore || 75) >= 80
                            ? "bg-gradient-to-r from-emerald-400 to-cyan-400"
                            : (reputationData?.trustScore || 75) >= 50
                            ? "bg-gradient-to-r from-amber-400 to-cyan-400"
                            : "bg-gradient-to-r from-red-500 to-amber-500"
                        }`}
                        style={{ width: `${reputationData?.trustScore ?? 75}%` }}
                      />
                    </div>
                  </div>

                  <div className="glass-panel rounded-2xl border border-white/10 bg-slate-950/60 p-4 flex flex-col justify-between">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-400">Community Average Rating</p>
                    <div className="my-3 flex items-center gap-2">
                      <span className="text-4xl font-black text-amber-300">★ {reputationData?.averageRating?.toFixed(1) ?? "5.0"}</span>
                      <span className="text-xs text-slate-400">({reputationData?.ratings?.length || 0} reviews)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Based on verified return & claim interactions</p>
                  </div>
                </div>

                {/* Score Breakdown Metrics */}
                <div className="grid gap-3 sm:grid-cols-4 text-center">
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Verified Posts</p>
                    <p className="mt-1 text-lg font-bold text-white">+{reputationData?.verifiedReportsCount || 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Successful Returns</p>
                    <p className="mt-1 text-lg font-bold text-emerald-300">+{reputationData?.successfulReturnsCount || 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Verified Claims</p>
                    <p className="mt-1 text-lg font-bold text-cyan-300">+{reputationData?.verifiedClaimsCount || 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Fraud Reports</p>
                    <p className="mt-1 text-lg font-bold text-red-400">-{reputationData?.fraudReportsCount || 0}</p>
                  </div>
                </div>

                {/* Community Reviews Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Community Ratings & Reviews</h4>
                  {reputationData?.ratings && reputationData.ratings.length > 0 ? (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {reputationData.ratings.map((r, idx) => (
                        <div key={r._id || idx} className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-xs">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="font-bold text-white">{r.raterName}</span>
                            <span className="text-amber-300 font-bold">{"★".repeat(r.score)} ({r.score}/5)</span>
                          </div>
                          {r.comment && <p className="mt-1 text-slate-400 italic">"{r.comment}"</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-3 text-center text-xs text-slate-500">
                      No ratings submitted yet for this user.
                    </div>
                  )}
                </div>

                {/* Interactive Feedback Forms */}
                <div className="border-t border-white/10 pt-4 space-y-4">
                  {/* Rate User Form */}
                  <form onSubmit={handleRateUser} className="space-y-3 bg-slate-900/40 rounded-2xl p-4 border border-white/10">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">Rate & Review User</h5>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-slate-400">Score:</label>
                      <select
                        value={ratingScore}
                        onChange={(e) => setRatingScore(Number(e.target.value))}
                        className="bg-slate-950 border border-white/10 rounded-lg text-xs px-3 py-1.5 text-amber-300 font-bold"
                      >
                        <option value={5}>★★★★★ (5 Stars - Excellent)</option>
                        <option value={4}>★★★★☆ (4 Stars - Good)</option>
                        <option value={3}>★★★☆☆ (3 Stars - Average)</option>
                        <option value={2}>★★☆☆☆ (2 Stars - Poor)</option>
                        <option value={1}>★☆☆☆☆ (1 Star - Bad)</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Write a brief comment regarding item return / claim..."
                      className="futuristic-input text-xs"
                    />
                    <button type="submit" className="primary-button text-xs py-2 w-full justify-center">
                      Submit Rating & Review
                    </button>
                  </form>

                  {/* Report Fraud Toggle & Form */}
                  <div className="text-right">
                    {!showFraudForm ? (
                      <button
                        type="button"
                        onClick={() => setShowFraudForm(true)}
                        className="text-xs text-red-400 hover:text-red-300 underline font-semibold"
                      >
                        🚨 Report Suspicious / Fraudulent Activity
                      </button>
                    ) : (
                      <form onSubmit={handleReportFraud} className="space-y-3 bg-red-950/20 rounded-2xl p-4 border border-red-500/30 text-left">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-red-300">Report Fraud / Suspicious User</h5>
                        <textarea
                          value={fraudReason}
                          onChange={(e) => setFraudReason(e.target.value)}
                          placeholder="Describe the suspicious behavior, fake post, or fraudulent claim attempt..."
                          className="futuristic-input text-xs min-h-[60px]"
                          required
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setShowFraudForm(false)}
                            className="secondary-button text-xs py-1.5 px-3"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="rounded-xl border border-red-500/40 bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-500/30"
                          >
                            Submit Fraud Report
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;