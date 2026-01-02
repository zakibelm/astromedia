// Circuit Breaker Pattern Implementation for External API Resilience
import { logger } from '../../utils/logger';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;      // Number of successes to close circuit
  timeout: number;               // Time (ms) before attempting recovery
  halfOpenMaxCalls: number;      // Max calls allowed in half-open state
}

export enum CircuitState {
  CLOSED = 'CLOSED',       // Normal operation
  OPEN = 'OPEN',           // Failing, reject all calls
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  totalCalls: number;
  totalFailures: number;
  openedAt: Date | null;
}

const DEFAULT_CONFIG: Omit<CircuitBreakerConfig, 'name'> = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
  halfOpenMaxCalls: 3,
};

class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private halfOpenCalls = 0;
  private lastFailure: Date | null = null;
  private lastSuccess: Date | null = null;
  private openedAt: Date | null = null;
  private totalCalls = 0;
  private totalFailures = 0;

  constructor(config: CircuitBreakerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptRecovery()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        const error = new CircuitBreakerOpenError(
          `Circuit breaker "${this.config.name}" is OPEN`,
          this.config.name
        );
        throw error;
      }
    }

    // In HALF_OPEN, limit concurrent calls
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        throw new CircuitBreakerOpenError(
          `Circuit breaker "${this.config.name}" is HALF_OPEN and at capacity`,
          this.config.name
        );
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful call
   */
  private onSuccess(): void {
    this.lastSuccess = new Date();
    this.successes++;
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCalls--;
      
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Handle failed call
   */
  private onFailure(error: unknown): void {
    this.lastFailure = new Date();
    this.failures++;
    this.totalFailures++;
    this.successes = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCalls--;
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }

    logger.warn({
      circuit: this.config.name,
      state: this.state,
      failures: this.failures,
      error: error instanceof Error ? error.message : String(error),
    }, 'Circuit breaker recorded failure');
  }

  /**
   * Check if we should attempt recovery from OPEN state
   */
  private shouldAttemptRecovery(): boolean {
    if (!this.openedAt) return false;
    return Date.now() - this.openedAt.getTime() >= this.config.timeout;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === CircuitState.OPEN) {
      this.openedAt = new Date();
      this.halfOpenCalls = 0;
    } else if (newState === CircuitState.CLOSED) {
      this.failures = 0;
      this.successes = 0;
      this.openedAt = null;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successes = 0;
      this.halfOpenCalls = 0;
    }

    logger.info({
      circuit: this.config.name,
      oldState,
      newState,
      failures: this.failures,
    }, 'Circuit breaker state transition');
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      openedAt: this.openedAt,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.halfOpenCalls = 0;
    this.openedAt = null;
    
    logger.info({ circuit: this.config.name }, 'Circuit breaker manually reset');
  }

  /**
   * Check if circuit is allowing calls
   */
  isCallAllowed(): boolean {
    if (this.state === CircuitState.CLOSED) return true;
    if (this.state === CircuitState.OPEN) return this.shouldAttemptRecovery();
    if (this.state === CircuitState.HALF_OPEN) {
      return this.halfOpenCalls < this.config.halfOpenMaxCalls;
    }
    return false;
  }
}

/**
 * Custom error for circuit breaker open state
 */
export class CircuitBreakerOpenError extends Error {
  public readonly circuitName: string;
  public readonly isCircuitBreakerError = true;

  constructor(message: string, circuitName: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.circuitName = circuitName;
  }
}

// Registry of circuit breakers
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker by name
 */
export const getCircuitBreaker = (config: CircuitBreakerConfig): CircuitBreaker => {
  const existing = circuitBreakers.get(config.name);
  if (existing) return existing;

  const breaker = new CircuitBreaker(config);
  circuitBreakers.set(config.name, breaker);
  return breaker;
};

/**
 * Get all circuit breaker stats
 */
export const getAllCircuitBreakerStats = (): Record<string, CircuitBreakerStats> => {
  const stats: Record<string, CircuitBreakerStats> = {};
  circuitBreakers.forEach((breaker, name) => {
    stats[name] = breaker.getStats();
  });
  return stats;
};

// Pre-configured circuit breakers for common services
export const circuits = {
  replicate: getCircuitBreaker({
    name: 'replicate',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    halfOpenMaxCalls: 2,
  }),
  
  openrouter: getCircuitBreaker({
    name: 'openrouter',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    halfOpenMaxCalls: 3,
  }),
  
  huggingface: getCircuitBreaker({
    name: 'huggingface',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 45000,
    halfOpenMaxCalls: 2,
  }),
  
  fal: getCircuitBreaker({
    name: 'fal',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000,
    halfOpenMaxCalls: 2,
  }),
};

export default CircuitBreaker;
