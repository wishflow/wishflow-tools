const JAVA_RANDOM_MULTIPLIER = 0x5deece66dn;
const JAVA_RANDOM_MASK = (1n << 48n) - 1n;
const JAVA_INT_MAX = 0x7fff_ffff;

export type SessionRandomStream = 'game-util' | 'presentation' | 'awesome-feedback';

const SESSION_RANDOM_STREAM_SALTS: Readonly<Record<SessionRandomStream, number>> = {
  'game-util': 0x5354_4541,
  presentation: 0x5346_5801,
  'awesome-feedback': 0x4157_4f4d,
};

/** Derives stable, role-specific Java Random seeds from a replay's StartRecord seed. */
export function deriveSessionRandomSeed(seed: number, stream: SessionRandomStream): number {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
    throw new RangeError('Random seed must be an unsigned 32-bit integer');
  }
  return (seed ^ SESSION_RANDOM_STREAM_SALTS[stream]) >>> 0;
}

/**
 * The APK Randomizer wrapper around java.util.Random. Each bounded draw is
 * followed by nextLong() and setSeed(), matching Randomizer.nextInt().
 */
export class JavaRandom {
  private seed = 0n;
  private firstRandom = true;

  constructor(seed: number) {
    this.reset(seed);
  }

  reset(seed: number): void {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
      throw new RangeError('Random seed must be an unsigned 32-bit integer');
    }
    this.setSeed(BigInt(seed));
    this.firstRandom = true;
  }

  isFirstRandom(): boolean {
    return this.firstRandom;
  }

  private setSeed(seed: bigint): void {
    this.seed = (seed ^ JAVA_RANDOM_MULTIPLIER) & JAVA_RANDOM_MASK;
  }

  private next(bits: number): number {
    this.seed = (this.seed * JAVA_RANDOM_MULTIPLIER + 0xbn) & JAVA_RANDOM_MASK;
    return Number(this.seed >> BigInt(48 - bits));
  }

  private nextLong(): bigint {
    const high = BigInt.asIntN(32, BigInt(this.next(32)));
    const low = BigInt.asIntN(32, BigInt(this.next(32)));
    return BigInt.asIntN(64, (high << 32n) + low);
  }

  private javaNextInt(bound: number): number {
    if ((bound & (bound - 1)) === 0) {
      return Number((BigInt(bound) * BigInt(this.next(31))) >> 31n);
    }

    let bits: number;
    let value: number;
    do {
      bits = this.next(31);
      value = bits % bound;
    } while (bits - value + (bound - 1) >= 0x8000_0000);
    return value;
  }

  nextInt(bound: number): number {
    if (!Number.isInteger(bound) || bound <= 0 || bound > JAVA_INT_MAX) {
      throw new RangeError('Random bound must be a positive Java integer');
    }
    const value = this.javaNextInt(bound);
    this.setSeed(this.nextLong());
    this.firstRandom = false;
    return value;
  }

  /** Deterministic web adapter retained for the APK's Math.random rocket angle. */
  nextDouble(): number {
    return ((this.next(26) * 0x800_0000) + this.next(27)) / 0x20_0000_0000_0000;
  }
}

/** Standard java.util.Random stream used by APK Util.random(), without Game.Randomizer reseeding. */
export class JavaUtilRandom {
  private seed = 0n;

  constructor(seed: number) {
    this.reset(seed);
  }

  reset(seed: number): void {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
      throw new RangeError('Random seed must be an unsigned 32-bit integer');
    }
    this.seed = (BigInt(seed) ^ JAVA_RANDOM_MULTIPLIER) & JAVA_RANDOM_MASK;
  }

  private next(bits: number): number {
    this.seed = (this.seed * JAVA_RANDOM_MULTIPLIER + 0xbn) & JAVA_RANDOM_MASK;
    return Number(this.seed >> BigInt(48 - bits));
  }

  nextInt(bound: number): number {
    if (!Number.isInteger(bound) || bound <= 0 || bound > JAVA_INT_MAX) {
      throw new RangeError('Random bound must be a positive Java integer');
    }
    if ((bound & (bound - 1)) === 0) {
      return Number((BigInt(bound) * BigInt(this.next(31))) >> 31n);
    }

    let bits: number;
    let value: number;
    do {
      bits = this.next(31);
      value = bits % bound;
    } while (bits - value + (bound - 1) >= 0x8000_0000);
    return value;
  }

  nextDouble(): number {
    return ((this.next(26) * 0x800_0000) + this.next(27)) / 0x20_0000_0000_0000;
  }
}
