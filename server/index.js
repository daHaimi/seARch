const THREE = require('three');
const fs = require('fs');
const path = require('path');

const RADIUS = 10;
const GOAL_NUM = 3;
const MIN_DISTANCE = 2.5;
const assetsPath = '../client/assets';
let assetsPlain = [];
let game = {
  running: false,
  clients: [],
  theme: null,
  started: null
};

const resetGame = () => {
  Object.assign(game, {
    running: false,
    started: null,
    assets: null,
    targetAssets: null
  });
};

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({port: 3001});
wss.on('connection', function(ws, data) {
  // Has a client connected?
  if (data.url.indexOf('/api/name/') === 0) {
    register(data.url.replace('/api/name/', ''), ws);
    // If game is running, assign objectives
    if (game.running) {
      game.clients = game.clients.map(cli => {
        cli.objectives = game.targetAssets;
        cli.fails = 0;
        return cli;
      });
    }
  }
  // If a current came is running, present that
  if (game.running) {
    ws.send(gameDto('running'));
  }
  ws.on('message', function(message) {
    console.log('Received from client: %s', message);
    try {
      const msg = JSON.parse(message);
      if (commands[msg.cmd]) {
        const player = game.clients.find(p => p.ws === ws);
        const result = commands[msg.cmd](msg, player ? player.name : null);
        if (result) ws.send(typeof result === 'object' ? JSON.stringify(result) : result.toString());
      }
    } catch (e) {
      console.error(e);
      ws.send(JSON.stringify({error: e}));
    }
  });
  ws.on('close', function(message) {
    const player = game.clients.find(p => p.ws === ws);
    game.clients = game.clients.filter(p => p.ws !== ws);
    if (player) {
      broadcast({
        cmd: 'unregister',
        name: player.name,
        num: game.clients.length
      });
    }
  });
});

const gameDto = (cmd) => {
  return JSON.stringify(Object.assign({}, game, {
    clients: game.clients.map(c => c.name),
    cmd
  }));
};

const register = (name, ws) => {
  game.clients.push({name, ws});
  broadcast({
    cmd: 'register',
    name,
    num: game.clients.length
  });
};

const broadcast = (msg) => wss.clients.forEach(client =>
    client.send(typeof msg === 'object' ? JSON.stringify(msg) : msg.toString()));

const createGame = (msg) => {
  game.running = true;
  game.theme = msg.theme;
  game.num = msg.num;
  assetsPlain = fs.readdirSync(path.join(assetsPath, game.theme));
  const assets = createAssets(game.num);
  const targetAssets = Object.keys(assets).sort(() => Math.random() - 0.5).slice(0, GOAL_NUM);
  Object.assign(game, {
    assets,
    targetAssets
  });
  game.clients = game.clients.map(cli => {
    cli.objectives = targetAssets;
    cli.fails = 0;
    return cli;
  });
  game.started = new Date();
};

const destroyGame = () => {
  game.running = false;
  game.theme = null;
  game.num = 0;
  game.assets = null;
  game.targetAssets = null;
  game.clients = game.clients.map(cli => {
    cli.objectives = null;
    cli.fails = 0;
    return cli;
  });
  game.started = null;
};

const commands = {
  ['get-themes']: (msg, player) => {
    console.log(fs.readdirSync(assetsPath));
    return {
      cmd: 'get-themes',
      themes: fs.readdirSync(assetsPath)
    };
  },
  restart: (msg, player) => {
    createGame(msg);
    broadcast(gameDto('restart'));
  },
  start: (msg, player) => {
    createGame(msg);
    broadcast(gameDto('start'));
  },
  stop: (msg, player) => {
    destroyGame();
    broadcast(gameDto('stop'));
  },
  status: (msg, player) => {
    const playerData = game.clients.find(p => p.name === player);
    return {
      cmd: 'status',
      objectives: playerData.objectives,
      started: game.started
    }
  },
  pick: (msg, player) => {
    let rest = GOAL_NUM;
    let result;
    const valid = game.targetAssets.includes(msg.pick);
    if (valid) {
      game.clients = game.clients.map(p => {
        console.log(p.name, player);
        if (p.name === player) {
          p.objectives = p.objectives.filter(o => o !== msg.pick);
          rest = p.objectives.length;
        }
        return p;
      })
    } else {
      game.clients = game.clients.map(p => {
        if (p.name === player) {
          p.fails++;
          // Reset objectives
          p.objectives = game.targetAssets;
          rest = p.objectives.length;
          // Tell Player to start over
          result = gameDto('restart');
        }
        return p;
      });
    }
    broadcast({
      cmd: msg.cmd,
      pick: msg.pick,
      player,
      rest,
      success: valid
    });
    if (rest < 1) {
      resetGame();
    }
    return result;
  }
};

const randomPointOnSphere = (radius) => {
  const u = Math.random();
  const v = Math.random();
  const theta = u * 2.0 * Math.PI;
  const phi = Math.acos(2.0 * v - 1.0);
  const r = Math.cbrt(Math.random());
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  return (new THREE.Vector3(r * sinPhi * cosTheta, r * sinPhi * sinTheta, r * cosPhi)).setLength(radius);
};

const pointIsOk = (arr, val) => {

};

const createAssets = (num) => {
  return assetsPlain.sort(() => Math.random() - 0.5).slice(0, num - 1).reduce((prev, cur) => {
    let pt;
    let i = 0;
    do {
      pt = randomPointOnSphere(RADIUS);
      i++;
    } while (Object.values(prev).reduce((r, v) => r || pt.distanceTo(new THREE.Vector3(...v)) < MIN_DISTANCE, false));
    prev[cur] = pt.toArray();
    prev[cur].push((Math.random() * 2) + .5);
    return prev;
  }, {});
};

/*
app.get('/unregister/:clientId', (req, res, next) => {
  clients = clients.filter(c => c !== req.params.clientId);
});

app.get('/reset', (req, res, next) => {
  clients = [];
});

*/
