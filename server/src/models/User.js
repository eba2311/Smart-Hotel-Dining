import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'guest' },
    phone: { type: String, default: '' },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    active: { type: Boolean, default: true },
    lastLogin: { type: Date },
    avatar: { type: String, default: '👤' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    hotel: this.hotel,
    branch: this.branch,
    active: this.active,
    avatar: this.avatar,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('User', userSchema);
