let game;

const addPlayer = (name) => {
  const userLi = document.createElement('li');
  userLi.classList.add('col', 's12', 'm6');
  userLi.setAttribute('data-name', name);

  const card = document.createElement('div');
  card.classList.add('card', 'blue-grey', 'darken-1', 'card-slim');

  const cContent = document.createElement('div');
  cContent.classList.add('card-content', 'white-text');

  const badge = document.createElement('span');
  badge.classList.add('new', 'badge', 'red', 'fails');
  badge.setAttribute('data-badge-caption', 'fails');
  badge.innerText = '0';
  cContent.appendChild(badge);

  const title = document.createElement('span');
  title.classList.add('card-title');
  title.innerText = name;
  cContent.appendChild(title);

  const playState = document.createElement('div');
  playState.classList.add('card-action', 'card-slim');
  for (let i = 1; i <= 3; i++) {
    const icon = document.createElement('div');
    icon.classList.add('medium', 'material-icons', 'target-marker', 'open');
    icon.innerText = 'grade';
    playState.appendChild(icon);
  }

  cContent.appendChild(playState);
  card.appendChild(cContent);
  userLi.appendChild(card);
  document.getElementById('players').appendChild(userLi);
};

const createWinnerMark = (name) => {
  const winner = document.createElement('div');
  winner.classList.add('winner-mark');
  winner.innerText = "Winner!";
  document.querySelector(`#players li[data-name="${name}"] .card-content`).append(winner);
};

const wshandle = (msg) => {
  switch (msg.cmd) {
    case 'register':
      addPlayer(msg.name);
      if (game) {
        game.clients.push(msg.name);
      }
      break;
    case 'unregister':
      document.querySelectorAll(`#players li[data-name="${msg.name}"]`).forEach(elm => elm.remove());
      if (game) {
        game.clients = game.clients.filter(c => c !== msg.name);
      }
      break;
    case 'get-themes':
      const select = document.getElementById('theme');
      select.querySelectorAll('option[value~=""]').forEach(elm => select.removeChild(elm));
      msg.themes.forEach(theme => {
        const option = document.createElement('option');
        option.setAttribute('value', theme);
        if (game && game.theme === theme) {
          option.setAttribute('selected', 'selected');
        }
        option.innerText = theme.slice(0, 1).toUpperCase() + theme.slice(1);
        select.appendChild(option);
        select.dispatchEvent(new Event('change'));
      });
      break;
    case 'restart':
      // Cleanups and fallthrough
    case 'running':
      game = msg;
      // remove objectivec
      document.querySelectorAll('#objectives li').forEach(c => c.remove());
      // replace players
      document.querySelectorAll('#players li').forEach(c => c.remove());
      msg.clients.forEach(addPlayer);
      // Cleanup game and fall through to
    case 'start':
      game = msg;
      const objectiveList = document.getElementById('objectives');
      for (const obj of msg.targetAssets) {
        const objLi = document.createElement('li');
        const objImg = document.createElement('img');
        objImg.setAttribute('src', ['/assets', msg.theme, obj].join('/'));
        objLi.appendChild(objImg);
        objectiveList.appendChild(objLi);
      }
      break;
    case 'pick':
      if (msg.success) {
        const idx = 2 - msg.rest;
        const curMark = document.querySelectorAll(`#players li[data-name="${msg.player}"] .target-marker`)[idx];
        if (curMark) {
          curMark.classList.remove('open');
          curMark.classList.add('done');
        }
        if (msg.rest === 0) {
          createWinnerMark(msg.player);
        }
      } else {
        const curMark = document.querySelector(`#players li[data-name="${msg.player}"] .fails`);
        curMark.innerText = parseInt(curMark.innerText) + 1;
        // Reset Markers
        document.querySelectorAll(`#players li[data-name="${msg.player}"] .target-marker`).forEach(m => {
          m.classList.remove('done');
          m.classList.add('open');
        })
      }
      break;
  }
};
