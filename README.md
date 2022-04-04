# place-heatmap-js
Node.js runtime for compiling pixel heatmap with minute resolution. Still haven't figured out GraphQL query for retrieving board updates from given timestamp instead of having to subscribe. Utilizes worker threads for offloading PNG decoding and pixel filtering runtimes (with the goal of retrieving the coordinates of non-transparent = modified pixels). 

For now, outputs pixel counter data to the file `heatmap.json`, representing the minutes since April 1st midnight (EST), and pixel index counters (with pixel indexes representing single-number "index" when traversing the 2000x2000 board). Maybe will design something eventually for actually displaying this heatmap data?

## Setup and Running
- Modify the variables `clientID`, `secretKey`, `username`, and `password` within `source/heatmap.ts` (I honestly can't be bothered to deal with environment variables right now)
- Install the necessary dependencies including TypeScript. Run `tsc -w` in the background to compile any modifications, then `npm run start` to begin the routine. You should see the size of `heatmap.json` gradually increasing as images are processed.