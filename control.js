const btnToggle = document.getElementById('btnToggle');
const btnClickThrough = document.getElementById('btnClickThrough');
const targetLang = document.getElementById('targetLang');

let isListening = false;
let clickThroughOn = false;

btnToggle.addEventListener('click', () => {
  if(isListening){
    window.tarjiman.sendControl('stop');
  } else {
    window.tarjiman.sendControl('set-lang', targetLang.value);
    window.tarjiman.sendControl('start');
  }
});

targetLang.addEventListener('change', () => {
  window.tarjiman.sendControl('set-lang', targetLang.value);
});

btnClickThrough.addEventListener('click', () => {
  window.tarjiman.sendControl('toggle-click-through');
});

const btnResetPos = document.getElementById('btnResetPos');
btnResetPos.addEventListener('click', () => {
  window.tarjiman.resetOverlayPosition();
});

const debugBox = document.getElementById('debugBox');
let debugLines = [];

window.tarjiman.onStatus((status) => {
  if(status && typeof status.listening === 'boolean'){
    isListening = status.listening;
    btnToggle.textContent = isListening ? '⏹️ إيقاف الترجمة' : '▶️ ابدأ الترجمة';
    btnToggle.classList.toggle('active', isListening);
    if(isListening){
      debugLines = [];
      debugBox.innerHTML = '<div style="color:#888; direction:rtl; text-align:center;">جاري الانتظار على أول مقطع صوتي…</div>';
    }
  }
  if(status && status.debug){
    const time = new Date().toLocaleTimeString('en-GB');
    debugLines.push('[' + time + '] ' + status.debug);
    if(debugLines.length > 30) debugLines.shift();
    debugBox.innerHTML = debugLines.map(l => '<div>' + l.replace(/</g,'&lt;') + '</div>').join('');
    debugBox.scrollTop = debugBox.scrollHeight;
  }
});

window.tarjiman.onClickThroughChanged((v) => {
  clickThroughOn = v;
  btnClickThrough.classList.toggle('active', v);
  btnClickThrough.textContent = v ? '🖱️ تجاوز الماوس ✅' : '🖱️ تجاوز الماوس';
});
