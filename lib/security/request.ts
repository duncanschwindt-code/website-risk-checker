export interface JsonRequestPolicy {
  timeoutMs: number;
  maxResponseBytes: number;
}

export interface JsonHttpResponse {
  status: number;
  headers: Headers;
  data: unknown;
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  wait?: (delayMs: number) => Promise<void>;
}

export class JsonBodyError extends Error {
  constructor(
    public readonly code:
      "UNSUPPORTED_MEDIA_TYPE" | "REQUEST_TOO_LARGE" | "INVALID_JSON",
    message: string,
  ) {
    super(message);
    this.name = "JsonBodyError";
  }
}

export class ResponsePolicyError extends Error {
  constructor(
    public readonly code:
      "TIMEOUT" | "OVERSIZED_RESPONSE" | "INVALID_JSON" | "NETWORK_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "ResponsePolicyError";
  }
}

export async function readBoundedJson(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    throw new JsonBodyError("UNSUPPORTED_MEDIA_TYPE", "Send a JSON request.");
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (
    !Number.isFinite(declaredLength) ||
    declaredLength < 0 ||
    declaredLength > maxBytes
  ) {
    throw new JsonBodyError("REQUEST_TOO_LARGE", "The request is too large.");
  }

  if (!request.body) {
    throw new JsonBodyError("INVALID_JSON", "The JSON request was empty.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new JsonBodyError(
          "REQUEST_TOO_LARGE",
          "The request is too large.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text) as unknown;
  } catch {
    throw new JsonBodyError("INVALID_JSON", "The JSON request was invalid.");
  }
}

export async function fetchJsonWithPolicy(
  input: string,
  init: RequestInit,
  policy: JsonRequestPolicy,
  fetchImpl: typeof fetch = fetch,
): Promise<JsonHttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), policy.timeoutMs);

  try {
    const response = await fetchImpl(input, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    const declaredLength = Number(
      response.headers.get("content-length") ?? "0",
    );
    if (declaredLength > policy.maxResponseBytes) {
      throw new ResponsePolicyError(
        "OVERSIZED_RESPONSE",
        "The provider returned more data than this application accepts.",
      );
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > policy.maxResponseBytes) {
      throw new ResponsePolicyError(
        "OVERSIZED_RESPONSE",
        "The provider returned more data than this application accepts.",
      );
    }

    let data: unknown = {};
    if (bytes.byteLength > 0) {
      try {
        data = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        throw new ResponsePolicyError(
          "INVALID_JSON",
          "The provider returned malformed JSON.",
        );
      }
    }
    return { status: response.status, headers: response.headers, data };
  } catch (error) {
    if (error instanceof ResponsePolicyError) throw error;
    if (controller.signal.aborted) {
      throw new ResponsePolicyError(
        "TIMEOUT",
        "The provider request timed out.",
      );
    }
    throw new ResponsePolicyError(
      "NETWORK_ERROR",
      "The provider request failed.",
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJsonWithBackoff(
  input: string,
  init: RequestInit,
  policy: JsonRequestPolicy,
  fetchImpl: typeof fetch = fetch,
  retry: RetryPolicy = { maxRetries: 1, baseDelayMs: 250 },
): Promise<JsonHttpResponse> {
  const wait =
    retry.wait ??
    ((delayMs: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, delayMs);
      }));

  for (let attempt = 0; attempt <= retry.maxRetries; attempt += 1) {
    try {
      const response = await fetchJsonWithPolicy(
        input,
        init,
        policy,
        fetchImpl,
      );
      const retryableStatus = response.status >= 500 && response.status <= 599;
      if (retryableStatus && attempt < retry.maxRetries) {
        await wait(retry.baseDelayMs * 2 ** attempt);
        continue;
      }
      return response;
    } catch (error) {
      const retryableError =
        error instanceof ResponsePolicyError &&
        (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT");
      if (!retryableError || attempt >= retry.maxRetries) throw error;
      await wait(retry.baseDelayMs * 2 ** attempt);
    }
  }

  throw new ResponsePolicyError(
    "NETWORK_ERROR",
    "The provider request failed after bounded retries.",
  );
}

export function sameOriginRequest(
  request: Request,
  configuredOrigin: string,
): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(configuredOrigin).origin;
  } catch {
    return false;
  }
}
