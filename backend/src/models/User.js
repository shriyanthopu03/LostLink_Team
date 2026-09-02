import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  raterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  raterName: { type: String, required: true },
  score: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

const fraudReportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reporterName: { type: String, required: true },
  reason: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },

    // Trust & Reputation System Fields
    trustScore: { type: Number, default: 75, min: 0, max: 100 },
    verifiedReportsCount: { type: Number, default: 1 },
    successfulReturnsCount: { type: Number, default: 0 },
    verifiedClaimsCount: { type: Number, default: 0 },
    fraudReportsCount: { type: Number, default: 0 },
    ratings: [ratingSchema],
    fraudReports: [fraudReportSchema],
    averageRating: { type: Number, default: 5.0 },
    trustBadge: {
      type: String,
      default: "Verified Member",
      enum: ["Unverified", "Verified Member", "Trusted Finder", "Community Champion", "High Risk"]
    },
    isSuspicious: { type: Boolean, default: false },
    suspiciousReason: { type: String, default: "" }
  },
  { timestamps: true }
);

userSchema.methods.recalculateTrust = function () {
  let score = 70;

  score += (this.verifiedReportsCount || 0) * 4;
  score += (this.successfulReturnsCount || 0) * 15;
  score += (this.verifiedClaimsCount || 0) * 8;

  if (this.ratings && this.ratings.length > 0) {
    const sum = this.ratings.reduce((acc, r) => acc + r.score, 0);
    this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10;
    score += (this.averageRating - 3) * 6;
  }

  score -= (this.fraudReportsCount || 0) * 35;

  this.trustScore = Math.min(100, Math.max(0, Math.round(score)));

  if (this.trustScore < 45 || (this.fraudReportsCount || 0) >= 2) {
    this.isSuspicious = true;
    this.suspiciousReason = "Flagged due to low trust score or multiple community fraud reports.";
    this.trustBadge = "High Risk";
  } else {
    this.isSuspicious = false;
    this.suspiciousReason = "";

    if (this.successfulReturnsCount >= 5 || this.trustScore >= 90) {
      this.trustBadge = "Community Champion";
    } else if (this.successfulReturnsCount >= 2 || this.trustScore >= 80) {
      this.trustBadge = "Trusted Finder";
    } else {
      this.trustBadge = "Verified Member";
    }
  }
};

export default mongoose.model("User", userSchema);