/* ===========================================================
   PEACEBRIDGE INITIATIVE — GLOBAL CORE ENGINE (app.js)
   \"Voices United for Peace and Progress\"
   =========================================================== */

window.PB = (function () {
  'use strict';

  // 1. STATE MANAGEMENT & STORAGE WRAPPER
  const store = {
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        console.warn(`Storage access error for key \"${key}\":`, e);
        return defaultValue;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        // Dispatch custom event so separate components/windows can re-sync states live
        window.dispatchEvent(new CustomEvent('pb-state-update', { detail: { key, value } }));
      } catch (e) {
        console.error(`Storage write error for key \"${key}\":`, e);
      }
    },
    clear() {
      try {
        localStorage.clear();
      } catch (e) {
        console.error("Storage clear error:", e);
      }
    }
  };

  // 2. UNIQUE ID GENERATOR
  function uid(prefix = 'ID') {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `${prefix}-${ts.toUpperCase()}-${rand}`;
  }

  // 3. ACCESSIBILITY (a11y) CONTROLLER
  const a11y = {
    init() {
      // Rehydrate preferences from local storage on load
      if (store.get('a11y-contrast') === 'high') {
        document.body.classList.add('high-contrast');
      }
      
      const savedFont = store.get('a11y-font-size'); // 'large' or 'xlarge'
      if (savedFont) {
        document.body.classList.add(`font-${savedFont}`);
      }

      if (store.get('a11y-dyslexic') === 'enabled') {
        document.body.classList.add('dyslexic-font');
      }

      // Delegate global event listener for layout accessibility controls
      document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        
        if (action === 'contrast') {
          const isHigh = document.body.classList.toggle('high-contrast');
          store.set('a11y-contrast', isHigh ? 'high' : 'normal');
          announce(isHigh ? "High contrast mode activated" : "High contrast mode deactivated");
        } 
        
        else if (action === 'font-size') {
          if (document.body.classList.contains('font-large')) {
            document.body.classList.remove('font-large');
            document.body.classList.add('font-xlarge');
            store.set('a11y-font-size', 'xlarge');
            announce("Font size set to extra large");
          } else if (document.body.classList.contains('font-xlarge')) {
            document.body.classList.remove('font-xlarge');
            store.set('a11y-font-size', 'normal');
            announce("Font size restored to normal");
          } else {
            document.body.classList.add('font-large');
            store.set('a11y-font-size', 'large');
            announce("Font size set to large");
          }
        } 
        
        else if (action === 'dyslexic') {
          const isDyslexic = document.body.classList.toggle('dyslexic-font');
          store.set('a11y-dyslexic', isDyslexic ? 'enabled' : 'disabled');
          announce(isDyslexic ? "Dyslexic friendly font activated" : "Standard typography restored");
        }
      });
    }
  };

  // 4. LIVE SCREEN-READER ANNOUNCEMENTS (ARIA Live)
  function announce(message, politeness = 'polite') {
    let liveEl = document.getElementById(`pb-live-${politeness}`);
    if (!liveEl) {
      liveEl = document.createElement('div');
      liveEl.id = `pb-live-${politeness}`;
      liveEl.setAttribute('aria-live', politeness);
      liveEl.setAttribute('aria-atomic', 'true');
      liveEl.style.position = 'absolute';
      liveEl.style.width = '1px';
      liveEl.style.height = '1px';
      liveEl.style.padding = '0';
      liveEl.style.overflow = 'hidden';
      liveEl.style.clip = 'rect(0, 0, 0, 0)';
      liveEl.style.whiteSpace = 'nowrap';
      liveEl.style.border = '0';
      document.body.appendChild(liveEl);
    }
    // Force DOM refresh to trigger active speech synthesis software
    liveEl.textContent = '';
    setTimeout(() => { liveEl.textContent = message; }, 50);
  }

  // 5. WEB SPEECH API (Voice-to-Text Input Hook)
  function attachMic(triggerBtn, inputField) {
    if (!triggerBtn || !inputField) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      triggerBtn.style.display = 'none'; // Hide if browser environment lacks native speech pipeline
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-UG'; // Tailored locale baseline for Uganda
    recognition.interimResults = false;

    let isListening = false;

    recognition.onstart = () => {
      isListening = true;
      triggerBtn.classList.add('listening');
      triggerBtn.setAttribute('aria-label', 'Listening active. Click to stop.');
      announce("Microphone listening. Please speak now.");
    };

    recognition.onerror = (e) => {
      console.error("Speech Recognition Error:", e.error);
      isListening = false;
      triggerBtn.classList.remove('listening');
      announce("Speech recognition error. Please check mic permissions.");
    };

    recognition.onend = () => {
      isListening = false;
      triggerBtn.classList.remove('listening');
      triggerBtn.setAttribute('aria-label', 'Use voice input');
    };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (inputField.tagName === 'INPUT' || inputField.tagName === 'TEXTAREA') {
        const currentVal = inputField.value.trim();
        inputField.value = currentVal ? `${currentVal} ${transcript}` : transcript;
        // Trigger generic input listener cascades manually
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      announce("Speech input received successfully.");
    };

    triggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isListening) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  }

  // Initialize unified components instantly upon file delivery
  document.addEventListener('DOMContentLoaded', () => {
    a11y.init();
    
    // Global Back-to-Top operational element hook
    const toTopBtn = document.querySelector('.to-top');
    if (toTopBtn) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 300) toTopBtn.classList.add('show');
        else toTopBtn.classList.remove('show');
      });
      toTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  });

  return {
    store,
    uid,
    announce,
    attachMic
  };
})();


