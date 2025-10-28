import { Buffer } from "node:buffer";
import { Agent, type Dispatcher } from "undici";
import { env } from "@/lib/env";

const REPLICATE_API_BASE = "https://api.replicate.com/v1";
const DEFAULT_FETCH_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 2;

type NodeRequestInit = RequestInit & {
  dispatcher?: Dispatcher;
  signal?: AbortSignal | null;
};

type FetchRetryOptions = {
  init?: NodeRequestInit;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  context?: string;
};

const replicateAgent = new Agent({
  connectTimeout: 30_000,
  headersTimeout: 120_000,
  keepAliveTimeout: 30_000,
  keepAliveMaxTimeout: 60_000
});

type ReplicatePrediction<TOutput = unknown> = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: TOutput;
  error?: { message?: string } | string | null;
  urls: {
    get: string;
  };
};

async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildAbortController(timeoutMs: number, existingSignal?: AbortSignal | null) {
  if (existingSignal) {
    return { signal: existingSignal, cancel: () => undefined };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, timeoutMs);

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timeoutId)
  };
}

type FetchErrorWithCause = Error & {
  cause?: {
    code?: string;
    errno?: string;
    message?: string;
  };
};

function describeFetchError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "İstek zaman aşımına uğradı";
  }

  if (error instanceof Error) {
    const fetchError = error as FetchErrorWithCause;
    const causeCode = fetchError.cause?.code ?? fetchError.cause?.errno;
    if (causeCode) {
      switch (causeCode) {
        case "UND_ERR_CONNECT_TIMEOUT":
          return "Sunucuya bağlanırken zaman aşımı oldu";
        case "UND_ERR_HEADERS_TIMEOUT":
          return "Sunucudan yanıt başlıkları zamanında gelmedi";
        case "UND_ERR_BODY_TIMEOUT":
          return "Sunucudan gelen yanıt tamamlanmadan kesildi";
        case "ECONNRESET":
          return "Bağlantı sıfırlandı";
        case "ETIMEDOUT":
          return "Bağlantı denemesi zaman aşımına uğradı";
        default:
          return `${causeCode} hatası (${fetchError.message})`;
      }
    }
    return fetchError.message;
  }

  return "Bilinmeyen ağ hatası";
}

async function fetchWithRetry(
  url: string,
  {
    init,
    timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
    retries = DEFAULT_MAX_RETRIES,
    retryDelayMs = 1_500,
    context
  }: FetchRetryOptions = {}
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { signal, cancel } = buildAbortController(timeoutMs, init?.signal);

    try {
      const response = await fetch(url, {
        ...init,
        dispatcher: init?.dispatcher ?? replicateAgent,
        signal
      });
      cancel();
      return response;
    } catch (error) {
      cancel();
      lastError = error;

      const humanMessage = describeFetchError(error);
      const label = context ?? url;
      const attemptLabel = `${attempt + 1}/${retries + 1}`;

      console.warn(
        `[replicate] ${label} isteği başarısız oldu (deneme ${attemptLabel}): ${humanMessage}`
      );

      if (attempt === retries) {
        break;
      }

      await sleep(retryDelayMs * (attempt + 1));
    }
  }

  const message = describeFetchError(lastError);
  const prefix = context ? `${context} başarısız: ` : "";
  throw new Error(`${prefix}${message}`);
}

async function requestReplicate<TOutput = unknown>(
  modelPath: string,
  input: Record<string, unknown>
): Promise<ReplicatePrediction<TOutput>> {
  const response = await fetchWithRetry(
    `${REPLICATE_API_BASE}/models/${modelPath}/predictions`,
    {
      context: "Replicate tahmin isteği",
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json; charset=utf-8",
          Authorization: `Token ${env.REPLICATE_API_TOKEN}`
        },
        body: JSON.stringify({ input })
      }
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Replicate request failed (${response.status}): ${errorBody}`);
  }

  let prediction: ReplicatePrediction<TOutput> = await response.json();

  while (prediction.status === "starting" || prediction.status === "processing") {
    await sleep(2000);
    const poll = await fetchWithRetry(prediction.urls.get, {
      context: "Replicate tahmin sorgusu",
      init: {
        headers: {
          Accept: "application/json; charset=utf-8",
          Authorization: `Token ${env.REPLICATE_API_TOKEN}`
        }
      }
    });

    if (!poll.ok) {
      const errorBody = await poll.text();
      throw new Error(`Replicate polling failed (${poll.status}): ${errorBody}`);
    }

    prediction = (await poll.json()) as ReplicatePrediction<TOutput>;
  }

  if (prediction.status !== "succeeded") {
    const message = typeof prediction.error === "string"
      ? prediction.error
      : prediction.error?.message;
    throw new Error(message ?? "Replicate prediction did not succeed");
  }

  return prediction;
}


function serializeToken(token: unknown): string {
  if (typeof token === "string") {
    return token;
  }
  if (token && typeof token === "object") {
    if ("text" in token && typeof (token as { text?: unknown }).text === "string") {
      return (token as { text: string }).text;
    }
    if ("token" in token && typeof (token as { token?: unknown }).token === "string") {
      return (token as { token: string }).token;
    }
    return `${token}`;
  }
  if (token === null || token === undefined) {
    return "";
  }
  return String(token);
}

function extractRawText(output: unknown): string | null {
  if (typeof output === "string") {
    return output;
  }

  if (Array.isArray(output)) {
    return output.map(serializeToken).join("");
  }

  if (output && typeof output === "object" && "text" in output) {
    return String((output as { text: unknown }).text);
  }

  return null;
}

function sanitizeGeneratedText(rawText: string): string {
  return rawText
    .normalize("NFC")
    .replace(/\p{Cf}/gu, "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

export async function generateImageName(prompt: string): Promise<string> {
  const prediction = await requestReplicate<string | string[] | null>("openai/gpt-5", {
    prompt,
    messages: [],
    verbosity: "medium",
    image_input: [],
    reasoning_effort: "minimal"
  });

  const rawText = extractRawText(prediction.output);

  if (!rawText) {
    throw new Error("Boş görsel adı üretildi");
  }

  const sanitized = sanitizeGeneratedText(rawText).replace(/["'`]/g, "");

  if (sanitized.length === 0) {
    throw new Error("Geçerli görsel adı elde edilemedi");
  }

  return sanitized;
}



export async function generateImageBuffer(prompt: string): Promise<{ buffer: Buffer; mimeType: string }>
{
  const prediction = await requestReplicate<string | string[]>("google/nano-banana", {
    prompt,
    image_input: [],
    aspect_ratio: "9:16",
    output_format: "jpg"
  });

  const output = prediction.output;
  const urls = Array.isArray(output) ? output : typeof output === "string" ? [output] : [];
  const imageUrl = urls.find((url) => typeof url === "string" && url.length > 0);

  if (!imageUrl) {
    throw new Error("Görsel çıktısı alınamadı");
  }

  const imageResponse = await fetchWithRetry(imageUrl, {
    context: "Replicate görsel indirimi",
    timeoutMs: 90_000
  });
  if (!imageResponse.ok) {
    throw new Error(`Görsel indirilemedi (${imageResponse.status})`);
  }

  const mimeType = imageResponse.headers.get("content-type") ?? "image/jpeg";
  const arrayBuffer = await imageResponse.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType
  };
}
