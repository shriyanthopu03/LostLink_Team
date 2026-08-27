import mongoose from "mongoose";

const claimSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    claimant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answer: { type: String, required: true },
    status: { type: String, enum: ["pending", "verified", "failed", "rejected"], default: "pending" },
    verifiedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("Claim", claimSchema);