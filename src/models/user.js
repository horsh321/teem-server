import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    username: {
      type: String,
      unique: true,
      match: [
        /^[a-zA-Z0-9_]{3,}$/,
        "username should contain letters, numbers or _, at least 6 characters",
      ],
    },
    email: {
      type: String,
      unique: [true, "Email already exists"],
      required: true,
      match: [
        /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    photo: {
      type: String,
      default:
        "https://res.cloudinary.com/ceenobi/image/upload/v1698666381/icons/user-avatar-profile-icon-black-vector-illustration_mpn3ef.jpg",
    },
    role: {
      type: String,
      enum: ["user", "seller", "admin"],
      default: "user",
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
    },
    refreshToken: {
      type: String,
      select: false,
      expires: 60 * 60 * 24,
    },
  },
  {
    timestamps: true,
  }
);

const User = model("User", userSchema);

export default User;
