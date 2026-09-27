const { RoomServiceClient } = require('livekit-server-sdk');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const k = trimmed.substring(0, idx).trim();
      const v = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      env[k] = v;
    }
  });
}

const rawUrl = env.VITE_LIVEKIT_URL || 'https://gamervault-tdvn6w33.livekit.cloud';
const httpUrl = rawUrl.replace('wss://', 'https://');
const key = env.VITE_LIVEKIT_API_KEY;
const secret = env.VITE_LIVEKIT_API_SECRET;

const targetRoom = process.argv[2];

async function main() {
  const svc = new RoomServiceClient(httpUrl, key, secret);

  if (targetRoom === '--all') {
    const allRooms = await svc.listRooms();
    if (allRooms.length === 0) {
      console.log('Nenhuma sala ativa encontrada para encerrar.');
    } else {
      for (const r of allRooms) {
        console.log(`Encerrando sala '${r.name}'...`);
        try {
          await svc.deleteRoom(r.name);
          console.log(`[OK] Sala '${r.name}' encerrada com sucesso no LiveKit!`);
        } catch (e) {
          console.error(`[ERRO] Falha ao encerrar sala '${r.name}':`, e.message);
        }
      }
    }
  } else if (targetRoom) {
    console.log(`Encerrando sala '${targetRoom}'...`);
    try {
      await svc.deleteRoom(targetRoom);
      console.log(`[OK] Sala '${targetRoom}' encerrada com sucesso no LiveKit!`);
    } catch (e) {
      console.error(`[ERRO] Falha ao encerrar sala '${targetRoom}':`, e.message);
    }
  }

  const rooms = await svc.listRooms();
  console.log('\n--- Salas Ativas no LiveKit Cloud ---');
  if (rooms.length === 0) {
    console.log('Nenhuma sala ativa no momento.');
  } else {
    rooms.forEach(r => {
      console.log(`- Nome: ${r.name} | Participantes: ${r.numParticipants} | Criada em: ${new Date(Number(r.creationTime) * 1000).toLocaleString()}`);
    });
  }
}

main().catch(err => {
  console.error('Falha:', err);
});
