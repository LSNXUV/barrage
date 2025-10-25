## Realtime Barrage (WebSocket)

- Server endpoint: `GET /api/barrage` (Edge runtime, WebSocket upgrade)
- Client hook: `useBarrageWS` in `src/hooks/useBarrageWS.ts`
	- `connected`: boolean
	- `messages`: BarrageData[]
	- `sendBarrage(content: string)`: boolean

How it works:

- When a client connects, it receives the latest backlog (up to 200 messages), then real-time messages.
- Sending: clients send `{ type: 'send', data: { content } }`, the server assigns id/startTime and broadcasts `{ type: 'barrage', data }` to all.

Local dev:

- Start dev server and open two tabs at `http://localhost:3000` to see barrage sync in real time.
