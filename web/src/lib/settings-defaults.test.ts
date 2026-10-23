import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mergeSettings } from './settings-defaults';

test('mergeSettings: sahte kapanis suresi sinirlanir', () => {
  const s = mergeSettings({ fakeShutdownDurationSec: 9999 });
  assert.equal(s.fakeShutdownDurationSec, 600);
});
