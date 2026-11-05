/*
  Live video verification helpers for the Add-event camera check.
*/

const TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
];

const pickType = () =>
  typeof MediaRecorder === 'undefined'
    ? ''
    : TYPES.find(type => MediaRecorder.isTypeSupported(type)) || '';

export const canRecordVideo = () =>
  typeof MediaRecorder !== 'undefined' &&
  Boolean(navigator.mediaDevices?.getUserMedia);

export function createClipRecorder(stream, onClip, options = {}) {
  const { maxMs = 30000, onTick } = options;

  if (!canRecordVideo() || !stream) return null;

  const mimeType = pickType();
  const chunks = [];
  let discard = false;
  let timeoutId = 0;
  let tickId = 0;
  let secondsLeft = Math.ceil(maxMs / 1000);

  const recorder = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: 700000,
  });

  const clearTimers = () => {
    window.clearTimeout(timeoutId);
    window.clearInterval(tickId);
    timeoutId = 0;
    tickId = 0;
  };

  recorder.ondataavailable = event => {
    if (event.data && event.data.size) chunks.push(event.data);
  };

  recorder.onstop = () => {
    clearTimers();

    if (discard || !chunks.length) {
      onClip(null);
      return;
    }

    const blob = new Blob(chunks, {
      type: recorder.mimeType || mimeType || 'video/webm',
    });

    onClip({
      blob,
      url: URL.createObjectURL(blob),
      type: blob.type,
      size: blob.size,
      durationMs: maxMs,
    });
  };

  recorder.onerror = () => {
    clearTimers();
    discard = true;
    onClip(null);
  };

  return {
    start() {
      if (recorder.state !== 'inactive') return;

      recorder.start(1000);

      tickId = window.setInterval(() => {
        secondsLeft = Math.max(0, secondsLeft - 1);
        onTick?.(secondsLeft);

        if (secondsLeft === 0) {
          this.stop();
        }
      }, 1000);

      // Hard safety limit: always stops at 30 seconds.
      timeoutId = window.setTimeout(() => this.stop(), maxMs);
    },

    stop() {
      clearTimers();

      if (recorder.state === 'recording' || recorder.state === 'paused') {
        recorder.stop();
      }
    },

    cancel() {
      if (recorder.state === 'recording' || recorder.state === 'paused') {
        discard = true;
        clearTimers();
        recorder.stop();
      }
    },
  };
}

/* ---------- IndexedDB storage ---------- */

const DB_NAME = 'happening-clips';
const STORE = 'clips';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run(mode, action) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));

    tx.oncomplete = () => {
      db.close();
      resolve(request?.result);
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export const saveClip = (id, blob) =>
  run('readwrite', store => store.put(blob, id));

export const loadClip = id =>
  run('readonly', store => store.get(id));

export const deleteClip = id =>
  run('readwrite', store => store.delete(id));