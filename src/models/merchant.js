import { Schema, model } from "mongoose";

const merchantSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    merchantCode: {
      type: String,
      required: true,
    },
    merchantName: {
      type: String,
      required: true,
      unique: true,
    },
    merchantEmail: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: "Welcome to my store",
    },
    currency: {
      type: String,
      required: true,
    },
    address: {
      street: {
        type: String,
      },
      city: {
        type: String,
      },
      state: {
        type: String,
      },
      zip: {
        type: String,
      },
      phone: {
        type: String,
      },
      country: {
        type: String,
      },
    },
    logo: {
      type: String,
    },
    coverImage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Merchant = model("Merchant", merchantSchema)
export default Merchant