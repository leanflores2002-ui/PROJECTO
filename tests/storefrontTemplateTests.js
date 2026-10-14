const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {renderPage, pages, generatedPages} = require('../scripts/sync-storefront-shells');
const root = path.join(__dirname, '..');
const sources = path.join(root, 'frontend/src/templates');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'romix-template-test-'));
fs.mkdirSync(path.join(temp, 'partials'));
try {
  for (const kind of ['header', 'footer']) {
    fs.copyFileSync(path.join(sources, 'partials', kind + '.html'), path.join(temp, 'partials', kind + '.html'));
  }
  for (const page of pages) {
    const template = fs.readFileSync(path.join(sources, page), 'utf8');
    assert(!template.includes('data-romix-shell="header-v1"'), page + ': header must have one shared source');
    assert(!template.includes('data-romix-shell="footer-v1"'), page + ': footer must have one shared source');
    assert.equal(renderPage(page), fs.readFileSync(path.join(root, 'frontend/public', page), 'utf8'), page + ': generated HTML is stale');
    fs.copyFileSync(path.join(sources, page), path.join(temp, page));
  }
  fs.appendFileSync(path.join(temp, 'partials/header.html'), '<!-- shared-header-change -->');
  fs.appendFileSync(path.join(temp, 'partials/footer.html'), '<!-- shared-footer-change -->');
  for (const page of pages) {
    const output = renderPage(page, temp);
    assert.equal(output.split('<!-- shared-header-change -->').length, 2);
    assert.equal(output.split('<!-- shared-footer-change -->').length, 2);
  }
  const firstPage = pages[0];
  const original = fs.readFileSync(path.join(temp, firstPage), 'utf8');
  fs.writeFileSync(path.join(temp, firstPage), original.replace('<!-- ROMIX:INCLUDE:HEADER -->', ''));
  assert.throws(() => renderPage(firstPage, temp), /exactly one header/);
  fs.writeFileSync(path.join(temp, firstPage), original + '<!-- ROMIX:INCLUDE:HEADER -->');
  assert.throws(() => renderPage(firstPage, temp), /exactly one header/);
  assert.throws(() => renderPage('../index.html', temp), /Unknown storefront page/);
  for (const name of ['.sonarcloud.properties', 'sonar-project.properties']) {
    const config = fs.readFileSync(path.join(root, name), 'utf8');
    assert(!/^sonar\.exclusions=/m.test(config), 'Do not exclude generated pages from bug/security analysis');
    const exclusions = config.match(/^sonar\.cpd\.exclusions=(.*)$/m)[1].split(',');
    assert.deepEqual(exclusions, generatedPages.map(page => 'frontend/public/' + page));
  }
  console.log('storefrontTemplateTests: passed');
} finally {
  fs.rmSync(temp, {recursive: true, force: true});
}
