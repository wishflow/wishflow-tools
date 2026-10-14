import assert from 'node:assert/strict';
import test from 'node:test';
import { getAlternateDeploymentUrl } from '../src/index.js';

test('Cloudflare Pages maps the current path and route to GitHub Pages', () => {
  assert.equal(
    getAlternateDeploymentUrl({
      hostname: 'wishflow-tools.pages.dev',
      pathname: '/3d-objects/',
      search: '?source=home',
      hash: '#/objects/house?tab=parts',
    }),
    'https://wishflow.github.io/wishflow-tools/3d-objects/?source=home#/objects/house?tab=parts',
  );
});

test('GitHub Pages removes its repository prefix when mapping to Cloudflare Pages', () => {
  assert.equal(
    getAlternateDeploymentUrl({
      hostname: 'wishflow.github.io',
      pathname: '/wishflow-tools/3d-objects/',
      search: '?source=mirror',
      hash: '#/objects/house',
    }),
    'https://wishflow-tools.pages.dev/3d-objects/?source=mirror#/objects/house',
  );
});

test('deployment root paths map in both directions', () => {
  assert.equal(
    getAlternateDeploymentUrl({ hostname: 'wishflow-tools.pages.dev', pathname: '/', search: '', hash: '' }),
    'https://wishflow.github.io/wishflow-tools/',
  );
  assert.equal(
    getAlternateDeploymentUrl({ hostname: 'wishflow.github.io', pathname: '/wishflow-tools/', search: '', hash: '' }),
    'https://wishflow-tools.pages.dev/',
  );
});

test('local development and paths outside GitHub Pages site have no deployment switch', () => {
  assert.equal(
    getAlternateDeploymentUrl({ hostname: 'localhost', pathname: '/3d-objects/', search: '', hash: '' }),
    null,
  );
  assert.equal(
    getAlternateDeploymentUrl({ hostname: 'wishflow.github.io', pathname: '/another-project/', search: '', hash: '' }),
    null,
  );
});
