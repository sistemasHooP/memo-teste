// Este é um Service Worker mínimo.
// O seu único propósito é fazer o Chrome
// entender que este site é um PWA "instalável".
// Ele não faz cache offline (ainda).

self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalado');
  // Força o novo service worker a ativar imediatamente
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativado');
  // Toma o controle da página imediatamente
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // No momento, nós não fazemos cache.
  // Apenas passamos a requisição para a rede (online).
  // A lógica de "Retentativa" está no app.js, não aqui.
  event.respondWith(fetch(event.request));
});
