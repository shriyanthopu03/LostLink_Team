import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["lost", "found"], required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true },
    imageUrl: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
    verificationQuestion: { type: String, required: true, trim: true },
    verificationAnswerHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "match_suggested", "claim_pending", "verified", "returned", "closed"],
      default: "open"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Item", itemSchema);