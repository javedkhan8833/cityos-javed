const http = require("http");
const net = require("net");

const GUNICORN_PORT = 8000;
const SOCKETIO_PORT = 9000;
const LISTEN_PORT = 5000;

let backendReady = false;

function checkBackendReady() {
	const sock = net.connect(GUNICORN_PORT, "127.0.0.1", () => {
		sock.destroy();
		if (!backendReady) {
			backendReady = true;
			console.log("Backend (Gunicorn) is now reachable");
		}
	});
	sock.on("error", () => {
		backendReady = false;
	});
	sock.setTimeout(500, () => {
		sock.destroy();
	});
}

setInterval(checkBackendReady, 2000);
checkBackendReady();

function proxyRequest(req, res, targetPort) {
	const options = {
		hostname: "127.0.0.1",
		port: targetPort,
		path: req.url,
		method: req.method,
		headers: req.headers,
	};

	const proxyReq = http.request(options, (proxyRes) => {
		res.writeHead(proxyRes.statusCode, proxyRes.headers);
		proxyRes.pipe(res);
	});

	proxyReq.on("error", (err) => {
		console.error(`Proxy error to port ${targetPort}:`, err.message);
		if (!res.headersSent) {
			res.writeHead(502);
			res.end("Bad Gateway");
		}
	});

	req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
	if (req.url === "/__health" || req.url === "/api/method/ping") {
		res.writeHead(200, {
			"Content-Type": "application/json",
			"Cache-Control": "no-cache, no-store",
		});
		res.end(JSON.stringify({ status: "ok", backend: backendReady }));
		return;
	}

	if (req.url.startsWith("/socket.io")) {
		proxyRequest(req, res, SOCKETIO_PORT);
	} else if (backendReady) {
		proxyRequest(req, res, GUNICORN_PORT);
	} else {
		res.writeHead(200, {
			"Content-Type": "text/html",
			"Cache-Control": "no-cache, no-store",
			"Retry-After": "3",
		});
		res.end(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="3">
<title>Dakkah CityOS</title>
<style>
body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
.card { text-align: center; padding: 2rem; }
h2 { color: #333; margin-bottom: 0.5rem; }
p { color: #666; }
</style>
</head>
<body>
<div class="card">
<h2>Dakkah CityOS</h2>
<p>Starting up, please wait...</p>
</div>
</body>
</html>`);
	}
});

server.on("upgrade", (req, socket, head) => {
	const targetPort = req.url.startsWith("/socket.io")
		? SOCKETIO_PORT
		: GUNICORN_PORT;

	const proxySocket = net.connect(targetPort, "127.0.0.1", () => {
		const reqLine = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
		let headers = "";
		for (let i = 0; i < req.rawHeaders.length; i += 2) {
			headers += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
		}
		proxySocket.write(reqLine + headers + "\r\n");
		if (head && head.length) {
			proxySocket.write(head);
		}
		proxySocket.pipe(socket);
		socket.pipe(proxySocket);
	});

	proxySocket.on("error", (err) => {
		console.error("WebSocket proxy error:", err.message);
		socket.end();
	});

	socket.on("error", (err) => {
		console.error("Client socket error:", err.message);
		proxySocket.end();
	});
});

server.listen(LISTEN_PORT, "0.0.0.0", () => {
	console.log(
		`Proxy listening on port ${LISTEN_PORT} -> Gunicorn:${GUNICORN_PORT}, SocketIO:${SOCKETIO_PORT}`,
	);
});
