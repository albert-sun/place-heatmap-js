"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consoleTimestamp = void 0;
// Console.log with timestamp for easier readability 
function consoleTimestamp(message) {
    const timestamp = (new Date()).toISOString().substring(11, 19);
    const formattedMessage = `[${timestamp}] ${message}`;
    console.log(formattedMessage);
}
exports.consoleTimestamp = consoleTimestamp;
