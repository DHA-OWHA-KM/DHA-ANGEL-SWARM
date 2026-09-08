react@18.3.1 and react-dom@18.3.1 UMD production builds, vendored from npm.
The Claude Design runtime (support.js) requests exactly these two files from
unpkg.com when window.React/window.ReactDOM are absent. They are loaded from
this folder, before support.js, so that check short-circuits and no request
ever leaves the loopback port.
