"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/Button";

type BodySegmentationModule = typeof import("@tensorflow-models/body-segmentation");
type AiBodySegmenter = import("@tensorflow-models/body-segmentation").BodySegmenter;

const EDITOR_CANVAS_SIZE = 600;
const MAX_STUDENT_PHOTO_BYTES = 5 * 1024 * 1024;
const DEFAULT_QUALITY = 0.82;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const POSITION_NUDGE_STEP = 24;
const DEFAULT_FOREGROUND_THRESHOLD = 0.62;
const DEFAULT_BACKGROUND_SENSITIVITY = Math.round(DEFAULT_FOREGROUND_THRESHOLD * 100);
const DEFAULT_BACKGROUND_BLUR = 14;
const DEFAULT_EDGE_BLUR = 6;
const MEDIAPIPE_ASSET_PATH = "/vendor/mediapipe/selfie_segmentation";

type BackgroundEffect = "original" | "blur" | "remove";

let bodySegmentationModulePromise: Promise<BodySegmentationModule> | null = null;
let aiBodySegmenterPromise: Promise<AiBodySegmenter> | null = null;

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function normalizeRotation(rotation: number) {
    const normalized = rotation % 360;
    return normalized < 0 ? normalized + 360 : normalized;
}

function getRotatedDimensions(width: number, height: number, rotation: number) {
    const normalized = normalizeRotation(rotation);
    if (normalized === 90 || normalized === 270) {
        return { width: height, height: width };
    }

    return { width, height };
}

function getCropBounds(width: number, height: number, rotation: number, zoom: number) {
    const rotated = getRotatedDimensions(width, height, rotation);
    const baseScale = Math.max(
        EDITOR_CANVAS_SIZE / rotated.width,
        EDITOR_CANVAS_SIZE / rotated.height,
    );
    const scale = baseScale * zoom;

    return {
        scale,
        maxOffsetX: Math.max(0, (rotated.width * scale - EDITOR_CANVAS_SIZE) / 2),
        maxOffsetY: Math.max(0, (rotated.height * scale - EDITOR_CANVAS_SIZE) / 2),
    };
}

function formatBytes(bytes: number) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const units = ["KB", "MB", "GB"];
    let value = bytes / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    const decimals = value >= 10 ? 0 : 1;
    return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function createEditedFileName(originalName: string) {
    const baseName = originalName.replace(/\.[^.]+$/, "").trim();
    return `${baseName || "student-photo"}-edited.jpg`;
}

async function getBodySegmentationModule() {
    if (!bodySegmentationModulePromise) {
        bodySegmentationModulePromise = import("@tensorflow-models/body-segmentation");
    }

    return bodySegmentationModulePromise;
}

async function getAiBodySegmenter() {
    if (!aiBodySegmenterPromise) {
        aiBodySegmenterPromise = (async () => {
            const bodySegmentation = await getBodySegmentationModule();
            return bodySegmentation.createSegmenter(
                bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
                {
                    runtime: "mediapipe",
                    solutionPath: MEDIAPIPE_ASSET_PATH,
                    modelType: "general",
                },
            );
        })();
    }

    try {
        return await aiBodySegmenterPromise;
    } catch (error) {
        aiBodySegmenterPromise = null;
        throw error;
    }
}

function drawEditedImage(
    context: CanvasRenderingContext2D,
    imageElement: HTMLImageElement,
    imageSize: { width: number; height: number },
    cropBounds: { scale: number; maxOffsetX: number; maxOffsetY: number },
    rotation: number,
    offsetX: number,
    offsetY: number,
) {
    context.clearRect(0, 0, EDITOR_CANVAS_SIZE, EDITOR_CANVAS_SIZE);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, EDITOR_CANVAS_SIZE, EDITOR_CANVAS_SIZE);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.save();
    context.translate(
        EDITOR_CANVAS_SIZE / 2 + offsetX,
        EDITOR_CANVAS_SIZE / 2 + offsetY,
    );
    context.rotate((rotation * Math.PI) / 180);
    context.scale(cropBounds.scale, cropBounds.scale);
    context.drawImage(
        imageElement,
        -imageSize.width / 2,
        -imageSize.height / 2,
        imageSize.width,
        imageSize.height,
    );
    context.restore();
}

