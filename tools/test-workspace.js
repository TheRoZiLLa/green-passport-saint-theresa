// Lightweight offline smoke test: checks page renderers with empty data.
// Does not call the production database or simulate password authentication.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const bundlePath = path.join(__dirname, '..', 'assets', 'js', 'app.bundle.js');
let source = fs.readFileSync(bundlePath, 'utf8');
source = source.slice(source.indexOf('// ---- src/js/02-config-data.js')).replace(/\binit\(\);\s*$/, '');

function run(role) {
  const elements = new Map();
  const element = () => ({
    innerHTML: '', textContent: '', hidden: false, value: '', dataset: {}, style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    querySelectorAll() { return []; }, querySelector() { return null; },
    setAttribute() {}, removeAttribute() {}, addEventListener() {},
    replaceChildren() {}, scrollIntoView() {}, focus() {}, append() {}, prepend() {},
  });
  const document = {
    body: element(),
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    querySelectorAll() { return []; }, querySelector() { return null; }, createElement: element,
  };
  const storage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  const context = vm.createContext({
    console, document, window: { requestIdleCallback: () => 1 }, localStorage: storage,
    sessionStorage: storage, URLSearchParams, URL, location: { search: '', hash: '' },
    requestAnimationFrame() {}, setTimeout, clearTimeout, alert() {},
    FormData: class { entries() { return []; } }, role,
  });
  vm.runInContext(source, context);
  vm.runInContext(`state.currentUser = normalizeAuthUser({UserID:'test-id', DisplayName:'Test User', FirstName:'Test', LastName:'User', Role:role}); applyCurrentUserToState(); renderNav();`, context);
  const sidebar = document.getElementById('sideNav').innerHTML;
  const staff = role === 'admin' || role === 'teacher';
  assert.equal(sidebar.includes('data-page="admin"'), staff);
  const pageIds = vm.runInContext('pages.map(p=>p[0])', context);
  for (const page of pageIds) {
    if (page === 'admin' && !staff) continue;
    context.pageId = page;
    vm.runInContext('state.active = pageId; renderAll()', context);
    assert.ok(document.getElementById(page).innerHTML.trim(), `${role}: ${page} did not render`);
  }
  const record = document.getElementById('record').innerHTML;
  for (const field of ['ReportMonth', 'EvidenceFiles', 'GeneralWasteKg', 'Consent']) assert.ok(record.includes(`name="${field}"`));
  assert.equal((record.match(/data-record-step=/g) || []).length, 3);
  assert.ok(document.getElementById('mobileNav').innerHTML.includes('showWorkspaceMenu'));
  if (staff) assert.equal(document.getElementById('admin').innerHTML.includes('data-admin-tab="members"'), role === 'admin');
  console.log(`${role}: ${pageIds.length - (staff ? 0 : 1)} page renderers passed`);
}

run('student');
run('teacher');
run('admin');
