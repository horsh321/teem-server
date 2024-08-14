import { Schema, model } from "mongoose";

const taxSchema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    merchantCode: {
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
        required: true,
      },
    },
    standardRate: {
      type: Number,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Tax = model("Tax", taxSchema);
export default Tax;
