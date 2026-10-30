// Visual fixture only. This deliberately does not implement Xorex rules.
export const palette = ['#f44765', '#50de8a', '#499cff', '#ffcf50', '#b77aff', '#15171d'];
export const names = ['ruby', 'emerald', 'sapphire', 'gold', 'violet', 'dark'];
export const gems = Array.from({length: 30}, (_, i) => ({
  lane: i % 5, row: Math.floor(i / 5), color: (i * 7 + Math.floor(i / 5) * 2) % 6,
}));
export function initialState() { return {lane: 2, color: 0, actions: 0}; }
export function reduce(state, action) {
  if (!['left', 'right', 'color', 'pulse'].includes(action)) return state;
  return {...state, lane: Math.max(0, Math.min(4, state.lane + (action === 'left' ? -1 : action === 'right' ? 1 : 0))),
    color: action === 'color' ? (state.color + 1) % palette.length : state.color, actions: state.actions + 1};
}
