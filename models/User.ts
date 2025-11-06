import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Por favor, forneça um nome"],
      maxlength: [60, "Nome não pode ter mais de 60 caracteres"],
    },
    email: {
      type: String,
      required: [true, "Por favor, forneça um e-mail"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Por favor, forneça um e-mail válido",
      ],
    },
    password: {
      type: String,
      required: [true, "Por favor, forneça uma senha"],
      minlength: [6, "Senha deve ter no mínimo 6 caracteres"],
      select: false, // Não retorna a senha por padrão nas queries
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

// Previne criação de múltiplos modelos durante hot reload no desenvolvimento
const User: Model<IUser> =
  (mongoose.models?.User as Model<IUser>) || mongoose.model<IUser>("User", UserSchema);

export default User;
