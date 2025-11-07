import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISale extends Document {
  kiwifyId: string;
  productId: mongoose.Types.ObjectId;
  productName: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  status: "paid" | "refused" | "refunded" | "chargeback" | "pending";
  amount: number;
  netAmount?: number;
  commission: number;
  paymentMethod?: string;
  installments?: number;
  userId: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    kiwifyId: {
      type: String,
      required: true,
      unique: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    productName: {
      type: String,
      required: true,
    },
    customer: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
      },
    },
    status: {
      type: String,
      enum: ["paid", "refused", "refunded", "chargeback", "pending"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    netAmount: {
      type: Number,
    },
    commission: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
    },
    installments: {
      type: Number,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
SaleSchema.index({ userId: 1, status: 1 });
SaleSchema.index({ userId: 1, createdAt: -1 });
SaleSchema.index({ "customer.email": 1 });

const Sale: Model<ISale> =
  (mongoose.models?.Sale as Model<ISale>) || mongoose.model<ISale>("Sale", SaleSchema);

export default Sale;
