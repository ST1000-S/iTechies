const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // Changed from bcrypt to bcryptjs

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["customer", "provider"],
      default: "customer",
    },
    skills: { type: [String], default: [] },
    location: {
      type: String, // Changed from GeoJSON to simple String
      required: function () {
        return this.role === "provider";
      },
    },
    availability: String,
    reviews: [
      {
        rating: Number,
        comment: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
