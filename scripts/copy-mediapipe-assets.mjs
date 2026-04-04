import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sourceDir = path.join(
    projectRoot,
    "node_modules",
    "@mediapipe",
    "selfie_segmentation",
);
const targetDir = path.join(
    projectRoot,
    "public",
    "vendor",
    "mediapipe",
    "selfie_segmentation",
);

const assetFiles = [
    "selfie_segmentation.binarypb",
    "selfie_segmentation.js",
    "selfie_segmentation.tflite",
    "selfie_segmentation_landscape.tflite",
    "selfie_segmentation_solution_simd_wasm_bin.data",
    "selfie_segmentation_solution_simd_wasm_bin.js",
    "selfie_segmentation_solution_simd_wasm_bin.wasm",
    "selfie_segmentation_solution_wasm_bin.js",
    "selfie_segmentation_solution_wasm_bin.wasm",
];

if (!fs.existsSync(sourceDir)) {
    throw new Error(`MediaPipe source assets not found at ${sourceDir}`);
}

fs.mkdirSync(targetDir, { recursive: true });

for (const assetFile of assetFiles) {
    const sourceFile = path.join(sourceDir, assetFile);
    const targetFile = path.join(targetDir, assetFile);

    if (!fs.existsSync(sourceFile)) {
        throw new Error(`Required MediaPipe asset is missing: ${sourceFile}`);
    }

    fs.copyFileSync(sourceFile, targetFile);
}

console.log(`Copied MediaPipe selfie segmentation assets to ${targetDir}`);
