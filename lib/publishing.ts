import { PageStatus } from "@prisma/client";

export type PublicationStateInput = {
  requestedStatus: PageStatus;
  publishAtRaw?: string | null;
  now?: Date;
};

export type PublicationStateResult =
  | {
      ok: true;
      status: PageStatus;
      publishAt: Date | null;
    }
  | {
      ok: false;
      message: string;
      fieldErrors: Record<string, string[]>;
    };

export function resolvePublicationState({
  requestedStatus,
  publishAtRaw,
  now = new Date()
}: PublicationStateInput): PublicationStateResult {
  const trimmed = publishAtRaw?.trim();

  if (!trimmed) {
    return {
      ok: true,
      status: requestedStatus,
      publishAt: null
    };
  }

  const publishAt = new Date(trimmed);
  if (Number.isNaN(publishAt.getTime())) {
    return {
      ok: false,
      message: "Yayın tarihi geçersiz.",
      fieldErrors: {
        publishAt: ["Geçerli bir tarih/saat giriniz."]
      }
    };
  }

  const isFuture = publishAt.getTime() > now.getTime();
  if (isFuture) {
    return {
      ok: true,
      status: PageStatus.DRAFT,
      publishAt
    };
  }

  if (requestedStatus === PageStatus.DRAFT) {
    return {
      ok: true,
      status: PageStatus.DRAFT,
      publishAt: null
    };
  }

  return {
    ok: true,
    status: PageStatus.PUBLISHED,
    publishAt: null
  };
}
