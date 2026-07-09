const API_URL = 'https://tarjiman-live.vercel.app/api/caption';
const CHUNK_MS = 1800;

const btnToggle = document.getElementById('btnToggle');
const btnClickThrough = document.getElementById('btnClickThrough');
const targetLang = document.getElementById('targetLang');
const captionText = document.getElementById('captionText');

let isListening = false;
let sysStream = null;
let clickThroughOn = false;

function getGuestId(){
  let id = localStorage.getItem('tarjimanDesktopGuestId');
  if(!id){
    id = 'desk_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('tarjimanDesktopGuestId', id);
  }
  return id;
}

function pickMimeType(){
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus'
  ];
  for(const c of candidates){
    if(window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

function blobToBase64(blob){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function setCaption(txt){
  if(txt && txt.trim()){
    captionText.textContent = txt;
    captionText.classList.remove('empty');
  } else {
    captionText.classList.add('empty');
  }
}

async function sendChunk(blob, mimeType){
  try {
    const audioBase64 = await blobToBase64(blob);
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64, mimeType,
        targetLang: targetLang.value,
        guestId: getGuestId(),
      }),
    });
    const data = await res.json().catch(() => null);
    if(!res.ok || !data) return;
    if(data.original && data.translated){
      setCaption(data.translated);
    }
  } catch(e){ /* network hiccup, keep going */ }
}

function recordOneChunk(){
  if(!isListening || !sysStream) return;
  const mimeType = pickMimeType();
  let mediaRecorder;
  try {
    mediaRecorder = mimeType ? new MediaRecorder(sysStream, { mimeType }) : new MediaRecorder(sysStream);
  } catch(e){
    stopListening();
    return;
  }
  const chunks = [];
  mediaRecorder.ondataavailable = (e) => { if(e.data && e.data.size > 0) chunks.push(e.data); };
  mediaRecorder.onstop = () => {
    if(chunks.length){
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType || mimeType || 'audio/webm' });
      if(blob.size > 800) sendChunk(blob, mediaRecorder.mimeType || mimeType);
    }
    if(isListening) recordOneChunk();
  };
  mediaRecorder.start();
  setTimeout(() => {
    if(mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  }, CHUNK_MS);
}

async function startListening(){
  try {
    const sourceId = await window.tarjiman.getDesktopSource();
    if(!sourceId){
      setCaption('تعذر التقاط صوت النظام');
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId
        }
      },
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          minWidth: 1, maxWidth: 2, minHeight: 1, maxHeight: 2
        }
      }
    });
    // We only need the system audio track; drop the throwaway video track.
    stream.getVideoTracks().forEach(t => { t.stop(); stream.removeTrack(t); });
    if(stream.getAudioTracks().length === 0){
      setCaption('لا يوجد صوت نظام متاح — شغّل فيديو وحاول مرة ثانية');
      stream.getTracks().forEach(t => t.stop());
      return;
    }
    sysStream = stream;
    isListening = true;
    btnToggle.textContent = '⏹️ إيقاف';
    btnToggle.classList.add('active');
    recordOneChunk();
  } catch(e){
    setCaption('تعذر التقاط صوت النظام');
  }
}

function stopListening(){
  isListening = false;
  btnToggle.textContent = '▶️ ابدأ';
  btnToggle.classList.remove('active');
  if(sysStream){ sysStream.getTracks().forEach(t => t.stop()); sysStream = null; }
  setCaption('');
}

btnToggle.addEventListener('click', () => {
  if(isListening) stopListening(); else startListening();
});

btnClickThrough.addEventListener('click', () => {
  clickThroughOn = !clickThroughOn;
  window.tarjiman.setIgnoreMouseEvents(clickThroughOn, { forward: true });
  btnClickThrough.classList.toggle('active', clickThroughOn);
  btnClickThrough.textContent = clickThroughOn ? '🖱️ تجاوز ✅' : '🖱️ تجاوز';
});

window.tarjiman.onClickThroughChanged((v) => {
  clickThroughOn = v;
  btnClickThrough.classList.toggle('active', v);
  btnClickThrough.textContent = v ? '🖱️ تجاوز ✅' : '🖱️ تجاوز';
});
