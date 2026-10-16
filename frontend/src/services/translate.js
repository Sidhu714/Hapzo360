// Job translation. Order: (1) translations saved on the job, (2) cached, (3) free MyMemory API.
// To use your own backend, replace translateChunk() with a fetch to your /translate endpoint.
import { SOURCE_LANG } from '../config';
import { read, write } from './storage';

const FIELDS = ['title', 'description', 'requirements', 'location'];
const cache = read('tr_cache', {});

async function translateChunk(text, lang) {
  const key = `${lang}:${text}`;
  if (cache[key]) return cache[key];
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${SOURCE_LANG}|${lang}`;
    const data = await (await fetch(url)).json();
    const out = data?.responseStatus === 200 ? data.responseData.translatedText : text;
    if (out !== text) { cache[key] = out; write('tr_cache', cache); }
    return out;
  } catch {
    return text; // offline or limit hit: show original
  }
}

function chunk(text, max = 450) {
  const parts = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  const out = []; let cur = '';
  for (const p of parts) {
    if ((cur + p).length > max && cur) { out.push(cur); cur = ''; }
    cur += p;
  }
  if (cur) out.push(cur);
  return out;
}

export async function translateText(text, lang) {
  if (!text || lang === SOURCE_LANG) return text;
  return (await Promise.all(chunk(text).map((c) => translateChunk(c, lang)))).join('');
}

export async function translateJob(job, lang, fields = FIELDS) {
  if (lang === SOURCE_LANG) return job;
  const preset = job.translations?.[lang] || {};
  const out = { ...job };
  await Promise.all(fields.map(async (f) => {
    if (preset[f]) out[f] = preset[f];
    else if (job[f]) out[f] = await translateText(job[f], lang);
  }));
  return out;
}
