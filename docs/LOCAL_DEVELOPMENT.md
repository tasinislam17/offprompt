# Local Development

## Install

```bash
npm install
```

## Start Development

```bash
npm run dev
```

This starts:

- Vite client on `http://localhost:5173`
- Express and Socket.IO server on `http://localhost:3001`

The client automatically connects to the server on the same hostname and port `3001`. If you open the client from `http://192.168.x.x:5173`, phones will also connect to `http://192.168.x.x:3001`.

## Health Check

```bash
curl http://localhost:3001/health
```

PowerShell:

```powershell
Invoke-RestMethod http://localhost:3001/health
```

## Phone Testing

1. Run `npm run dev`.
2. Use the Vite Network URL from the terminal.
3. Host from that URL, not `localhost`, when phones need to join.
4. Keep the host laptop and phones on the same Wi-Fi.
5. Allow Node.js through the local firewall if prompted.

## Production-Like Local Run

```bash
npm run build
```

PowerShell:

```powershell
$env:NODE_ENV="production"
$env:PORT="3001"
npm start
```

Open `http://localhost:3001`.
