define('fetch', ['exports'], function (exports) {
  'use strict';
  Object.defineProperty(exports, '__esModule', { value: true });
  exports.default = window.fetch.bind(window);
  exports.Headers = window.Headers;
  exports.Request = window.Request;
  exports.Response = window.Response;
  exports.AbortController = window.AbortController;
});
