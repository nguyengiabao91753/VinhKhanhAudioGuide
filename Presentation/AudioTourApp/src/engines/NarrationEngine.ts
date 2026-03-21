export function playNarration(text: string, lang: 'vi' | 'en', onEnd: () => void) {
  if (!('speechSynthesis' in window)) {
    console.error('Speech synthesis not supported');
    onEnd();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US';

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.includes(lang === 'vi' ? 'vi' : 'en'));
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.rate = 0.9;
  utterance.pitch = 1;

  utterance.onend = () => {
    onEnd();
  };

  utterance.onerror = () => {
    onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

export function stopNarration() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
