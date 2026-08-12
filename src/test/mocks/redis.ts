export interface SetOptions {
  ex?: number;
}

export class MockRedisClient {
  private storage = new Map<string, { value: string; expiry?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.storage.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiry !== undefined && Date.now() > entry.expiry) {
      this.storage.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, opts?: SetOptions): Promise<'OK'> {
    const expiry = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    this.storage.set(key, { value: String(value), expiry });
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const currentValStr = await this.get(key);
    const currentVal = currentValStr !== null ? parseInt(currentValStr, 10) : 0;
    const newVal = isNaN(currentVal) ? 1 : currentVal + 1;

    const existingEntry = this.storage.get(key);
    this.storage.set(key, {
      value: String(newVal),
      expiry: existingEntry?.expiry
    });

    return newVal;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.storage.get(key);
    if (!entry) {
      return 0;
    }

    if (entry.expiry !== undefined && Date.now() > entry.expiry) {
      this.storage.delete(key);
      return 0;
    }

    entry.expiry = Date.now() + seconds * 1000;
    return 1;
  }

  async del(key: string): Promise<number> {
    const deleted = this.storage.delete(key);
    return deleted ? 1 : 0;
  }

  reset(): void {
    this.storage.clear();
  }

  getAll(): Map<string, { value: string; expiry?: number }> {
    return new Map(this.storage);
  }
}
