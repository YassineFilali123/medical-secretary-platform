import { spawn } from "child_process";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isPortOpen(port, path = "/api/specialties") {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}${path}`, () => {
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const backendRunning = await isPortOpen(8080);
  if (!backendRunning) {
    console.log("Starting PHP Backend Server on http://localhost:8080...");
    const phpPath = "C:\\xampp\\php\\php.exe";
    const backendDir = path.join(__dirname, "backend");
    const phpProcess = spawn(phpPath, ["-S", "localhost:8080", "router.php"], {
      cwd: backendDir,
      stdio: "inherit",
    });
    phpProcess.on("error", (err) => {
      console.error("Failed to start PHP backend:", err);
    });
  } else {
    console.log("PHP Backend Server is already running on http://localhost:8080");
  }

  // Live Chat realtime relay. PHP's built-in server cannot hold a WebSocket
  // open, so this runs as its own process. Chat still works without it — the
  // messages are in the database either way — but nothing arrives live.
  const realtimeRunning = await isPortOpen(8081, "/health");
  if (!realtimeRunning) {
    console.log("Starting Realtime (WebSocket) Server on ws://localhost:8081/ws...");
    const realtimeProcess = spawn(process.execPath, ["backend/realtime/server.js"], {
      cwd: __dirname,
      stdio: "inherit",
    });
    realtimeProcess.on("error", (err) => {
      console.error("Failed to start realtime server:", err);
    });
  } else {
    console.log("Realtime Server is already running on ws://localhost:8081/ws");
  }

  console.log("Starting Vite Frontend Server...");
  const viteProcess = spawn("npx.cmd", ["vite"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
  });
  viteProcess.on("error", (err) => {
    console.error("Failed to start Vite frontend:", err);
  });
}

main();
