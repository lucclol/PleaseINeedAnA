// Mini persistent music player for cross-page playback
(function() {
  // Don't show on lounge page (full player is there)
  if (window.location.pathname === '/lounge.html') return;

  function getState() {
    try {
      return JSON.parse(localStorage.getItem('ep_music_queue') || 'null');
    } catch(e) { return null; }
  }

  function saveState(state) {
    try { localStorage.setItem('ep_music_queue', JSON.stringify(state)); } catch(e) {}
  }

  var state = getState();
  if (!state || !state.queue || state.queue.length === 0 || state.currentIndex < 0) return;
  var item = state.queue[state.currentIndex];
  if (!item) return;

  // Only show for YT and SP (can't resume file blobs across pages)
  if (item.type !== 'yt' && item.type !== 'sp') return;

  // Create styles
  var style = document.createElement('style');
  style.textContent = [
    '#miniPlayer{position:fixed;bottom:0;left:0;right:0;z-index:99999;background:var(--bg-card,#1a1a2e);border-top:2px solid var(--accent,#7c8db5);box-shadow:0 -4px 20px rgba(0,0,0,0.3);transition:transform 0.3s ease;font-family:"DM Sans",sans-serif;}',
    '#miniPlayer.collapsed{transform:translateY(calc(100% - 40px));}',
    '.mp-toggle{position:absolute;top:-32px;right:16px;background:var(--accent,#7c8db5);color:#fff;border:none;border-radius:8px 8px 0 0;padding:6px 14px;font-size:12px;cursor:pointer;font-family:inherit;}',
    '.mp-bar{display:flex;align-items:center;gap:12px;padding:8px 16px;}',
    '.mp-info{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:var(--text,#ccc);}',
    '.mp-btn{background:none;border:1px solid var(--border,#333);color:var(--text,#ccc);border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px;transition:all 0.2s;}',
    '.mp-btn:hover{border-color:var(--accent,#7c8db5);color:var(--accent,#7c8db5);}',
    '.mp-embed{overflow:hidden;transition:height 0.3s ease;}',
    '.mp-embed iframe{width:100%;border:none;display:block;}'
  ].join('\n');
  document.head.appendChild(style);

  // Create player
  var player = document.createElement('div');
  player.id = 'miniPlayer';

  var toggle = document.createElement('button');
  toggle.className = 'mp-toggle';
  toggle.textContent = 'Music';
  toggle.onclick = function() { player.classList.toggle('collapsed'); };

  var bar = document.createElement('div');
  bar.className = 'mp-bar';

  var prevBtn = document.createElement('button');
  prevBtn.className = 'mp-btn';
  prevBtn.innerHTML = '&#9664;&#9664;';
  prevBtn.title = 'Previous';
  prevBtn.onclick = function() { navigate(-1); };

  var nextBtn = document.createElement('button');
  nextBtn.className = 'mp-btn';
  nextBtn.innerHTML = '&#9654;&#9654;';
  nextBtn.title = 'Next';
  nextBtn.onclick = function() { navigate(1); };

  var info = document.createElement('span');
  info.className = 'mp-info';
  info.textContent = item.label;

  var loungeLink = document.createElement('a');
  loungeLink.href = '/lounge.html';
  loungeLink.className = 'mp-btn';
  loungeLink.textContent = 'Full Player';
  loungeLink.style.textDecoration = 'none';

  var closeBtn = document.createElement('button');
  closeBtn.className = 'mp-btn';
  closeBtn.innerHTML = '&#10005;';
  closeBtn.title = 'Close';
  closeBtn.onclick = function() { player.remove(); };

  bar.appendChild(prevBtn);
  bar.appendChild(info);
  bar.appendChild(nextBtn);
  bar.appendChild(loungeLink);
  bar.appendChild(closeBtn);

  var embedDiv = document.createElement('div');
  embedDiv.className = 'mp-embed';

  function loadEmbed(songItem) {
    if (!songItem) return;
    info.textContent = songItem.label;
    if (songItem.type === 'yt') {
      embedDiv.style.height = '80px';
      embedDiv.innerHTML = '<iframe src="https://www.youtube.com/embed/' + songItem.id + '?autoplay=1" height="80" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
      // Load YT IFrame API for auto-advance
      if (!window.YT) {
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    } else if (songItem.type === 'sp') {
      var spType = songItem.spType || 'track';
      embedDiv.style.height = '80px';
      embedDiv.innerHTML = '<iframe src="https://open.spotify.com/embed/' + spType + '/' + songItem.id + '?utm_source=generator&theme=0" height="80" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>';
    }
  }

  function navigate(direction) {
    var s = getState();
    if (!s || !s.queue) return;
    var newIndex = s.currentIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= s.queue.length) newIndex = s.queue.length - 1;
    s.currentIndex = newIndex;
    s.time = Date.now();
    saveState(s);
    var newItem = s.queue[newIndex];
    if (newItem && (newItem.type === 'yt' || newItem.type === 'sp')) {
      loadEmbed(newItem);
    }
  }

  player.appendChild(toggle);
  player.appendChild(embedDiv);
  player.appendChild(bar);
  document.body.appendChild(player);

  loadEmbed(item);
})();
