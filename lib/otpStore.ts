// Shared OTP store for email verification
// In production, this should be replaced with Redis or a database

interface OTPData {
  code: string;
  email: string;
  expiresAt: number;
  attempts?: number;
}

class OTPStore {
  private store = new Map<string, OTPData>();
  private maxAttempts = 5;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired OTPs every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set(userId: string, data: Omit<OTPData, 'attempts'>): void {
    this.store.set(userId, {
      ...data,
      attempts: 0
    });
  }

  get(userId: string): OTPData | undefined {
    const data = this.store.get(userId);
    if (!data) return undefined;

    // Check if expired
    if (Date.now() > data.expiresAt) {
      this.store.delete(userId);
      return undefined;
    }

    return data;
  }
  verify(userId: string, code: string, email: string): { success: boolean; error?: string } {
    const data = this.get(userId);
    
    if (!data) {
      return { success: false, error: "No OTP found. Please request a new code." };
    }

    // Check if too many attempts
    const attempts = data.attempts || 0;
    if (attempts >= this.maxAttempts) {
      this.store.delete(userId);
      return { success: false, error: "Too many failed attempts. Please request a new code." };
    }

    // Increment attempts
    data.attempts = attempts + 1;

    // Check if OTP matches
    if (data.code !== code || data.email !== email) {
      return { success: false, error: "Invalid OTP code" };
    }

    // Success - remove from store
    this.store.delete(userId);
    return { success: true };
  }

  delete(userId: string): void {
    this.store.delete(userId);
  }
  private cleanup(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];
    
    this.store.forEach((data, userId) => {
      if (now > data.expiresAt) {
        entriesToDelete.push(userId);
      }
    });
    
    entriesToDelete.forEach(userId => {
      this.store.delete(userId);
    });
  }

  // Cleanup when the process exits
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Export a singleton instance
export const otpStore = new OTPStore();

// Function to generate a 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
