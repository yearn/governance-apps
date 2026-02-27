export type BlockTag = number | "latest";

export interface RpcBlock {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
}

export interface RpcLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number | null;
  transactionHash: string | null;
  logIndex: number | null;
  removed: boolean;
}

export interface RpcTransaction {
  hash: string;
  from: string;
  to: string | null;
  blockHash: string | null;
  blockNumber: number | null;
  nonce: number;
  transactionIndex: number | null;
  value: string;
  input: string;
}

export interface RpcTransactionReceipt {
  transactionHash: string;
  blockHash: string | null;
  blockNumber: number | null;
  status: number | null;
  logs: RpcLog[];
}

export interface RpcCallRequest {
  to: string;
  data: string;
}

export interface RpcLogFilter {
  address?: string[];
  topics?: Array<string | string[] | null>;
  fromBlock: number;
  toBlock: number;
}

export interface RpcClient {
  getBlockNumber(): Promise<number>;
  getBlockByNumber(blockNumber: BlockTag): Promise<RpcBlock>;
  getLogs(filter: RpcLogFilter): Promise<RpcLog[]>;
  getTransactionByHash(hash: string): Promise<RpcTransaction | null>;
  getTransactionByHash(hashes: string[]): Promise<Array<RpcTransaction | null>>;
  getTransactionReceipt(hash: string): Promise<RpcTransactionReceipt | null>;
  getTransactionReceipt(hashes: string[]): Promise<Array<RpcTransactionReceipt | null>>;
  call(request: RpcCallRequest, blockNumber?: BlockTag): Promise<string>;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown[];
}

interface JsonRpcErrorPayload {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcSuccess<TResult> {
  jsonrpc: "2.0";
  id: number;
  result: TResult;
}

interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: number;
  error: JsonRpcErrorPayload;
}

type JsonRpcResponse<TResult> = JsonRpcSuccess<TResult> | JsonRpcFailure;

interface RawRpcBlock {
  number: string | null;
  hash: string;
  parentHash: string;
  timestamp: string;
}

interface RawRpcLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string | null;
  transactionHash: string | null;
  logIndex: string | null;
  removed?: boolean;
}

interface RawRpcTransaction {
  hash: string;
  from: string;
  to: string | null;
  blockHash: string | null;
  blockNumber: string | null;
  nonce: string;
  transactionIndex: string | null;
  value: string;
  input: string;
}

interface RawRpcTransactionReceipt {
  transactionHash: string;
  blockHash: string | null;
  blockNumber: string | null;
  status: string | null;
  logs: RawRpcLog[];
}

export class RpcRequestError extends Error {
  constructor(
    message: string,
    readonly method: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "RpcRequestError";
  }
}

class EthereumRpcClient implements RpcClient {
  private nextId = 1;

  constructor(
    private readonly rpcUrl: string,
    private readonly fetchImpl: typeof fetch,
  ) {}

  async getBlockNumber(): Promise<number> {
    const result = await this.request<string>("eth_blockNumber", []);
    return parseHexQuantity(result);
  }

  async getBlockByNumber(blockNumber: BlockTag): Promise<RpcBlock> {
    const result = await this.request<RawRpcBlock | null>("eth_getBlockByNumber", [
      toBlockTag(blockNumber),
      false,
    ]);
    if (result === null) {
      throw new RpcRequestError(
        `Block not found for tag ${String(blockNumber)}`,
        "eth_getBlockByNumber",
      );
    }
    return parseBlock(result);
  }

  async getLogs(filter: RpcLogFilter): Promise<RpcLog[]> {
    const params: {
      fromBlock: string;
      toBlock: string;
      address?: string | string[];
      topics?: Array<string | string[] | null>;
    } = {
      fromBlock: toHexQuantity(filter.fromBlock),
      toBlock: toHexQuantity(filter.toBlock),
    };

    if (filter.address && filter.address.length > 0) {
      params.address =
        filter.address.length === 1 ? filter.address[0] : filter.address;
    }

    if (filter.topics) {
      params.topics = filter.topics;
    }

    const results = await this.request<RawRpcLog[]>("eth_getLogs", [params]);
    return results.map(parseLog);
  }

  async getTransactionByHash(hash: string): Promise<RpcTransaction | null>;
  async getTransactionByHash(hashes: string[]): Promise<Array<RpcTransaction | null>>;
  async getTransactionByHash(
    hashOrHashes: string | string[],
  ): Promise<RpcTransaction | null | Array<RpcTransaction | null>> {
    if (typeof hashOrHashes === "string") {
      const result = await this.request<RawRpcTransaction | null>(
        "eth_getTransactionByHash",
        [hashOrHashes],
      );
      return result === null ? null : parseTransaction(result);
    }

    const results = await this.requestBatch<RawRpcTransaction | null>(
      hashOrHashes.map((hash) => ({
        method: "eth_getTransactionByHash",
        params: [hash],
      })),
    );
    return results.map((result) =>
      result === null ? null : parseTransaction(result),
    );
  }

  async getTransactionReceipt(hash: string): Promise<RpcTransactionReceipt | null>;
  async getTransactionReceipt(
    hashes: string[],
  ): Promise<Array<RpcTransactionReceipt | null>>;
  async getTransactionReceipt(
    hashOrHashes: string | string[],
  ): Promise<RpcTransactionReceipt | null | Array<RpcTransactionReceipt | null>> {
    if (typeof hashOrHashes === "string") {
      const result = await this.request<RawRpcTransactionReceipt | null>(
        "eth_getTransactionReceipt",
        [hashOrHashes],
      );
      return result === null ? null : parseTransactionReceipt(result);
    }

    const results = await this.requestBatch<RawRpcTransactionReceipt | null>(
      hashOrHashes.map((hash) => ({
        method: "eth_getTransactionReceipt",
        params: [hash],
      })),
    );
    return results.map((result) =>
      result === null ? null : parseTransactionReceipt(result),
    );
  }

