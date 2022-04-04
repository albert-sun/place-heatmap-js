// Console.log with timestamp for easier readability 
export function consoleTimestamp(message: string) {
    const timestamp = (new Date()).toISOString().substring(11, 19);
    const formattedMessage = `[${timestamp}] ${message}`;
    console.log(formattedMessage);
}