"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cross_fetch_1 = require("cross-fetch");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const worker_threads_1 = require("worker_threads");
const ws_1 = require("ws");
const utilities_1 = require("./utilities");
const clientID = "";
const secretKey = "";
const username = "";
const password = "";
// Periodically retrieve fresh access token from Reddit through API integration
let accessToken = "";
async function refreshAccessRoutine(clientID, secretKey, username, password) {
    // POST access token endpoint with client ID and secret key Basic authorization
    const authorizationValue = `Basic ${btoa(`${clientID}:${secretKey}`)}`;
    const requestData = `grant_type=password&username=${username}&password=${password}`;
    const response = await (0, cross_fetch_1.fetch)("https://ssl.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36",
            "Authorization": authorizationValue, // Base64-encoded
        },
        body: requestData,
    });
    // Parse response and check for errors:
    const parsed = await response.json();
    if (parsed["error"] === 401) {
        // Invalid clientID/secret combination
        (0, utilities_1.consoleTimestamp)("/!\\ Error updating access token: invalid clientID/secret");
        throw new Error("invalid clientID/secret");
    }
    else if (parsed["error"] === "invalid_grant") {
        // Invalid username or password
        (0, utilities_1.consoleTimestamp)("/!\\ Error updating access token: invalid username/password");
        throw new Error("invalid username/password");
    }
    // Parse the access token and spawn another asynchronous timeout to refresh (at 90%)
    accessToken = parsed["access_token"];
    const expiration = parsed["expires_in"] * 1000;
    setTimeout(() => { refreshAccessRoutine(clientID, secretKey, username, password); }, expiration);
    if (socket !== undefined) {
        socket.close();
    } // Close websocket before re-initializing
    await setupUpdateSocket();
    (0, utilities_1.consoleTimestamp)(`Successfully updated access token: ${accessToken}`);
}
const startingTimestamp = 1648828800000;
const allModifications = function () {
    const modificationsData = (0, fs_1.readFileSync)("heatmap.json").toString();
    const parsedModifications = JSON.parse(modificationsData);
    return parsedModifications;
}();
setInterval(async () => {
    await (0, promises_1.writeFile)("heatmap.json", JSON.stringify(allModifications));
}, 1000); // Write data to file every second
function processPixelIndexes(pixelIndexes, timestamp) {
    // Calculate number of minutes since beginning (rounding down) and store accordingly
    const timestampDifference = timestamp - startingTimestamp;
    const minutesPassed = Math.floor(timestampDifference / 60 / 1000);
    // Retrieve minutely modifications for minutes, create if doesn't exist
    let minutelyModifications = allModifications[minutesPassed];
    if (minutelyModifications === undefined) {
        allModifications[minutesPassed] = {};
        minutelyModifications = allModifications[minutesPassed];
    }
    // Iterate over individual pixel indexes and process
    for (const pixelIndex of pixelIndexes) {
        // Instantiate counter for pixel index if doesn't exist
        if (minutelyModifications[pixelIndex] === undefined) {
            minutelyModifications[pixelIndex] = 0;
        }
        minutelyModifications[pixelIndex]++;
    }
}
// Retrieve image from given hot potato URL (for given board index from 0-3) and process
// - Check coordinates of non-transparent pixels and retrieve associated username (optional)
// - Convert local coordinates to global coordinates depending on board index, then save data
async function handleImageURL(imageURL) {
    // If URL contains "-f-", ignore because full image
    if (imageURL.includes("-f-")) {
        return;
    }
    // Gracefully fails if image retrieval failed
    try {
        // Retrieve and parse image from hot potato URL 
        const imageResponse = await (0, cross_fetch_1.fetch)(imageURL);
        const imageArrayBuffer = await imageResponse.arrayBuffer();
        // Initialize asynchronous Worker for processing image on separate thread and wait for resolution
        const boardIndex = parseInt(imageURL.match(/-(\d)-d/)[1]);
        const timestamp = parseInt(imageURL.match(/images\/(\d+)-/)[1]);
        const nonTransparentIndexes = await new Promise((resolve) => {
            const worker = new worker_threads_1.Worker("./source/worker-png.js", { workerData: [boardIndex, imageArrayBuffer] });
            worker.on("message", function (data) { resolve(data); });
        }); // Represents REAL indexes, not board-level indexes
        processPixelIndexes(nonTransparentIndexes, timestamp);
    }
    catch (err) {
        (0, utilities_1.consoleTimestamp)(`Error handling image URL ${imageURL}: ${err.message}`);
    }
}
// Initialize websocket connection to GraphQL subscriber and asynchronously setup handler
// Haven't found how to retrieve previous timestamps yet, so instead cache all image URLs
let socket;
async function setupUpdateSocket() {
    (0, utilities_1.consoleTimestamp)(`Initializing r/place GraphQL websocket`);
    // Check whether access token initialized, throw error otherwise
    if (accessToken === "") {
        throw new Error("access token not initialized");
    }
    // Initialize websocket client and attempt connection
    socket = new ws_1.WebSocket("wss://gql-realtime-2.reddit.com/query", {
        origin: "https://www.reddit.com/r/place",
        headers: { "Authorization": `Bearer ${accessToken}` },
    });
    socket.on("open", async function () {
        // Initialize asynchronous onmessage handler for various responses
        socket.on("message", async function (data) {
            // Convert data to string, then parse
            const parsed = JSON.parse(data.toString());
            if (parsed["payload"] !== undefined) {
                // Image URL from board update subscription
                const imageURL = parsed["payload"]["data"]["subscribe"]["data"]["name"];
                await handleImageURL(imageURL);
            }
        });
        // Re-authorize with connection_init data for GraphQL
        socket.send(JSON.stringify({
            "type": "connection_init",
            "payload": { "Authorization": `Bearer ${accessToken}` }
        }));
        // Subscribe to both "squares" within r/place
        for (let boardIndex = 0; boardIndex <= 3; boardIndex++) {
            socket.send(JSON.stringify({ "id": `${boardIndex + 2}`, "type": "start", "payload": { "variables": { "input": { "channel": { "teamOwner": "AFD2022", "category": "CANVAS", "tag": `${boardIndex}` } } }, "extensions": {}, "operationName": "replace", "query": "subscription replace($input: SubscribeInput!) {\n  subscribe(input: $input) {\n    id\n    ... on BasicMessage {\n      data {\n        __typename\n        ... on FullFrameMessageData {\n          __typename\n          name\n          timestamp\n        }\n        ... on DiffFrameMessageData {\n          __typename\n          name\n          currentTimestamp\n          previousTimestamp\n        }\n      }\n      __typename\n    }\n    __typename\n  }\n}\n" } }));
        }
    });
}
// Main heatmap retrieval runtime: 
// - Retrieve access token and setup periodic refreshing
async function heatmapRuntime() {
    await refreshAccessRoutine(clientID, secretKey, username, password);
}
heatmapRuntime();
