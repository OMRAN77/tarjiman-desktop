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

window.tarjiman.onStatus((status) => {
  if(status && typeof status.listening === 'boolean'){
    isListening = status.listening;
    btnToggle.textContent = isListening ? '⏹️ إيقاف الترجمة' : '▶️ ابدأ الترجمة';
    btnToggle.classList.toggle('active', isListening);
  }
});

window.tarjiman.onClickThroughChanged((v) => {
  clickThroughOn = v;
  btnClickThrough.classList.toggle('active', v);
  btnClickThrough.textContent = v ? '🖱️ تجاوز الماوس ✅' : '🖱️ تجاوز الماوس';
});
