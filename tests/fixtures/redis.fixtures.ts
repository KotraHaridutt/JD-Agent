export class MockUpstashRatelimit {
  private limitMax: number;
  private windowMs: number;
  private records: Map<string, { count: number; resetAt: number }>;

  constructor(options?: { limitMax?: number; windowMs?: number }) {
    this.limitMax = options?.limitMax ?? 10;
    this.windowMs = options?.windowMs ?? 60000;
    this.records = new Map();
  }

  async limit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const now = Date.now();
    let record = this.records.get(identifier);

    if (!record || now >= record.resetAt) {
      record = { count: 0, resetAt: now + this.windowMs };
      this.records.set(identifier, record);
    }

    record.count += 1;
    const remaining = Math.max(0, this.limitMax - record.count);
    const success = record.count <= this.limitMax;

    return {
      success,
      limit: this.limitMax,
      remaining,
      reset: record.resetAt
    };
  }

  resetMap(): void {
    this.records.clear();
  }
}
