import '@testing-library/jest-dom';

// Jest 27 environments lack the Web Streams, Blob and encoding APIs used by @zip.js/zip.js; borrow Node's
const streams = require('stream/web');
const { Blob } = require('buffer');
const util = require('util');
const g = global as any;
for (const name of ['ReadableStream', 'WritableStream', 'TransformStream', 'CompressionStream', 'DecompressionStream']) {
  if (!g[name] && streams[name]) g[name] = streams[name];
}
if (!g.Blob) g.Blob = Blob;
if (!g.TextEncoder) g.TextEncoder = util.TextEncoder;
if (!g.TextDecoder) g.TextDecoder = util.TextDecoder;
if (!g.crypto || !g.crypto.getRandomValues) g.crypto = require('crypto').webcrypto;
