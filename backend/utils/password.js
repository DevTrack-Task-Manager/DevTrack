'use strict';

const bcrypt = require('bcryptjs');
const config = require('../config/env');

const MIN_ROUNDS = 10; // SEC-01
const HASH_PATTERN = /^\$2[abxy]\$(\d{2})\$[./A-Za-z0-9]{53}$/;

/** Cost factor embedded in a bcrypt hash, or null if it is not a bcrypt hash. */
function getHashRounds(value) {
  if (typeof value !== 'string') return null;
  const match = HASH_PATTERN.exec(value);
  return match ? Number(match[1]) : null;
}

/** True only for a well-formed bcrypt hash with cost >= 10. Plaintext can never pass. */
function isBcryptHash(value) {
  const rounds = getHashRounds(value);
  return rounds !== null && rounds >= MIN_ROUNDS;
}

function hashPassword(plain, rounds = config.bcryptRounds) {
  if (rounds < MIN_ROUNDS) throw new Error(`bcrypt rounds must be at least ${MIN_ROUNDS}`);
  return bcrypt.hash(plain, rounds);
}

function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

let dummyHashPromise;
/**
 * A throwaway hash compared against when the account does not exist, so a missing
 * user costs the same time as a wrong password (prevents timing based enumeration).
 */
function getDummyHash() {
  if (!dummyHashPromise) dummyHashPromise = hashPassword('devtrack-timing-equalizer');
  return dummyHashPromise;
}

module.exports = { MIN_ROUNDS, getHashRounds, isBcryptHash, hashPassword, comparePassword, getDummyHash };
