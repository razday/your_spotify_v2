// In-memory sliding window counter, keyed by anything (IP, username...)
export class AttemptLimiter {
  private readonly attempts = new Map<string, number[]>();

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
  ) {}

  private recent(key: string, now: number) {
    return (this.attempts.get(key) ?? []).filter(
      (time) => now - time < this.windowMs,
    );
  }

  // Seconds to wait before a new attempt is allowed, 0 if allowed now
  retryAfterSeconds(key: string) {
    const now = Date.now();
    const recent = this.recent(key, now);
    this.attempts.set(key, recent);
    if (recent.length < this.maxAttempts) {
      return 0;
    }
    return Math.max(1, Math.ceil((recent[0]! + this.windowMs - now) / 1000));
  }

  record(key: string) {
    const now = Date.now();
    const recent = this.recent(key, now);
    recent.push(now);
    this.attempts.set(key, recent);
    this.cleanup(now);
  }

  reset(key: string) {
    this.attempts.delete(key);
  }

  private cleanup(now: number) {
    if (this.attempts.size <= 1000) {
      return;
    }
    for (const [key, times] of this.attempts) {
      if (times.every((time) => now - time >= this.windowMs)) {
        this.attempts.delete(key);
      }
    }
  }
}
