const net = require('node:net');
const { once } = require('node:events');

async function fakeReceiver(options = {}) {
  const sockets = new Set();
  const commands = [];
  const states = { Z1POW: 0, Z2POW: 0, Z1MUT: 0, Z2MUT: 0, Z1INP: 1, Z2INP: 1, Z1VOL: -40, Z2VOL: -40, Z1PVOL: 50, Z2PVOL: 50, Z1ALM: 1, Z2ALM: 1, GCFPB: 50, GCLEDB: 40 };
  const str = options.model === 'STR PA' || options.model === 'STR IA';
  if (str) states.Z1ALM = 7;
  Object.assign(states, options.states);
  const rejected = [];
  let connections = 0;
  const server = net.createServer(socket => {
    connections++; sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    let pending = '';
    socket.on('data', data => {
      pending += data;
      let index;
      while ((index = pending.indexOf(';')) !== -1) {
        const command = pending.slice(0, index); pending = pending.slice(index + 1);
        commands.push(command);
        if (options.ignore?.(command)) continue;
        // STR fixture accepts only the initial feature set established by PR #40.
        // Reject receiver queries, relative receiver controls, and invalid STR modes/volume.
        if (str && !/^(?:IDM\?|IDS\?|IDN\?|ICN\?|ISN\d{2}\?|Z1(?:POW|MUT|INP|VOL|ALM)\?|Z1(?:POW|MUT)[01]|Z1INP\d+|Z1VOL[+-]?\d+(?:\.\d+)?|Z1ALM(?:7|9|11|12))$/.test(command)) {
          rejected.push(command); socket.write('!I' + command + ';'); continue;
        }
        if (str && /^Z1VOL[^?]/.test(command)) {
          const db = Number(command.slice(5));
          if (db < -96 || db > 7 || !Number.isInteger(db * 2)) {
            rejected.push(command); socket.write('!R' + command + ';'); continue;
          }
        }
        let reply;
        if (command === 'IDM?') reply = 'IDM' + (options.model || 'MRX 740');
        else if (command === 'IDS?') reply = 'IDS1.0.0';
        else if (command === 'GSN?' || command === 'IDN?') reply = command.slice(0, -1) + (str ? 'AA:BB:CC:DD:EE:01' : 'TEST-RECEIVER');
        else if (command === 'ICN?') reply = 'ICN12';
        else if (/^IS\d+IN\?$/.test(command)) reply = command.slice(0, -1) + (options.model === 'MRX SLM' ? Buffer.from('Cinema').toString('hex') : 'Cinema');
        else if (/^ISN\d+\?$/.test(command)) reply = command.slice(0, -1) + 'Cinema';
        else if (command === 'Z1ARCVAL?') reply = 'Z1ARCVAL1';
        else if (/^IS\d+ARC\?$/.test(command)) reply = command.slice(0, -1) + '1';
        else if (/^IS\d+DV\?$/.test(command)) reply = command.slice(0, -1) + '2';
        else if (command === 'Z1SMD?') reply = 'Z1SMD0';
        else if (command.endsWith('?') && command.slice(0, -1) in states) reply = command.slice(0, -1) + states[command.slice(0, -1)];
        else {
          const match = /^(Z[12](?:POW|MUT|INP|PVOL|VOL|ALM)|GCFPB|GCLEDB)([+-]?\d+(?:\.\d+)?)$/.exec(command);
          if (match) { states[match[1]] = Number(match[2]); reply = command; }
        }
        if (reply) socket.write(reply + ';');
      }
    });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return { port: server.address().port, states, commands, rejected, sockets, get connections() { return connections; },
    close: async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); } };
}
module.exports = { fakeReceiver };
