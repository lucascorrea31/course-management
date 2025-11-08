import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudent extends Document {
  userId: mongoose.Types.ObjectId;
  platform: "kiwify" | "hotmart";
  kiwifyCustomerId?: string; // ID do cliente na Kiwify
  hotmartSubscriberId?: string; // ID do assinante na Hotmart
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  cnpj?: string;
  instagram?: string;
  country?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipcode?: string;
  };
  telegram?: {
    userId?: number;
    username?: string;
    addedAt?: Date;
    removedAt?: Date;
    status: "pending" | "active" | "removed" | "failed";
  };
  products: Array<{
    productId: mongoose.Types.ObjectId;
    productName: string;
    enrolledAt: Date;
    status: "active" | "expired" | "refunded";
    saleId?: string; // Kiwify sale ID
    saleReference?: string; // Kiwify sale reference
    paymentMethod?: string;
    amount?: number;
  }>;
  isActive: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    platform: {
      type: String,
      enum: ["kiwify", "hotmart"],
      required: true,
    },
    kiwifyCustomerId: {
      type: String,
      trim: true,
    },
    hotmartSubscriberId: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    cpf: {
      type: String,
      trim: true,
    },
    cnpj: {
      type: String,
      trim: true,
    },
    instagram: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    address: {
      street: { type: String, trim: true },
      number: { type: String, trim: true },
      complement: { type: String, trim: true },
      neighborhood: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipcode: { type: String, trim: true },
    },
    telegram: {
      userId: {
        type: Number,
      },
      username: {
        type: String,
      },
      addedAt: {
        type: Date,
      },
      removedAt: {
        type: Date,
      },
      status: {
        type: String,
        enum: ["pending", "active", "removed", "failed"],
        default: "pending",
      },
    },
    products: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["active", "expired", "refunded"],
          default: "active",
        },
        saleId: {
          type: String,
          trim: true,
        },
        saleReference: {
          type: String,
          trim: true,
        },
        paymentMethod: {
          type: String,
          trim: true,
        },
        amount: {
          type: Number,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSyncAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
StudentSchema.index({ userId: 1, platform: 1, email: 1 }, { unique: true });
StudentSchema.index({ userId: 1, platform: 1, isActive: 1 });
StudentSchema.index({ email: 1 });
StudentSchema.index({ kiwifyCustomerId: 1 }, { unique: true, sparse: true });
StudentSchema.index({ hotmartSubscriberId: 1 }, { unique: true, sparse: true });
StudentSchema.index({ "telegram.userId": 1 });
StudentSchema.index({ "telegram.status": 1 });

const Student: Model<IStudent> =
  (mongoose.models?.Student as Model<IStudent>) ||
  mongoose.model<IStudent>("Student", StudentSchema);

export default Student;
