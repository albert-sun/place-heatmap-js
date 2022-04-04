import { workerData, parentPort } from "worker_threads";
import { PNG } from "pngjs";

const boardSize = 1000;

// Given raw toString data from image request:
// - Parse image as PNG using PNG.sync.read
// - Return indexes of all non-transparent pixels
const [boardIndex, imageArrayBuffer] = workerData;
const rawImageBuffer = Buffer.from(imageArrayBuffer);
const imageData = PNG.sync.read(rawImageBuffer);
const pixelsBuffer = [...imageData.data]; 
// Iterate over manual pixel indexes instead of using "in" or "of" which is much slower
const boardX = boardIndex % 2;
const boardY = Math.floor(boardIndex / 2);
const nonTransparentIndexes: number[] = [];
for(let pixelIndex = 0; pixelIndex < boardSize * boardSize; pixelIndex++) {
    // Check whether alpha is non-transparent = modified
    // Index for alpha is (pixelIndex * 4) + 3
    if(pixelsBuffer[(pixelIndex * 4) + 3] !== 0) {
        // Convert indexes to board-level X and Y coordinates
        const xCoordinate = pixelIndex % boardSize;
        const yCoordinate = Math.floor(pixelIndex / boardSize);
        // Add to these coordinates and convert back to single-number index
        const totalXCoordinate = xCoordinate + (boardX * 1000);
        const totalYCoordinate = yCoordinate + (boardY * 1000);
        const totalPixelIndex = (totalYCoordinate * 1000) + totalXCoordinate;
        nonTransparentIndexes.push(totalPixelIndex);
    }
}
// Return board index and non transparent coordinates
parentPort?.postMessage(nonTransparentIndexes);