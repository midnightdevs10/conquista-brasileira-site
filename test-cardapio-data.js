const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('js/cardapio-data.js', 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const cd = sandbox.window.CardapioData;
console.log('CardapioData expõe:', Object.keys(cd).join(', '));
console.log('getSections inicial:', cd.getSections().length, 'sections');
console.log('getSectionOrder primeiros 3:', cd.getSectionOrder().slice(0,3).map(s => s.id).join(', '));

// Testa loadSections
const sectionsJson = JSON.parse(fs.readFileSync('data/cardapio-sections.json', 'utf8'));
const ok = cd.loadSections(sectionsJson);
console.log('loadSections(j):', ok, '— sections agora:', cd.getSections().length);

// Testa buildSections com menu de exemplo
const menuJson = JSON.parse(fs.readFileSync('data/config.json', 'utf8'));
const sections = cd.buildSections(menuJson.menu || menuJson);
console.log('buildSections(menu):', sections.length, 'sections construídas');
console.log('primeira:', sections[0].id, '— subgrupos:', sections[0].subgroups.length, '— items:', sections[0].subgroups[0].items.length);

// Testa compat com source string (legado)
const legacySections = [
  { id: 'test', name: 'Test', source: ['pasteis.tradicionais'], split: false }
];
cd.loadSections(legacySections);
const built = cd.buildSections(menuJson.menu || menuJson);
console.log('buildSections com source string legado:', built.length, 'sections — items na primeira:', built[0] && built[0].subgroups[0].items.length);

// Testa compat com source misto (string + objeto)
const mixed = [
  { id: 'a', name: 'A', source: ['pasteis.tradicionais'] },
  { id: 'b', name: 'B', source: [{ gid: 'pasteis', sgid: 'especiais-1' }] }
];
cd.loadSections(mixed);
const builtMixed = cd.buildSections(menuJson.menu || menuJson);
console.log('buildSections source misto:', builtMixed.length, '— A:', builtMixed[0].subgroups[0].items.length, '— B:', builtMixed[1].subgroups[0].items.length);