function drawRemovedBackgroundEffect(
    destinationContext: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement,
    maskImage: ImageData,
) {
    const ownerDocument = sourceCanvas.ownerDocument;
    const maskCanvas = ownerDocument.createElement("canvas");
    maskCanvas.width = EDITOR_CANVAS_SIZE;
    maskCanvas.height = EDITOR_CANVAS_SIZE;
    const maskContext = maskCanvas.getContext("2d");
    if (!maskContext) {
        throw new Error("Unable to prepare the AI background mask.");
    }

    maskContext.putImageData(maskImage, 0, 0);

    const softenedMaskCanvas = ownerDocument.createElement("canvas");
    softenedMaskCanvas.width = EDITOR_CANVAS_SIZE;
    softenedMaskCanvas.height = EDITOR_CANVAS_SIZE;
    const softenedMaskContext = softenedMaskCanvas.getContext("2d");
    if (!softenedMaskContext) {
        throw new Error("Unable to soften the AI background mask.");
    }

    softenedMaskContext.filter = `blur(${DEFAULT_EDGE_BLUR}px)`;
    softenedMaskContext.drawImage(maskCanvas, 0, 0);

    const personCanvas = ownerDocument.createElement("canvas");
    personCanvas.width = EDITOR_CANVAS_SIZE;
    personCanvas.height = EDITOR_CANVAS_SIZE;
    const personContext = personCanvas.getContext("2d");
    if (!personContext) {
        throw new Error("Unable to prepare the subject cutout.");
    }

    personContext.drawImage(sourceCanvas, 0, 0);
    personContext.globalCompositeOperation = "destination-in";
    personContext.drawImage(softenedMaskCanvas, 0, 0);
    personContext.globalCompositeOperation = "source-over";

    destinationContext.clearRect(0, 0, EDITOR_CANVAS_SIZE, EDITOR_CANVAS_SIZE);
    destinationContext.fillStyle = "#ffffff";
    destinationContext.fillRect(0, 0, EDITOR_CANVAS_SIZE, EDITOR_CANVAS_SIZE);
    destinationContext.drawImage(personCanvas, 0, 0);
}

interface StudentPhotoEditorProps {
    file: File | null;
    isOpen: boolean;
    isSaving?: boolean;
    studentName: string;
    onClose: () => void;
    onDone: (file: File) => Promise<void> | void;
}

