class Timer {
  tenths = 0;
  time = 0;
  cb = null;
  start(cb) {
    this.cb = cb;
    this.continue();
  }
  stop() {
    window.clearInterval(this.time);
  }
  set(t) {
    this.tenths = t;
  }
  continue() {
    this.time = window.setInterval(() => {
      this.tenths++;
      this.cb(this.tenths);
    }, 100);
  }
  reset() {
    this.tenths = 0;
  }
  clear() {
    this.stop();
    this.reset();
  }
}

cliTimer = new Timer();
const requestNewName = () => {
  const newName = window.prompt('Enter your name');
  localStorage.setItem('PLAYER_NAME', newName);
  return newName;
};
const savedName = localStorage.getItem('PLAYER_NAME');
const name = savedName || requestNewName();
if (! name) {
  alert('You must set a name to play!');
  window.location.reload();
}
THREEx.ArToolkitContext.baseURL = 'https://raw.githack.com/jeromeetienne/ar.js/master/three.js/';
const webSocket = new WebSocket('wss://www.openbrowsergame.com/api/name/' + name);


const addFooterSymbols = (targets, theme) => {
  const footer = document.getElementsByTagName('footer')[0];
  targets.forEach(t => {
    const img = document.createElement('img');
    img.setAttribute('src', ['/assets', theme, t].join('/'));
    img.setAttribute('id', 'legend_' + t);
    footer.appendChild(img);
  })
};

const clearFooterSymbols = () => {
  document.querySelectorAll('footer img').forEach(e => e.remove());
  document.querySelectorAll('div.tick').forEach(e => e.remove());
};

const index = (el) => {
  if (!el) return -1;
  let i = 0;
  do {
    i++;
  } while ((el = el.previousElementSibling));
  return i;
};

const createElement = (k, [x, y, z, s], theme)=> {
  const gameItem = document.createElement('a-image');
  gameItem.setAttribute('id', `${k}`);
  gameItem.setAttribute('position', `${x} ${y} ${z}`);
  gameItem.setAttribute('scale', `${s} ${s} ${s}`);
  gameItem.setAttribute('look-at', `#camera`);
  gameItem.setAttribute('src', ['/assets', theme, k].join('/'));
  gameItem.setAttribute('animation__click', 'property: rotation; to: 360 360 0; loop: false; startEvents: click; dur: 500"');

  gameItem.addEventListener('loaded', () => {
    window.dispatchEvent(new CustomEvent('gps-entity-place-loaded'))
  });
  gameItem.addEventListener('click', (ev) => {
    const pick = gameItem.getAttribute('id').replace('elem_', '');
    webSocket.send(JSON.stringify({
      cmd: 'pick',
      pick: pick
    }));
    if (game.targetAssets.includes(pick)) {
      leAudio.play('hover');
    } else {
      leAudio.play('hout');
      showMsg('you', 'fail');
    }
  });
  gameItem.addEventListener('mouseenter', (ev) => {
    gameItem.setAttribute('material', `opacity:.4`);
  });
  gameItem.addEventListener('mouseleave', (ev) => {
    gameItem.setAttribute('material', `opacity:1`);
  });

  return gameItem;
};

const placeItems = (items, theme) => {
  const scene = document.querySelector('a-scene');
  Object.entries(items).forEach(([k,v]) => {
    scene.appendChild(createElement(k, v, theme));
  })
};

const clearItems = () => {
  document.querySelectorAll('a-scene a-image').forEach(e => e.remove());
};

const connect = () => {
  webSocket.onerror = onError = (event) => {
    alert(event.data);
  };
  webSocket.onopen = (event) => {
    console.log('Connection established');
  };
  webSocket.onclose = (e) => {
    console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
    setTimeout(function() {
      connect();
    }, 1000);
  };
  webSocket.onmessage = onMessage;
};

let game;
const start = (msg) => {
  clearModal();
  game = msg;
  placeItems(msg.assets, msg.theme);
  addFooterSymbols(msg.targetAssets, msg.theme);
  cliTimer.start((t) => {
    document.getElementById('timer').innerText = (t / 10).toFixed(1);
  });
};

const createTick = (pick) => {
  const legEl = document.getElementById('legend_' + pick);
  legEl.classList.add('done');
  const tick = document.createElement('div');
  tick.classList.add('tick');
  tick.classList.add('idx_' + index(legEl));
  tick.innerText = '✓';
  document.getElementsByTagName('footer')[0].appendChild(tick);
};

const addTicks = (objectives) =>
  game.targetAssets.filter(x => ! objectives.includes(x)).forEach(t => createTick(t));

const onMessage = (event) => {
  console.log(event.data);
  try {
    const msg = JSON.parse(event.data);
    switch (msg.cmd) {
      case 'running':
        cliTimer.set(((new Date() - Date.parse(msg.started)) / 10));
        webSocket.send(JSON.stringify({cmd:'status'}));
        start(msg);
        break;
      case 'restart':
        // Fallthrough
        clearItems();
        clearFooterSymbols();
        cliTimer.clear();
        // fallthrough
      case 'start':
        start(msg);
        break;
      case 'stop':
        clearItems();
        clearFooterSymbols();
        modal('Waiting for game start...');
        break;
      case 'status':
        cliTimer.set(((new Date() - Date.parse(msg.started)) / 10));
        addTicks(msg.objectives);
        break;
      case 'register':
      case 'unregister':
        document.getElementById('players').innerText = msg.num;
        showMsg(msg.name, msg.cmd);
        break;
      case 'pick':
        if (msg.player === name) {
          const lePick = document.getElementById(msg.pick);
          if (msg.success) {
            createTick(msg.pick);

            lePick.removeAttribute('animation__click');
            lePick.setAttribute('animation', 'property: scale; to: 3 3 3; loop: false; dur: 500"');
            lePick.setAttribute('animation__2', 'property: material.opacity; to: .1; loop: false; dur: 500"');

            window.setTimeout(() => document.querySelector('a-scene').removeChild(lePick), 500);
          } else {
            const failsField = document.getElementById('fails');
            failsField.innerText = parseInt(failsField.innerText) + 1;
          }
        } else {
          if (msg.success) {
            showMsg(msg.player, 'point');
          } else {
            showMsg(msg.player, 'fail');
          }
        }
        if (msg.rest < 1) {
          cliTimer.stop();
          modal(msg.player + ' wins!', msg.player === name ? '' : 'notme');
        }
        break;
    }
  } catch (e) {
    console.error(e);
  }
};

window.onload = () => {
  connect();
  leAudio.init();
  if (! (game && game.running)) {
    modal('Waiting for game start...');
  }
};

window.onbeforeunload = function() {
  webSocket.onclose = () => {};
  webSocket.close();
};

/// Check if Phone woke up -> reload page
const TIMEOUT = 10000;
let lastTime = (new Date()).getTime();
setInterval(() => {
  const currentTime = (new Date()).getTime();
  if (currentTime > (lastTime + TIMEOUT + 2000)) {
    window.location.reload();
  }
  lastTime = currentTime;
}, TIMEOUT);
