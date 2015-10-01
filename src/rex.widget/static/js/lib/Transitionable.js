/**
 * @copyright 2015, Prometheus Research, LLC
 */

import transit from 'transit-js';

let _readerConfig = {

  handlers: {},

  arrayBuilder: {
    init() {
      return [];
    },
    add(ret, val) {
      ret.push(val);
      return ret;
    },
    finalize(ret) {
      return ret;
    },
    fromArray(arr) {
      return arr;
    }
  },

  mapBuilder: {
    init() {
      return {};
    },
    add(ret, key, val) {
      ret[key] = val;
      return ret;
    },
    finalize(ret) {
      return ret;
    }
  }
};

/**
 * Decode transit payload into object model.
 */
export function decode(string) {
  let reader = transit.reader('json', _readerConfig);
  return reader.read(string);
}

/**
 * Register decode handler for a tag.
 */
export function register(tag, handler) {
  _readerConfig.handlers[tag] = handler;
}
