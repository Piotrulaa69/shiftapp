const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function load(file, dependencies, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(read(file), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    }, console: { warn() {}, error() {} }, setTimeout, clearTimeout, ...globals,
  }, { filename: file });
  return module.exports;
}

function mockDatabase(responses) {
  const calls = [];
  const builder = {};
  for (const name of ['select', 'eq', 'order', 'insert', 'update', 'delete', 'in', 'not']) {
    builder[name] = (...args) => { calls.push([name, ...args]); return builder; };
  }
  for (const name of ['single', 'maybeSingle']) builder[name] = () => Promise.resolve(responses.shift());
  builder.then = (resolve, reject) => Promise.resolve(responses.shift()).then(resolve, reject);
  const supabase = {
    from: (table) => { calls.push(['from', table]); return builder; },
    rpc: (name, args) => { calls.push(['rpc', name, args]); return Promise.resolve(responses.shift()); },
    auth: { refreshSession: async () => ({ error: null }) },
  };
  const db = load('lib/db.ts', {
    './supabase': { supabase },
    './query-cache': { cached: (_key, fetcher) => fetcher(), invalidate() {} },
    './retry': { retrySupabase: (operation) => operation(), isSessionError: () => false, createClientUuid: () => 'stable-id' },
  });
  return { db, calls };
}

test('all restaurant categories are returned, not a fixed seven', async () => {
  const rows = Array.from({ length: 12 }, (_, id) => ({ id, name: `Category ${id}` }));
  const { db } = mockDatabase([{ data: rows, error: null }]);
  assert.equal((await db.getTrainingCategories('restaurant', true)).length, 12);
});

test('category permission failures are not disguised as an empty fallback list', async () => {
  const { db } = mockDatabase([{ data: null, error: { code: '42501' } }]);
  await assert.rejects(db.ensureTrainingCategories('restaurant'));
});

test('opening an empty category manager never recreates deleted defaults', async () => {
  const { db, calls } = mockDatabase([{ data: [], error: null }]);
  assert.equal((await db.ensureTrainingCategories('restaurant')).length, 0);
  assert.equal(calls.some(([name]) => name === 'insert'), false);
});

test('an update affecting no course is not reported as saved', async () => {
  const { db } = mockDatabase([{ data: null, error: null }]);
  assert.equal(await db.updateCourse('course', { title: 'Changed' }), false);
});

test('course reads fail explicitly instead of caching missing data', async () => {
  const { db } = mockDatabase([{ data: null, error: { code: '42501' } }]);
  await assert.rejects(db.getCourse('course'));
});

test('quiz grading uses server results and sends the explicit course scope', async () => {
  const { db, calls } = mockDatabase([{ data: [{ score: 50, passed: false, completed: false }], error: null }]);
  const result = await db.submitTrainingQuiz('course', 'course-id', { question: 'answer' });
  assert.equal(result.score, 50);
  assert.equal(calls[0][1], 'submit_training_quiz');
  assert.equal(calls[0][2].p_scope, 'course');
});

test('recovery after a lost category insert response uses the same generated id', async () => {
  const { db, calls } = mockDatabase([
    { data: null, error: { code: '23505' } },
    { data: { id: 'stable-id', name: 'Existing saved category' }, error: null },
  ]);
  assert.equal((await db.createTrainingCategory('restaurant', 'Test', '#2563EB')).category.id, 'stable-id');
  assert.equal(calls.find(([name]) => name === 'insert')[1].id, 'stable-id');
});

test('draft writes and clears stay ordered, including rapid save actions', async () => {
  const items = new Map();
  const drafts = load('lib/training-drafts.ts', {
    '@react-native-async-storage/async-storage': {}, 'react-native': { Platform: { OS: 'web' } },
  }, { localStorage: { getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value), removeItem: (key) => items.delete(key) } });
  await Promise.all([drafts.writeTrainingDraft('key', { title: 'First' }), drafts.writeTrainingDraft('key', { title: 'Second' })]);
  assert.equal((await drafts.readTrainingDraft('key')).value.title, 'Second');
  await Promise.all([drafts.writeTrainingDraft('key', { title: 'Third' }), drafts.clearTrainingDraft('key')]);
  assert.equal(await drafts.readTrainingDraft('key'), null);
});

test('cache cannot expose a previous account or reinsert its pending response', async () => {
  let authChanged;
  const cache = load('lib/query-cache.ts', { './supabase': { supabase: { auth: {
    onAuthStateChange: (callback) => { authChanged = callback; },
  } } } });
  let resolveOld;
  const old = cache.cached('courses:restaurant', () => new Promise((resolve) => { resolveOld = resolve; }));
  authChanged('SIGNED_OUT');
  assert.equal(await cache.cached('courses:restaurant', async () => 'new account'), 'new account');
  resolveOld('old account');
  await old;
  assert.equal(await cache.cached('courses:restaurant', async () => 'unexpected'), 'new account');
});

test('training navigation exposes category editing and no topic quiz editor', () => {
  const screen = read('app/(tabs)/szkolenia.tsx');
  const manage = read('app/(tabs)/kursy/manage.tsx');
  assert.match(screen, /Edytuj kategorie szkoleń/);
  assert.match(screen, /trainingCategories\.length/);
  assert.match(manage, /Quiz kursu/);
  assert.match(manage, /Quiz lekcji/);
  assert.doesNotMatch(manage, /FALLBACK_CATEGORIES|Quiz sprawdzający/);
  assert.doesNotMatch(read('app/(tabs)/kursy/topic.tsx'), /quiz_data|submitTrainingQuiz/);
  assert.match(manage, /draftKey\('quiz-course', selectedCourse\.id\)/);
});
