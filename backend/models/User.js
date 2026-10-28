'use strict';

const mongoose = require('mongoose');
const { isValidEmail, NAME_MAX, EMAIL_MAX } = require('../utils/validators');
const { isBcryptHash } = require('../utils/password');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [NAME_MAX, `Name must be at most ${NAME_MAX} characters`],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // unique index, also guards against duplicate-registration races
      lowercase: true,
      trim: true,
      maxlength: [EMAIL_MAX, 'Enter a valid email address'],
      validate: { validator: isValidEmail, message: 'Enter a valid email address' },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // the hash is never returned by a query unless explicitly requested
      validate: {
        // SEC-01 safety net: a plaintext (or weakly hashed) password can never be persisted.
        validator: isBcryptHash,
        message: 'Password must be stored as a bcrypt hash with at least 10 rounds',
      },
    },
  },
  {
    timestamps: true, // createdAt / updatedAt (TDD 3.1)
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password; // belt and braces: never serialise the hash
        return ret;
      },
    },
  }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
