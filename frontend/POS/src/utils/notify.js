// POS notify shim: mimic react-hot-toast API, but suppress UI and play sounds only.
import playPosSound from './sound';

const noop = () => {};

let counter = 0;

const toast = {
  success: (_msg) => playPosSound('success'),
  error: (_msg) => playPosSound('error'),
  info: (_msg) => playPosSound('info'),
  warning: (_msg) => playPosSound('warning'),
  // generic
  dismiss: (_id) => {},
  // loading returns an id so callers can dismiss later
  loading: (_msg) => {
    playPosSound('info');
    return `ld-${++counter}`;
  },
  // utility sometimes used by session manager
  getToasts: () => [],
  // neutral/custom
  custom: (_renderer, _opts) => playPosSound('info'),
};

export const Toaster = () => null;

export default toast;
