import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Image as ImageIcon,
  FlipHorizontal,
  FlipVertical,
  Minus,
  Plus,
  RotateCw,
  Star,
  X,
} from 'lucide-react';

export interface GalleryImage {
  id: string;
  src: string;
  title: string;
  description?: string;
  meta?: Array<{ label: string; value: string }>;
  isKeyImage?: boolean;
  viewPlane?: string | null;
}

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  images: GalleryImage[];
  initialIndex?: number;
}

export default function ImageGalleryModal({
  isOpen,
  onClose,
  title = 'Image Viewer',
  images,
  initialIndex = 0,
}: ImageGalleryModalProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [rotation, setRotation] = useState(0);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const hasImages = images.length > 0;
  const zoomMin = 0.5;
  const zoomMax = 4;
  const zoomStep = 0.25;

  const clampZoom = (value: number) =>
    Math.min(zoomMax, Math.max(zoomMin, value));

  useEffect(() => {
    if (isOpen) {
      if (!hasImages) {
        setActiveIndex(0);
        return;
      }
      setActiveIndex(Math.min(Math.max(initialIndex, 0), images.length - 1));
    }
  }, [isOpen, initialIndex, images.length, hasImages]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === '+' || event.key === '=') {
        setZoom((prev) => clampZoom(prev + zoomStep));
      }
      if (event.key === '-') {
        setZoom((prev) => clampZoom(prev - zoomStep));
      }
      if (event.key === '0') {
        setZoom(1);
      }
      if (event.key === 'ArrowLeft') {
        if (!hasImages) return;
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
      if (event.key === 'ArrowRight') {
        if (!hasImages) return;
        setActiveIndex((prev) => Math.min(prev + 1, images.length - 1));
      }
      if (event.key === 'Home') {
        if (!hasImages) return;
        setActiveIndex(0);
      }
      if (event.key === 'End') {
        if (!hasImages) return;
        setActiveIndex(images.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasImages, isOpen, images.length, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setZoom(1);
    setIsPanning(false);
    setFlipX(false);
    setFlipY(false);
    setRotation(0);
    dragStartRef.current = null;
    scheduleCenter();
  }, [activeIndex, isOpen]);

  useEffect(() => {
    setIsPanning(false);
    dragStartRef.current = null;
    scheduleCenter();
  }, [zoom]);

  useEffect(() => {
    if (!isOpen) return;
    scheduleCenter();
  }, [flipX, flipY, rotation, zoom, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const active = images[activeIndex];
    if (!active) return;
    const el = listRef.current?.querySelector(`[data-image-id="${active.id}"]`);
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, images, isOpen]);

  const activeImage = images[activeIndex];
  const countLabel = hasImages
    ? `${activeIndex + 1} / ${images.length}`
    : '0 / 0';

  const descriptionLines = useMemo(() => {
    if (!activeImage?.description) return [];
    return activeImage.description
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }, [activeImage]);

  const centerViewer = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const left = Math.max((viewer.scrollWidth - viewer.clientWidth) / 2, 0);
    const top = Math.max((viewer.scrollHeight - viewer.clientHeight) / 2, 0);
    viewer.scrollTo({ left, top });
  };

  const scheduleCenter = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => centerViewer());
    });
  };

  const resetView = () => {
    setZoom(1);
    setFlipX(false);
    setFlipY(false);
    setRotation(0);
    setIsPanning(false);
    dragStartRef.current = null;
    scheduleCenter();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <style>
        {`
          .viewer-scrollbar::-webkit-scrollbar {
            width: 12px;
            height: 12px;
          }
          .viewer-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.12);
            border-radius: 999px;
          }
          .viewer-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.6);
            border-radius: 999px;
            border: 2px solid rgba(0, 0, 0, 0.3);
          }
          .viewer-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.8);
          }
        `}
      </style>
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/90"
        onClick={onClose}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.25),_transparent_55%)]" />

      <div className="relative z-10 flex h-full w-full flex-col px-4 py-6">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">
                {title}
              </p>
              <p className="text-lg font-semibold text-white">
                {activeImage?.title || 'Select an image'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs text-white/80">
              {countLabel}
            </span>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-2 py-1 text-xs text-white backdrop-blur">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((prev) => clampZoom(prev - zoomStep))}
                  className="rounded-full bg-white/10 p-1 text-white hover:bg-white/20"
                  title="Zoom out"
                  disabled={!hasImages}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="min-w-[52px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((prev) => clampZoom(prev + zoomStep))}
                  className="rounded-full bg-white/10 p-1 text-white hover:bg-white/20"
                  title="Zoom in"
                  disabled={!hasImages}
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={resetView}
                  className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/20"
                  title="Reset view"
                  disabled={!hasImages}
                >
                  Reset
                </button>
              </div>
              <div className="h-4 w-px bg-white/20" />
              <button
                type="button"
                onClick={() => setFlipX((prev) => !prev)}
                className={`rounded-full p-1 text-white hover:bg-white/20 ${
                  flipX ? 'bg-white/20' : 'bg-white/10'
                }`}
                title="Flip horizontal"
                disabled={!hasImages}
              >
                <FlipHorizontal className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setFlipY((prev) => !prev)}
                className={`rounded-full p-1 text-white hover:bg-white/20 ${
                  flipY ? 'bg-white/20' : 'bg-white/10'
                }`}
                title="Flip vertical"
                disabled={!hasImages}
              >
                <FlipVertical className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className={`rounded-full p-1 text-white hover:bg-white/20 ${
                  rotation % 360 !== 0 ? 'bg-white/20' : 'bg-white/10'
                }`}
                title="Rotate 90 deg"
                disabled={!hasImages}
              >
                <RotateCw className="h-3 w-3" />
              </button>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mx-auto mt-6 grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-6 lg:grid-cols-[180px,1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-2 backdrop-blur">
            <div className="mb-3 flex items-center justify-between text-white/80">
              <p className="text-xs uppercase tracking-[0.2em]">Images</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (hasImages) setActiveIndex(0);
                  }}
                  className="rounded-lg bg-white/10 p-1 text-white hover:bg-white/20"
                  title="First image"
                  disabled={!hasImages}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    hasImages && setActiveIndex((prev) => Math.max(prev - 1, 0))
                  }
                  className="rounded-lg bg-white/10 p-1 text-white hover:bg-white/20"
                  title="Previous image"
                  disabled={!hasImages}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    hasImages &&
                    setActiveIndex((prev) =>
                      Math.min(prev + 1, images.length - 1),
                    )
                  }
                  className="rounded-lg bg-white/10 p-1 text-white hover:bg-white/20"
                  title="Next image"
                  disabled={!hasImages}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (hasImages) setActiveIndex(images.length - 1);
                  }}
                  className="rounded-lg bg-white/10 p-1 text-white hover:bg-white/20"
                  title="Last image"
                  disabled={!hasImages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              ref={listRef}
              className="max-h-[65vh] space-y-2 overflow-y-auto pr-1"
            >
              {hasImages ? (
                images.map((img, index) => (
                  <button
                    key={img.id}
                    type="button"
                    data-image-id={img.id}
                    onClick={() => setActiveIndex(index)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-2 py-2 text-left transition-colors ${
                      index === activeIndex
                        ? 'border-indigo-300 bg-white/20'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-900">
                      {img.src ? (
                        <img
                          src={img.src}
                          alt={img.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/40">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {img.title}
                      </p>
                      {img.viewPlane && (
                        <p className="text-xs text-white/70">
                          View plane: {img.viewPlane}
                        </p>
                      )}
                    </div>
                    {img.isKeyImage && (
                      <Star className="h-4 w-4 text-amber-300" />
                    )}
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/70">
                  No images available for this request.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="relative flex min-h-[62vh] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/60">
              {activeImage?.src ? (
                <div
                  ref={viewerRef}
                  className={`viewer-scrollbar h-full w-full overflow-scroll ${
                    zoom > 1
                      ? isPanning
                        ? 'cursor-grabbing'
                        : 'cursor-grab'
                      : 'cursor-default'
                  }`}
                  style={{
                    overflowX: 'scroll',
                    overflowY: 'scroll',
                    scrollbarWidth: 'auto',
                    scrollbarColor:
                      'rgba(255, 255, 255, 0.7) rgba(255, 255, 255, 0.15)',
                    scrollbarGutter: 'stable both-edges',
                    direction: 'ltr',
                  }}
                  onWheel={(event) => {
                    if (!event.ctrlKey && !event.metaKey) return;
                    event.preventDefault();
                    const direction = event.deltaY > 0 ? -1 : 1;
                    setZoom((prev) => clampZoom(prev + direction * zoomStep));
                  }}
                  onPointerDown={(event) => {
                    if (zoom <= 1) return;
                    const viewer = viewerRef.current;
                    if (!viewer) return;
                    setIsPanning(true);
                    dragStartRef.current = {
                      x: event.clientX,
                      y: event.clientY,
                      left: viewer.scrollLeft,
                      top: viewer.scrollTop,
                    };
                    viewer.setPointerCapture?.(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (!isPanning || !dragStartRef.current) return;
                    const viewer = viewerRef.current;
                    if (!viewer) return;
                    viewer.scrollLeft =
                      dragStartRef.current.left -
                      (event.clientX - dragStartRef.current.x);
                    viewer.scrollTop =
                      dragStartRef.current.top -
                      (event.clientY - dragStartRef.current.y);
                  }}
                  onPointerUp={(event) => {
                    const viewer = viewerRef.current;
                    if (viewer?.hasPointerCapture?.(event.pointerId)) {
                      viewer.releasePointerCapture(event.pointerId);
                    }
                    setIsPanning(false);
                    dragStartRef.current = null;
                  }}
                  onPointerLeave={(event) => {
                    const viewer = viewerRef.current;
                    if (viewer?.hasPointerCapture?.(event.pointerId)) {
                      viewer.releasePointerCapture(event.pointerId);
                    }
                    setIsPanning(false);
                    dragStartRef.current = null;
                  }}
                  onPointerCancel={(event) => {
                    const viewer = viewerRef.current;
                    if (viewer?.hasPointerCapture?.(event.pointerId)) {
                      viewer.releasePointerCapture(event.pointerId);
                    }
                    setIsPanning(false);
                    dragStartRef.current = null;
                  }}
                >
                  <div
                    className="flex min-h-full min-w-full items-center justify-center"
                    style={{
                      width: `${zoom > 1 ? zoom * 100 : 100}%`,
                      height: `${zoom > 1 ? zoom * 100 : 100}%`,
                    }}
                  >
                    <img
                      src={activeImage.src}
                      alt={activeImage.title}
                      className="max-h-none max-w-none object-contain transition-transform duration-200"
                      style={{
                        width: '100%',
                        height: '100%',
                        transform: `rotate(${rotation}deg) scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1}) scale(${zoom > 1 ? 1 : zoom})`,
                        transformOrigin: 'center',
                      }}
                      onLoad={scheduleCenter}
                      draggable={false}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-white/70">
                  <ImageIcon className="mb-2 h-12 w-12" />
                  <p>No preview available</p>
                </div>
              )}

              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between text-white">
                <button
                  type="button"
                  onClick={() =>
                    hasImages && setActiveIndex((prev) => Math.max(prev - 1, 0))
                  }
                  className="rounded-full bg-white/10 p-2 hover:bg-white/20"
                  title="Previous"
                  disabled={!hasImages}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    hasImages &&
                    setActiveIndex((prev) =>
                      Math.min(prev + 1, images.length - 1),
                    )
                  }
                  className="rounded-full bg-white/10 p-2 hover:bg-white/20"
                  title="Next"
                  disabled={!hasImages}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-white backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                    Image Details
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {activeImage?.title || 'Image'}
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Tip: Scroll or drag to pan when zoomed.
                  </p>
                </div>
                {activeImage?.src && (
                  <a
                    href={activeImage.src}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs text-white hover:bg-white/25"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open original
                  </a>
                )}
              </div>

              {descriptionLines.length > 0 && (
                <div className="mt-3 space-y-1 text-sm text-white/80">
                  {descriptionLines.map((line, idx) => (
                    <p key={`${line}-${idx}`}>{line}</p>
                  ))}
                </div>
              )}

              {activeImage?.meta && activeImage.meta.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeImage.meta.map((item) => (
                    <span
                      key={`${item.label}-${item.value}`}
                      className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80"
                    >
                      {item.label}: {item.value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
