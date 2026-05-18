/**
 * Na und? — Web Push Subscription Manager
 * Verwaltet Push-Abonnements via Cloudflare Worker.
 * Einbinden als <script src="push-subscription.js" defer></script>
 */
(function () {
  'use strict';

  // ── Konfiguration ────────────────────────────────────────────────────────────
  var VAPID_PUBLIC_KEY = 'BALl7bGlilN8CDyyE7dkVb4mGWAxDauLXpufieZKy4RtbDXCyoVdgh8-pvj8KITvAR8HrHRVXqqnDEZR1DIacYk';
  var WORKER_URL       = 'https://na-und-push.moritz-scheinert.workers.dev';

  // ── base64url → Uint8Array ───────────────────────────────────────────────────
  function urlBase64ToUint8Array(b64) {
    var pad = '='.repeat((4 - b64.length % 4) % 4);
    var raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  // ── Zustand abfragen ─────────────────────────────────────────────────────────
  async function getState() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
    if (Notification.permission === 'denied') return 'blocked';
    try {
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      return sub ? 'subscribed' : 'unsubscribed';
    } catch {
      return 'unsupported';
    }
  }

  // ── Abonnieren ───────────────────────────────────────────────────────────────
  async function subscribe() {
    var permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    try {
      await fetch(WORKER_URL + '/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(sub.toJSON()),
      });
    } catch (e) {
      console.warn('[Push] Subscription konnte nicht gespeichert werden:', e);
    }
    return true;
  }

  // ── Abmelden ─────────────────────────────────────────────────────────────────
  async function unsubscribe() {
    try {
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      var endpoint = sub.endpoint;
      await sub.unsubscribe();

      await fetch(WORKER_URL + '/subscribe', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint: endpoint }),
      });
    } catch (e) {
      console.warn('[Push] Abmeldung fehlgeschlagen:', e);
    }
  }

  // ── Button-Zustand synchronisieren ──────────────────────────────────────────
  async function updateButton(btn, hintEl) {
    if (!btn) return;
    var state = await getState();
    btn.dataset.pushState = state;
    btn.disabled = (state === 'blocked' || state === 'unsupported');

    var labels = {
      subscribed:   '🔔 Aktiv',
      unsubscribed: 'Aktivieren',
      blocked:      '🚫 Blockiert',
      unsupported:  'Nicht verfügbar',
    };
    btn.textContent = labels[state] || '?';

    if (hintEl) {
      hintEl.textContent =
        state === 'subscribed'   ? 'Du erhältst Benachrichtigungen bei neuen Ausgaben.' :
        state === 'blocked'      ? 'Benachrichtigungen im Browser entsperren, dann neu laden.' :
        state === 'unsupported'  ? 'Dein Browser unterstützt keine Push-Benachrichtigungen.' : '';
    }
  }

  // ── Globale API ──────────────────────────────────────────────────────────────
  window._naundPush = {
    getState:     getState,
    subscribe:    subscribe,
    unsubscribe:  unsubscribe,
    updateButton: updateButton,
  };
})();
