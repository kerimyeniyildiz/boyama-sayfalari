import { Buffer } from "node:buffer";
import { env } from "@/lib/env";

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

type ReplicatePrediction<TOutput = unknown> = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: TOutput;
  error?: { message?: string } | string | null;
  urls: {
    get: string;
  };
};

function getReplicateToken(): string {
  const token = env.REPLICATE_API_TOKEN;
  if (!token || token.trim().length === 0) {
    throw new Error("REPLICATE_API_TOKEN bulunamadı. AI görsel üretimi için env değerini tanımlayın.");
  }
  return token;
}

async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const MAX_THROTTLE_RETRIES = 5;
const DEFAULT_RETRY_AFTER_SECONDS = 10;
const RETRY_JITTER_MS = 500;

/**
 * Replicate'in 429 (Request was throttled) yanıtında döndürdüğü
 * `Retry-After` header'ını veya gövdedeki `retry_after` alanını
 * saniye cinsinden çözer. Bilinmeyen format için güvenli bir
 * varsayılana düşer.
 */
function parseRetryAfterSeconds(
  response: Response,
  body: string
): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const asNumber = Number(header);
    if (Number.isFinite(asNumber) && asNumber >= 0) {
      return asNumber;
    }
    const asDate = Date.parse(header);
    if (Number.isFinite(asDate)) {
      const diff = Math.ceil((asDate - Date.now()) / 1000);
      if (diff > 0) {
        return diff;
      }
    }
  }

  try {
    const parsed = JSON.parse(body) as { retry_after?: unknown };
    const fromBody = parsed?.retry_after;
    if (typeof fromBody === "number" && Number.isFinite(fromBody) && fromBody >= 0) {
      return fromBody;
    }
    if (typeof fromBody === "string") {
      const asNumber = Number(fromBody);
      if (Number.isFinite(asNumber) && asNumber >= 0) {
        return asNumber;
      }
    }
  } catch {
    // gövde JSON değil; varsayılana düşeriz
  }

  return DEFAULT_RETRY_AFTER_SECONDS;
}

type ReplicateFetchOptions = {
  /** 429 sonrası kaç kez otomatik yeniden denensin. */
  maxRetries?: number;
  /** Loglama için çağrı kaynağı. */
  label?: string;
};

/**
 * Replicate isteklerini 429 (throttle) aldığında otomatik olarak
 * Retry-After kadar bekleyerek yeniden dener. Diğer başarısız
 * durumlarda hemen hata fırlatır.
 */
async function fetchReplicateWithThrottleRetry(
  url: string,
  init: RequestInit,
  { maxRetries = MAX_THROTTLE_RETRIES, label = "Replicate request" }: ReplicateFetchOptions = {}
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(url, init);
    if (response.status !== 429) {
      return response;
    }

    if (attempt === maxRetries) {
      const body = await response.text();
      throw new Error(`${label} failed (429): ${body}`);
    }

    const body = await response.clone().text();
    const retryAfterSeconds = parseRetryAfterSeconds(response, body);
    console.warn(
      `Replicate throttled (${label}, attempt ${attempt + 1}/${maxRetries}); ${retryAfterSeconds}s sonra yeniden denenecek.`
    );
    await sleep(retryAfterSeconds * 1000 + RETRY_JITTER_MS);
  }

  // teorik olarak buraya düşmüyoruz ama TS'yi memnun etmek için:
  throw new Error(`${label} failed after ${maxRetries} retries`);
}

async function requestReplicate<TOutput = unknown>(
  modelPath: string,
  input: Record<string, unknown>
): Promise<ReplicatePrediction<TOutput>> {
  const token = getReplicateToken();
  const response = await fetchReplicateWithThrottleRetry(
    `${REPLICATE_API_BASE}/models/${modelPath}/predictions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json; charset=utf-8",
        Authorization: `Token ${token}`
      },
      body: JSON.stringify({ input })
    },
    { label: `Replicate create prediction (${modelPath})` }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Replicate request failed (${response.status}): ${errorBody}`);
  }

  let prediction: ReplicatePrediction<TOutput> = await response.json();

  while (prediction.status === "starting" || prediction.status === "processing") {
    await sleep(2000);
    const poll = await fetchReplicateWithThrottleRetry(
      prediction.urls.get,
      {
        headers: {
          "Accept": "application/json; charset=utf-8",
          Authorization: `Token ${token}`
        }
      },
      { label: `Replicate poll (${modelPath})` }
    );

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
  const sanitized = (await generateTextWithReplicate(prompt)).replace(/["'`]/g, "");

  if (sanitized.length === 0) {
    throw new Error("Geçerli görsel adı elde edilemedi");
  }

  return sanitized;
}

export async function generateTextWithReplicate(prompt: string): Promise<string> {
  const prediction = await requestReplicate<string | string[] | null>("google/gemini-3-flash", {
    prompt,
    images: [],
    temperature: 0.7,
    top_p: 0.95,
    thinking_level: "low",
    max_output_tokens: 10000
  });

  const rawText = extractRawText(prediction.output);

  if (!rawText) {
    throw new Error("Boş metin üretildi");
  }

  const sanitized = sanitizeGeneratedText(rawText);

  if (sanitized.length === 0) {
    throw new Error("Geçerli metin elde edilemedi");
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

  const imageResponse = await fetch(imageUrl);
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
