import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct extends Document {
  kiwifyId: string;
  name: string;
  description?: string;
  price: number;
  status: "active" | "inactive";
  imageUrl?: string;
  userId: mongoose.Types.ObjectId;
  lastSyncAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    kiwifyId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    imageUrl: {
      type: String,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastSyncAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Product: Model<IProduct> =
  (mongoose.models?.Product as Model<IProduct>) || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
