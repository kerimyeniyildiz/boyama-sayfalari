"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowDownToLine, FileDown, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type ColoringPageCardProps = {
  slug: string;
  title: string;
  imageSrc: string;
  imageBlur: string;
  lightboxSrc: string;
  optimized: boolean;
};

export function ColoringPageCard({
  slug,
  title,
  imageSrc,
  imageBlur,
  lightboxSrc,
  optimized
}: ColoringPageCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = () => {
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  return (
    <>
      <div className="flex flex-col gap-2 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-card">
        <button
          onClick={openLightbox}
          className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-brand-light cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <Image
            src={imageSrc}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-contain"
            placeholder="blur"
            blurDataURL={imageBlur}
            unoptimized={!optimized}
          />
        </button>
        <div className="flex flex-col gap-2">
          <h3 className="text-center text-base font-semibold text-brand-dark">
            {title}
          </h3>
          <div className="flex items-center justify-center">
            <Button
              size="sm"
              onClick={openLightbox}
              className="flex items-center gap-2"
            >
              <ArrowDownToLine className="h-4 w-4" />
              PDF indir
            </Button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Kapat"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="flex w-full max-w-[min(90vw,60rem)] flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mx-auto aspect-[3/4] w-full max-h-[85vh] overflow-hidden rounded-lg bg-white">
              <Image
                src={lightboxSrc}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 70vw"
                className="object-contain"
                placeholder="blur"
                blurDataURL={imageBlur}
                unoptimized={!optimized}
              />
            </div>
            <Button asChild size="lg" className="w-full">
              <Link
                href={`/api/download/${slug}` as Route}
                className="flex items-center justify-center gap-2"
              >
                <FileDown className="h-5 w-5" />
                Boyama Sayfasını İndir
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
