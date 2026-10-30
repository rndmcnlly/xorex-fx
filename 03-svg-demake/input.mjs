const arrows = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

// No global cooldown: each key has its own edge latch. Call clear on focus loss.
export function createKeyboard({ mode, start, action }) {
  const held = new Set();
  return {
    down(event) {
      const command = arrows[event.key];
      if (!command) return;
      event.preventDefault();
      if (held.has(event.key) || event.repeat) return;
      held.add(event.key);
      if (mode() === 'ready') {
        if (command === 'up' || command === 'down') start();
      } else if (mode() === 'playing') action(command);
    },
    up(event) { held.delete(event.key); },
    clear() { held.clear(); },
  };
}
