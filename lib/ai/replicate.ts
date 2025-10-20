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

async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestReplicate<TOutput = unknown>(
  modelPath: string,
  input: Record<string, unknown>
): Promise<ReplicatePrediction<TOutput>> {
  const response = await fetch(`${REPLICATE_API_BASE}/models/${modelPath}/predictions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Accept": "application/json; charset=utf-8",
      Authorization: `Token ${env.REPLICATE_API_TOKEN}`
    },
    body: JSON.stringify({ input })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Replicate request failed (${response.status}): ${errorBody}`);
  }

  let prediction: ReplicatePrediction<TOutput> = await response.json();

  while (prediction.status === "starting" || prediction.status === "processing") {
    await sleep(2000);
    const poll = await fetch(prediction.urls.get, {
      headers: {
        "Accept": "application/json; charset=utf-8",
        Authorization: `Token ${env.REPLICATE_API_TOKEN}`
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

export async function generateImageName(prompt: string): Promise<string> {
  const prediction = await requestReplicate<string | string[] | null>("openai/gpt-5", {
    prompt,
    messages: [],
    verbosity: "medium",
    image_input: [],
    reasoning_effort: "minimal"
  });

  const output = prediction.output;
  let rawText: string | null = null;

  if (typeof output === "string") {
    rawText = output;
  } else if (Array.isArray(output)) {
    rawText = output.join(" ");
  } else if (output && typeof output === "object" && "text" in output) {
    rawText = String((output as { text: unknown }).text);
  }

  if (!rawText) {
    throw new Error("Boş görsel adı üretildi");
  }

  // Replicate API bazen Türkçe karakterlerden önce/sonra ekstra boşluk ekliyor
  // Örn: "Do ğ um" yerine "Doğum" olmalı
  // Türkçe karakterler: çÇğĞıİöÖşŞüÜ
  const turkishChars = '[çÇğĞıİöÖşŞüÜ]';

  const sanitized = rawText
    .normalize("NFC")
    .replace(/[\r\n\t]/g, " ")
    .replace(/["'`]/g, "")
    // Türkçe karakterlerden önceki boşluğu kaldır (örn: "Do ğum" → "Doğum")
    .replace(new RegExp(`\\s+(?=${turkishChars})`, 'g'), "")
    // Türkçe karakterlerden sonraki boşluğu kaldır (örn: "ğ um" → "ğum")
    .replace(new RegExp(`(${turkishChars})\\s+`, 'g'), "$1")
    // Çift boşlukları tekle indir
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");

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