export function StudentPhotoEditor({
    file,
    isOpen,
    isSaving = false,
    studentName,
    onClose,
    onDone,
}: StudentPhotoEditorProps) {
    const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const dragStateRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        startOffsetX: number;
        startOffsetY: number;
    } | null>(null);
    const renderJobRef = useRef(0);

    const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
    const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
    const [zoom, setZoom] = useState(MIN_ZOOM);
    const [rotation, setRotation] = useState(0);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [quality, setQuality] = useState(DEFAULT_QUALITY);
    const [backgroundEffect, setBackgroundEffect] = useState<BackgroundEffect>("original");
    const [backgroundSensitivity, setBackgroundSensitivity] = useState(DEFAULT_BACKGROUND_SENSITIVITY);
    const [backgroundBlur, setBackgroundBlur] = useState(DEFAULT_BACKGROUND_BLUR);
    const [editedBlob, setEditedBlob] = useState<Blob | null>(null);
    const [loadingImage, setLoadingImage] = useState(false);
    const [loadingAiModel, setLoadingAiModel] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cropBounds = useMemo(() => {
        if (!imageSize) {
            return null;
        }

        return getCropBounds(imageSize.width, imageSize.height, rotation, zoom);
    }, [imageSize, rotation, zoom]);

    useEffect(() => {
        if (!isOpen || !file) {
            setImageElement(null);
            setImageSize(null);
            setEditedBlob(null);
            setError(null);
            setLoadingImage(false);
            setLoadingAiModel(false);
            setProcessing(false);
            setIsDragging(false);
            dragStateRef.current = null;
            return;
        }

        let cancelled = false;
        const objectUrl = URL.createObjectURL(file);

        setLoadingImage(true);
        setLoadingAiModel(false);
        setProcessing(false);
        setEditedBlob(null);
        setError(null);
        setZoom(MIN_ZOOM);
        setRotation(0);
        setOffsetX(0);
        setOffsetY(0);
        setQuality(DEFAULT_QUALITY);
        setBackgroundEffect("original");
        setBackgroundSensitivity(DEFAULT_BACKGROUND_SENSITIVITY);
        setBackgroundBlur(DEFAULT_BACKGROUND_BLUR);

        const nextImage = new window.Image();
        nextImage.onload = () => {
            if (cancelled) {
                return;
            }

            setImageElement(nextImage);
            setImageSize({
                width: nextImage.naturalWidth,
                height: nextImage.naturalHeight,
            });
            setLoadingImage(false);
        };
        nextImage.onerror = () => {
            if (cancelled) {
                return;
            }

            setError("The selected file could not be opened as an image.");
            setImageElement(null);
            setImageSize(null);
            setLoadingImage(false);
        };
        nextImage.src = objectUrl;

        return () => {
            cancelled = true;
            URL.revokeObjectURL(objectUrl);
        };
    }, [file, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isSaving) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, isSaving, onClose]);

    useEffect(() => {
        if (!cropBounds) {
            return;
        }

        setOffsetX((current) => clamp(current, -cropBounds.maxOffsetX, cropBounds.maxOffsetX));
        setOffsetY((current) => clamp(current, -cropBounds.maxOffsetY, cropBounds.maxOffsetY));
    }, [cropBounds]);

    useEffect(() => {
        if (!isOpen || !imageElement || !imageSize) {
            return;
        }

        const canvas = previewCanvasRef.current;
        if (!canvas) {
            return;
        }

        const context = canvas.getContext("2d");
        if (!context || !cropBounds) {
            return;
        }

        const ownerDocument = canvas.ownerDocument;
        const sourceCanvas = ownerDocument.createElement("canvas");
        sourceCanvas.width = EDITOR_CANVAS_SIZE;
        sourceCanvas.height = EDITOR_CANVAS_SIZE;
        const sourceContext = sourceCanvas.getContext("2d");
        if (!sourceContext) {
            setProcessing(false);
            setEditedBlob(null);
            setError("Unable to prepare the image editor.");
            return;
        }

        drawEditedImage(
            sourceContext,
            imageElement,
            imageSize,
            cropBounds,
            rotation,
            offsetX,
            offsetY,
        );

        const jobId = renderJobRef.current + 1;
        renderJobRef.current = jobId;
        setProcessing(true);
        let cancelled = false;

        const renderPreview = async () => {
            try {
                if (backgroundEffect === "original") {
                    setLoadingAiModel(false);
                    context.clearRect(0, 0, EDITOR_CANVAS_SIZE, EDITOR_CANVAS_SIZE);
                    context.fillStyle = "#ffffff";
                    context.fillRect(0, 0, EDITOR_CANVAS_SIZE, EDITOR_CANVAS_SIZE);
                    context.drawImage(sourceCanvas, 0, 0);
                } else {
                    setLoadingAiModel(true);
                    const bodySegmentation = await getBodySegmentationModule();
                    const segmenter = await getAiBodySegmenter();

                    if (cancelled || renderJobRef.current !== jobId) {
                        return;
                    }

                    const segmentations = await segmenter.segmentPeople(sourceCanvas, {
                        flipHorizontal: false,
                    });

                    if (cancelled || renderJobRef.current !== jobId) {
                        return;
                    }

                    if (!segmentations.length) {
                        throw new Error("AI_NO_PERSON_DETECTED");
                    }

                    const foregroundThreshold = backgroundSensitivity / 100;

                    if (backgroundEffect === "blur") {
                        await bodySegmentation.drawBokehEffect(
                            canvas,
                            sourceCanvas,
                            segmentations,
                            foregroundThreshold,
                            backgroundBlur,
                            DEFAULT_EDGE_BLUR,
                            false,
                        );
                    } else {
                        const maskImage = await bodySegmentation.toBinaryMask(
                            segmentations,
                            { r: 255, g: 255, b: 255, a: 255 },
                            { r: 0, g: 0, b: 0, a: 0 },
                            false,
                            foregroundThreshold,
                        );

                        if (cancelled || renderJobRef.current !== jobId) {
                            return;
                        }

                        drawRemovedBackgroundEffect(context, sourceCanvas, maskImage);
                    }
                }

                if (cancelled || renderJobRef.current !== jobId) {
                    return;
                }

                const blob = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob(resolve, "image/jpeg", quality);
                });

                if (cancelled || renderJobRef.current !== jobId) {
                    return;
                }

                if (!blob) {
                    setEditedBlob(null);
                    setError("Unable to prepare the edited image.");
                    return;
                }

                setError(null);
                setEditedBlob(blob);
            } catch (renderError) {
                if (cancelled || renderJobRef.current !== jobId) {
                    return;
                }

                setEditedBlob(null);
                if (
                    renderError instanceof Error &&
                    renderError.message === "AI_NO_PERSON_DETECTED"
                ) {
                    setError("AI could not detect a clear person in this photo. Adjust the crop or switch back to Original.");
                    return;
                }

                setError(
                    backgroundEffect === "original"
                        ? "Unable to prepare the edited image."
                        : "AI background editing is unavailable right now. Try Original or retry.",
                );
            } finally {
                if (!cancelled && renderJobRef.current === jobId) {
                    setLoadingAiModel(false);
                    setProcessing(false);
                }
            }
        };

        void renderPreview();

        return () => {
            cancelled = true;
        };
    }, [
        cropBounds,
        imageElement,
        imageSize,
        isOpen,
        backgroundBlur,
        backgroundEffect,
        backgroundSensitivity,
        offsetX,
        offsetY,
        quality,
        rotation,
    ]);

    if (!isOpen || !file) {
        return null;
    }

    const afterSize = editedBlob?.size ?? 0;
    const isEditedTooLarge = Boolean(editedBlob && afterSize > MAX_STUDENT_PHOTO_BYTES);
    const sizeDelta = editedBlob ? editedBlob.size - file.size : 0;
    const horizontalPositionValue = cropBounds?.maxOffsetX
        ? Math.round((offsetX / cropBounds.maxOffsetX) * 100)
        : 0;
    const verticalPositionValue = cropBounds?.maxOffsetY
        ? Math.round((offsetY / cropBounds.maxOffsetY) * 100)
        : 0;
    const controlsDisabled = isSaving || loadingImage || (Boolean(error) && backgroundEffect === "original");
    const backgroundEffectLabel = backgroundEffect === "original"
        ? "Original"
        : backgroundEffect === "blur"
            ? "Blurred"
            : "Removed";

    const clampOffsets = (nextOffsetX: number, nextOffsetY: number) => {
        if (!cropBounds) {
            return { x: 0, y: 0 };
        }

        return {
            x: clamp(nextOffsetX, -cropBounds.maxOffsetX, cropBounds.maxOffsetX),
            y: clamp(nextOffsetY, -cropBounds.maxOffsetY, cropBounds.maxOffsetY),
        };
    };

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!cropBounds || controlsDisabled) {
            return;
        }

        dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startOffsetX: offsetX,
            startOffsetY: offsetY,
        };
        setIsDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const activeDrag = dragStateRef.current;
        if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
            return;
        }

        const nextOffsets = clampOffsets(
            activeDrag.startOffsetX + (event.clientX - activeDrag.startX),
            activeDrag.startOffsetY + (event.clientY - activeDrag.startY),
        );

        setOffsetX(nextOffsets.x);
        setOffsetY(nextOffsets.y);
    };

    const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
        const activeDrag = dragStateRef.current;
        if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
            return;
        }

        dragStateRef.current = null;
        setIsDragging(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    const handleRotate = (nextRotation: number) => {
        setRotation((current) => normalizeRotation(current + nextRotation));
    };

    const handlePositionChange = (axis: "x" | "y", nextPercent: number) => {
        if (!cropBounds) {
            return;
        }

        if (axis === "x") {
            setOffsetX(cropBounds.maxOffsetX * (nextPercent / 100));
            return;
        }

        setOffsetY(cropBounds.maxOffsetY * (nextPercent / 100));
    };

    const handleNudge = (deltaX: number, deltaY: number) => {
        const nextOffsets = clampOffsets(offsetX + deltaX, offsetY + deltaY);
        setOffsetX(nextOffsets.x);
        setOffsetY(nextOffsets.y);
    };

    const handleRecenterPosition = () => {
        setOffsetX(0);
        setOffsetY(0);
    };

    const handleReset = () => {
        setZoom(MIN_ZOOM);
        setRotation(0);
        setOffsetX(0);
        setOffsetY(0);
        setQuality(DEFAULT_QUALITY);
        setBackgroundEffect("original");
        setBackgroundSensitivity(DEFAULT_BACKGROUND_SENSITIVITY);
        setBackgroundBlur(DEFAULT_BACKGROUND_BLUR);
    };

    const handleDone = async () => {
        if (!editedBlob || isSaving || isEditedTooLarge) {
            return;
        }

        const editedFile = new File(
            [editedBlob],
            createEditedFileName(file.name),
            { type: "image/jpeg", lastModified: Date.now() },
        );

        await onDone(editedFile);
    };

    return (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/35 p-3 sm:p-4 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center">
                <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-[58rem] flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl animate-scaleIn">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-5 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Student photo editor
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-900">
                            {studentName}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Crop by dragging the image, then use AI background tools, rotation, and compression before upload.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Close
                    </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(300px,0.88fr)]">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <div
                            className={`relative mx-auto w-full max-w-[300px] overflow-hidden rounded-[26px] border border-slate-200 bg-slate-900/95 shadow-inner ${
                                isDragging ? "cursor-grabbing" : "cursor-grab"
                            }`}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={stopDragging}
                            onPointerCancel={stopDragging}
                            style={{ touchAction: "none" }}
                        >
                            <canvas
                                ref={previewCanvasRef}
                                width={EDITOR_CANVAS_SIZE}
                                height={EDITOR_CANVAS_SIZE}
                                className="block h-auto w-full bg-slate-100"
                            />
                            <div className="pointer-events-none absolute inset-4 rounded-[22px] border border-white/75 shadow-[0_0_0_999px_rgba(15,23,42,0.16)]" />
                            <div className="pointer-events-none absolute inset-[44px] rounded-full border border-dashed border-white/85" />

                            {(loadingImage || processing) && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/35 text-white">
                                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    <p className="mt-3 text-sm font-medium">
                                        {loadingImage
                                            ? "Preparing image..."
                                            : loadingAiModel
                                                ? "Loading AI portrait model..."
                                                : backgroundEffect === "original"
                                                    ? "Refreshing preview..."
                                                    : "Applying AI background..."}
                                    </p>
                                </div>
                            )}

                            {error && !loadingImage && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 px-6 text-center text-sm font-medium text-white">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Reposition</p>
                                    <p className="text-xs text-slate-500">Drag the image or use the controls for fine adjustment.</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={controlsDisabled}
                                    onClick={handleRecenterPosition}
                                >
                                    Center
                                </Button>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                                        <span>Horizontal</span>
                                        <span>{horizontalPositionValue}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={-100}
                                        max={100}
                                        step={1}
                                        value={horizontalPositionValue}
                                        disabled={controlsDisabled || !cropBounds || cropBounds.maxOffsetX === 0}
                                        onChange={(event) => handlePositionChange("x", Number(event.target.value))}
                                        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                                        <span>Vertical</span>
                                        <span>{verticalPositionValue}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={-100}
                                        max={100}
                                        step={1}
                                        value={verticalPositionValue}
                                        disabled={controlsDisabled || !cropBounds || cropBounds.maxOffsetY === 0}
                                        onChange={(event) => handlePositionChange("y", Number(event.target.value))}
                                        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2 sm:col-span-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        disabled={controlsDisabled}
                                        onClick={() => handleNudge(-POSITION_NUDGE_STEP, 0)}
                                    >
                                        Left
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        disabled={controlsDisabled}
                                        onClick={() => handleNudge(POSITION_NUDGE_STEP, 0)}
                                    >
                                        Right
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        disabled={controlsDisabled}
                                        onClick={() => handleNudge(0, -POSITION_NUDGE_STEP)}
                                    >
                                        Up
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        disabled={controlsDisabled}
                                        onClick={() => handleNudge(0, POSITION_NUDGE_STEP)}
                                    >
                                        Down
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                            <span>Drag photo to reposition the crop.</span>
                            <span>Output: 600 x 600 JPG</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Before edit
                                </p>
                                <p className="mt-1.5 text-base font-semibold text-slate-900">
                                    {formatBytes(file.size)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {imageSize ? `${imageSize.width} x ${imageSize.height}` : "Loading dimensions..."}
                                </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-blue-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                                    After edit
                                </p>
                                <p className="mt-1.5 text-base font-semibold text-slate-900">
                                    {editedBlob ? formatBytes(afterSize) : "Preparing..."}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    600 x 600 JPG
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Crop and zoom</p>
                                    <p className="text-xs text-slate-500">Increase zoom for a tighter crop.</p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    {zoom.toFixed(2)}x
                                </span>
                            </div>
                            <input
                                type="range"
                                min={MIN_ZOOM}
                                max={MAX_ZOOM}
                                step={0.01}
                                value={zoom}
                                disabled={controlsDisabled}
                                onChange={(event) => setZoom(Number(event.target.value))}
                                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
                            />
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Background</p>
                                    <p className="text-xs text-slate-500">AI portrait segmentation for clean blur or white-background removal.</p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    {backgroundEffectLabel}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant={backgroundEffect === "original" ? "primary" : "secondary"}
                                    size="sm"
                                    disabled={isSaving || loadingImage}
                                    onClick={() => setBackgroundEffect("original")}
                                >
                                    Original
                                </Button>
                                <Button
                                    type="button"
                                    variant={backgroundEffect === "blur" ? "primary" : "secondary"}
                                    size="sm"
                                    disabled={isSaving || loadingImage}
                                    onClick={() => setBackgroundEffect("blur")}
                                >
                                    Blur background
                                </Button>
                                <Button
                                    type="button"
                                    variant={backgroundEffect === "remove" ? "primary" : "secondary"}
                                    size="sm"
                                    disabled={isSaving || loadingImage}
                                    onClick={() => setBackgroundEffect("remove")}
                                >
                                    Remove background
                                </Button>
                            </div>
                            {backgroundEffect !== "original" && (
                                <div className="mt-3 space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                                            <span>AI subject threshold</span>
                                            <span>{backgroundSensitivity}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={30}
                                            max={90}
                                            step={1}
                                            value={backgroundSensitivity}
                                            disabled={isSaving || loadingImage}
                                            onChange={(event) => setBackgroundSensitivity(Number(event.target.value))}
                                            className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
                                        />
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            Increase this to cut more background away. Reduce it if the model trims the student too aggressively.
                                        </p>
                                    </div>
                                    {backgroundEffect === "blur" && (
                                        <div>
                                            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                                                <span>Blur strength</span>
                                                <span>{backgroundBlur}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={6}
                                                max={24}
                                                step={1}
                                                value={backgroundBlur}
                                                disabled={isSaving || loadingImage}
                                                onChange={(event) => setBackgroundBlur(Number(event.target.value))}
                                                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Rotate</p>
                                    <p className="text-xs text-slate-500">Turn the image in 90-degree steps.</p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    {normalizeRotation(rotation)} deg
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    disabled={controlsDisabled}
                                    onClick={() => handleRotate(-90)}
                                >
                                    Rotate left
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    disabled={controlsDisabled}
                                    onClick={() => handleRotate(90)}
                                >
                                    Rotate right
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={isSaving || loadingImage}
                                    onClick={handleReset}
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Compression</p>
                                    <p className="text-xs text-slate-500">Lower quality gives a smaller upload size.</p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    {Math.round(quality * 100)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0.4}
                                max={1}
                                step={0.01}
                                value={quality}
                                disabled={controlsDisabled}
                                onChange={(event) => setQuality(Number(event.target.value))}
                                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
                            />
                            <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                {editedBlob ? (
                                    sizeDelta <= 0
                                        ? `${formatBytes(Math.abs(sizeDelta))} smaller than the original file.`
                                        : `${formatBytes(sizeDelta)} larger than the original file.`
                                ) : (
                                    "Edited size will appear once the preview is ready."
                                )}
                            </div>
                            {isEditedTooLarge && (
                                <p className="mt-3 text-xs font-medium text-red-600">
                                    The edited image is still above the 5 MB upload limit. Reduce zoom or compression quality before uploading.
                                </p>
                            )}
                        </div>

                    </div>
                </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleDone}
                        isLoading={isSaving}
                        disabled={loadingImage || processing || Boolean(error) || !editedBlob || isEditedTooLarge}
                    >
                        Done and upload
                    </Button>
                </div>
            </div>
            </div>
        </div>
    );
}