  async call(request: RpcCallRequest, blockNumber: BlockTag = "latest"): Promise<string> {
    return this.request<string>("eth_call", [request, toBlockTag(blockNumber)]);
  }

  private buildRequest(method: string, params: unknown[]): JsonRpcRequest {
    return {
      jsonrpc: "2.0",
      id: this.nextId++,
      method,
      params,
    };
  }

  private async request<TResult>(method: string, params: unknown[]): Promise<TResult> {
    const request = this.buildRequest(method, params);
    const response = await this.post<TResult>(request, method);
    if (Array.isArray(response)) {
      throw new RpcRequestError("Expected single response payload", method, response);
    }
    return extractResult(response, request.id, method);
  }

  private async requestBatch<TResult>(
    calls: Array<{ method: string; params: unknown[] }>,
  ): Promise<TResult[]> {
    if (calls.length === 0) {
      return [];
    }

    const requests = calls.map((call) => this.buildRequest(call.method, call.params));
    const response = await this.post<TResult>(requests, "batch");
    if (!Array.isArray(response)) {
      throw new RpcRequestError(
        "Expected batch response payload",
        "batch",
        response,
      );
    }

    const responsesById = new Map<number, JsonRpcResponse<TResult>>();
    for (const item of response) {
      responsesById.set(item.id, item);
    }

    return requests.map((request) => {
      const item = responsesById.get(request.id);
      return extractResult(item, request.id, request.method);
    });
  }

  private async post<TResult>(
    payload: JsonRpcRequest | JsonRpcRequest[],
    method: string,
  ): Promise<JsonRpcResponse<TResult> | JsonRpcResponse<TResult>[]> {
    const response = await this.fetchImpl.call(globalThis, this.rpcUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new RpcRequestError(
        `RPC request failed with HTTP ${response.status}`,
        method,
      );
    }

    return (await response.json()) as
      | JsonRpcResponse<TResult>
      | JsonRpcResponse<TResult>[];
  }
}

function extractResult<TResult>(
  response: JsonRpcResponse<TResult> | undefined,
  id: number,
  method: string,
): TResult {
  if (!response) {
    throw new RpcRequestError(
      `Missing JSON-RPC response for request id ${id}`,
      method,
    );
  }

  if ("error" in response) {
    throw new RpcRequestError(
      `RPC error ${response.error.code}: ${response.error.message}`,
      method,
      response.error.data,
    );
  }

  return response.result;
}

function parseBlock(raw: RawRpcBlock): RpcBlock {
  if (raw.number === null) {
    throw new RpcRequestError(
      "Block payload is missing a block number",
      "eth_getBlockByNumber",
    );
  }

  return {
    number: parseHexQuantity(raw.number),
    hash: raw.hash,
    parentHash: raw.parentHash,
    timestamp: parseHexQuantity(raw.timestamp),
  };
}

function parseLog(raw: RawRpcLog): RpcLog {
  return {
    address: raw.address,
    topics: raw.topics,
    data: raw.data,
    blockNumber: parseNullableHexQuantity(raw.blockNumber),
    transactionHash: raw.transactionHash,
    logIndex: parseNullableHexQuantity(raw.logIndex),
    removed: raw.removed ?? false,
  };
}

function parseTransaction(raw: RawRpcTransaction): RpcTransaction {
  return {
    hash: raw.hash,
    from: raw.from,
    to: raw.to,
    blockHash: raw.blockHash,
    blockNumber: parseNullableHexQuantity(raw.blockNumber),
    nonce: parseHexQuantity(raw.nonce),
    transactionIndex: parseNullableHexQuantity(raw.transactionIndex),
    value: raw.value,
    input: raw.input,
  };
}

function parseTransactionReceipt(raw: RawRpcTransactionReceipt): RpcTransactionReceipt {
  return {
    transactionHash: raw.transactionHash,
    blockHash: raw.blockHash,
    blockNumber: parseNullableHexQuantity(raw.blockNumber),
    status: parseNullableHexQuantity(raw.status),
    logs: raw.logs.map(parseLog),
  };
}

function parseHexQuantity(value: string): number {
  if (!value.startsWith("0x")) {
    throw new RpcRequestError(
      `Expected hex quantity, received "${value}"`,
      "parseHexQuantity",
    );
  }

  const parsed = Number.parseInt(value.slice(2) || "0", 16);
  if (!Number.isFinite(parsed)) {
    throw new RpcRequestError(
      `Unable to parse numeric hex quantity "${value}"`,
      "parseHexQuantity",
    );
  }

  return parsed;
}

function parseNullableHexQuantity(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  return parseHexQuantity(value);
}

function toHexQuantity(value: number): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new RpcRequestError(
      `Expected a non-negative integer, received ${value}`,
      "toHexQuantity",
    );
  }
  return `0x${value.toString(16)}`;
}

function toBlockTag(tag: BlockTag): string {
  if (tag === "latest") {
    return tag;
  }
  return toHexQuantity(tag);
}

export function createRpcClient(
  rpcUrl: string,
  fetchImpl: typeof fetch = fetch,
): RpcClient {
  if (!rpcUrl) {
    throw new RpcRequestError("RPC URL is required", "constructor");
  }
  return new EthereumRpcClient(rpcUrl, fetchImpl);
}
