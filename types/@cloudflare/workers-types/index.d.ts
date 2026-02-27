// Minimal local Worker globals to satisfy repository typecheck in offline environments.

interface ScheduledController {
  cron: string;
  noRetry: boolean;
  scheduledTime: number;
  type: "scheduled";
}

interface DurableObject {
  fetch(request: Request): Response | Promise<Response>;
}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

interface DurableObjectId {
  toString(): string;
}

interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  list<T = unknown>(options?: {
    prefix?: string;
    limit?: number;
    start?: string;
    startAfter?: string;
    reverse?: boolean;
  }): Promise<Map<string, T>>;
}

interface DurableObjectState {
  storage: DurableObjectStorage;
}

interface DurableObjectStub {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}
