/**
 * Gamer's Vault - VaultCast Audio Isolation Service
 * Captura exclusiva de áudio por processo (WASAPI Process Loopback)
 * Isola o som do jogo/janela selecionada, eliminando eco do Discord e sons do sistema.
 */

let activeProcessCapture = null;

/**
 * Cria uma faixa de áudio (MediaStreamTrack) capturando exclusivamente o som do processo alvo.
 * @param {number|object} sourceOrPid Process ID ou objeto source da janela
 * @returns {Promise<{ track: MediaStreamTrack, stop: () => void } | null>}
 */
export async function createProcessAudioTrack(sourceOrPid) {
  if (!window.electronAPI?.startProcessAudio || !sourceOrPid) {
    return null;
  }

  const params = typeof sourceOrPid === 'object'
    ? { pid: sourceOrPid.pid, windowId: sourceOrPid.id, windowName: sourceOrPid.name }
    : { pid: Number(sourceOrPid) };

  // Encerra qualquer captura prévia
  stopProcessAudioTrack();

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContextClass({ sampleRate: 48000 });
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    const destNode = audioCtx.createMediaStreamDestination();

    // Buffer circular para amostras Float32 (1 segundo de buffer estéreo a 48kHz)
    const BUFFER_CAPACITY = 48000 * 2;
    const bufferL = new Float32Array(BUFFER_CAPACITY);
    const bufferR = new Float32Array(BUFFER_CAPACITY);
    let writePtr = 0;
    let readPtr = 0;
    let buffered = 0;

    // ScriptProcessor com 2048 amostras (~42ms de latência suave)
    const scriptNode = audioCtx.createScriptProcessor(2048, 0, 2);

    scriptNode.onaudioprocess = (e) => {
      const outL = e.outputBuffer.getChannelData(0);
      const outR = e.outputBuffer.getChannelData(1);
      const len = outL.length;

      for (let i = 0; i < len; i++) {
        if (buffered > 0) {
          outL[i] = bufferL[readPtr];
          outR[i] = bufferR[readPtr];
          readPtr = (readPtr + 1) % BUFFER_CAPACITY;
          buffered--;
        } else {
          // Silêncio limpo quando o jogo não estiver emitindo som
          outL[i] = 0;
          outR[i] = 0;
        }
      }
    };

    scriptNode.connect(destNode);

    // Escuta os pacotes de áudio PCM 16-bit 48kHz enviados pelo Electron nativo
    const removeListener = window.electronAPI.onProcessAudioChunk((buffer) => {
      try {
        const int16 = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
        const frames = int16.length / 2;

        for (let i = 0; i < frames; i++) {
          const sL = int16[i * 2] / 32768.0;
          const sR = int16[i * 2 + 1] / 32768.0;

          bufferL[writePtr] = sL;
          bufferR[writePtr] = sR;
          writePtr = (writePtr + 1) % BUFFER_CAPACITY;

          if (buffered < BUFFER_CAPACITY) {
            buffered++;
          } else {
            // Descarte suave do dado mais antigo para manter a latência em tempo real
            readPtr = (readPtr + 1) % BUFFER_CAPACITY;
          }
        }
      } catch (_) {}
    });

    // Inicia a captura nativa no processo
    const res = await window.electronAPI.startProcessAudio(params);
    if (!res?.success) {
      removeListener?.();
      try {
        scriptNode.disconnect();
        destNode.disconnect();
        audioCtx.close();
      } catch (_) {}
      return null;
    }

    const track = destNode.stream.getAudioTracks()[0];

    activeProcessCapture = {
      track,
      stop: () => {
        removeListener?.();
        window.electronAPI.stopProcessAudio().catch(console.warn);
        try {
          scriptNode.disconnect();
          destNode.disconnect();
          audioCtx.close();
        } catch (_) {}
        activeProcessCapture = null;
      }
    };

    return activeProcessCapture;
  } catch (err) {
    console.warn('Erro ao configurar captura de áudio de processo:', err);
    return null;
  }
}

/**
 * Encerra qualquer captura ativa de áudio de processo
 */
export function stopProcessAudioTrack() {
  if (activeProcessCapture) {
    try {
      activeProcessCapture.stop();
    } catch (_) {}
    activeProcessCapture = null;
  }
}