/*==================================
ACCESSIBILITY CONTROLS
===================================*/

(() => {

const buttons=document.querySelectorAll(".a11y-btn");

let fontLevel=0;

buttons.forEach(btn=>{

btn.addEventListener("click",()=>{

const action=btn.dataset.action;

switch(action){

case "font-size":
cycleFont();
break;

case "contrast":
toggleContrast(btn);
break;

case "dyslexic":
toggleEasyRead(btn);
break;

case "read-page":
readPage(btn);
break;

case "voice-nav":
voiceNavigation(btn);
break;

}

});

});

function cycleFont(){

document.body.classList.remove(
"large-text",
"extra-large-text"
);

fontLevel++;

if(fontLevel>2)fontLevel=0;

if(fontLevel===1)
document.body.classList.add("large-text");

if(fontLevel===2)
document.body.classList.add("extra-large-text");

localStorage.setItem("fontLevel",fontLevel);

}

function toggleContrast(btn){

document.body.classList.toggle("high-contrast");

btn.classList.toggle("active");

localStorage.setItem(
"contrast",
document.body.classList.contains("high-contrast")
);

}

function toggleEasyRead(btn){

document.body.classList.toggle("easy-read");

btn.classList.toggle("active");

localStorage.setItem(
"easyRead",
document.body.classList.contains("easy-read")
);

}

let speech=null;

function readPage(btn){

if(speechSynthesis.speaking){

speechSynthesis.cancel();

btn.classList.remove("active");

return;

}

speech=new SpeechSynthesisUtterance(
document.body.innerText
);

speech.rate=1;

speech.pitch=1;

speech.lang="en-US";

speech.onend=()=>btn.classList.remove("active");

btn.classList.add("active");

speechSynthesis.speak(speech);

}

function voiceNavigation(btn){

if(!('webkitSpeechRecognition' in window)){

alert("Voice recognition is not supported.");

return;

}

const recognition=new webkitSpeechRecognition();

recognition.lang="en-US";

recognition.start();

btn.classList.add("active");

recognition.onresult=(e)=>{

const text=e.results[0][0].transcript.toLowerCase();

if(text.includes("home"))
location.href="index.html";

else if(text.includes("about"))
location.href="about.html";

else if(text.includes("library"))
location.href="library.html";

else if(text.includes("community"))
location.href="community.html";

else if(text.includes("report"))
location.href="report.html";

else if(text.includes("dialogue"))
location.href="dialogue.html";

else if(text.includes("certificate"))
location.href="certificate.html";

};

recognition.onend=()=>btn.classList.remove("active");

}

window.addEventListener("load",()=>{

const savedFont=Number(localStorage.getItem("fontLevel")||0);

fontLevel=savedFont-1;

cycleFont();

if(localStorage.getItem("contrast")==="true")
document.body.classList.add("high-contrast");

if(localStorage.getItem("easyRead")==="true")
document.body.classList.add("easy-read");

});

})();


/*=========================================
SCROLL ANIMATION ENGINE
=========================================*/

const observer = new IntersectionObserver(entries=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

entry.target.classList.add("active");

}

});

},{
threshold:.15
});

document.querySelectorAll(
".reveal,.reveal-left,.reveal-right,.reveal-scale"
).forEach(el=>observer.observe(el));

document.querySelectorAll(".voice-card,.book-chip").forEach(card=>{

card.addEventListener("mousemove",(e)=>{

const rect=card.getBoundingClientRect();

const x=e.clientX-rect.left;

const y=e.clientY-rect.top;

const rotateY=((x/rect.width)-.5)*12;

const rotateX=((y/rect.height)-.5)*-12;

card.style.transform=
`perspective(1000px)
rotateX(${rotateX}deg)
rotateY(${rotateY}deg)
translateY(-10px)`;

});

card.addEventListener("mouseleave",()=>{

card.style.transform="";

});

});