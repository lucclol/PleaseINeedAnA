// Mini persistent music player bar for cross-page playback
(function() {
  // Don't show on lounge page or popup player
  if (window.location.pathname === '/lounge.html' || window.location.pathname === '/lounge') return;
  if (window.location.pathname === '/player.html' || window.location.pathname === '/player') return;

  function getState() {
    try { return JSON.parse(localStorage.getItem('ep_music_queue') || 'null'); } catch(e) { return null; }
  }

  var state = getState();
  if (!state || !state.queue || state.queue.length === 0 || state.currentIndex < 0) return;
  var item = state.queue[state.currentIndex];
  if (!item) return;

  // Create styles
  var style = document.createElement('style');
  style.textContent = '#miniPlayer{position:fixed;bottom:0;left:0;right:0;z-index:99999;background:var(--bg-card,#1a1a2e);border-top:2px solid var(--accent,#7c8db5);padding:10px 16px;display:flex;align-items:center;gap:12px;font-family:"DM Sans",sans-serif;box-shadow:0 -4px 20px rgba(0,0,0,0.2);}'
    + '.mp-info{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:var(--text,#ccc);}'
    + '.mp-btn{background:var(--bg-surface,#252540);border:1px solid var(--border,#333);color:var(--text,#ccc);border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px;transition:all 0.2s;font-family:inherit;text-decoration:none;display:inline-block;}'
    + '.mp-btn:hover{border-color:var(--accent,#7c8db5);color:var(--accent,#7c8db5);}';
  document.head.appendChild(style);

  var bar = document.createElement('div');
  bar.id = 'miniPlayer';

  var info = document.createElement('span');
  info.className = 'mp-info';
  info.textContent = 'Now playing: ' + item.label;

  var popupOpen = localStorage.getItem('ep_popup_player') === 'open';

  var openBtn = document.createElement('button');
  openBtn.className = 'mp-btn';
  openBtn.textContent = popupOpen ? 'Player Open' : 'Open Player';
  openBtn.onclick = function() {
    window.open('/player', 'ep_player', 'width=400,height=500,menubar=no,toolbar=no,location=no,status=no');
    openBtn.textContent = 'Player Open';
  };

  var loungeBtn = document.createElement('a');
  loungeBtn.href = '/lounge';
  loungeBtn.className = 'mp-btn';
  loungeBtn.textContent = 'Lounge';

  var closeBtn = document.createElement('button');
  closeBtn.className = 'mp-btn';
  closeBtn.innerHTML = '&#10005;';
  closeBtn.onclick = function() { bar.remove(); };

  bar.appendChild(info);
  bar.appendChild(openBtn);
  bar.appendChild(loungeBtn);
  bar.appendChild(closeBtn);
  document.body.appendChild(bar);

  // Update info when storage changes
  window.addEventListener('storage', function(e) {
    if (e.key === 'ep_music_queue') {
      var s = getState();
      if (s && s.queue && s.currentIndex >= 0 && s.queue[s.currentIndex]) {
        info.textContent = 'Now playing: ' + s.queue[s.currentIndex].label;
      }
    }
    if (e.key === 'ep_popup_player') {
      openBtn.textContent = e.newValue === 'open' ? 'Player Open' : 'Open Player';
    }
  });
})();
