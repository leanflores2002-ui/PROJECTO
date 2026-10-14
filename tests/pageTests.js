const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const stubWindow = new JSDOM('<!doctype html>').window;
global.window = stubWindow;
global.document = stubWindow.document;
global.Node = stubWindow.Node;
global.Element = stubWindow.Element;
global.HTMLElement = stubWindow.HTMLElement;
globalThis.window = stubWindow;
globalThis.document = stubWindow.document;
globalThis.Node = stubWindow.Node;
globalThis.Element = stubWindow.Element;
globalThis.HTMLElement = stubWindow.HTMLElement;

const axe = require('axe-core');

const IGNORED_AXE_RULES = new Set(['document-title', 'html-has-lang']);
const pages = [
  { name: 'Catálogo', file: path.join(__dirname, '..', 'frontend', 'public', 'catalogo.html') }
];

const readHtml = filePath => {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  return fs.readFileSync(filePath, 'utf8');
};

async function runPageChecks(page) {
  const html = readHtml(page.file);
  const dom = new JSDOM(html);
  const { window } = dom;
  const document = window.document;

  const domIssues = [];
  if (!document.querySelector('main')) {
    domIssues.push('No <main> landmark detected.');
  }
  if (!document.querySelector('.grid')) {
    domIssues.push('Grid container (.grid) is missing.');
  }

  const prevGlobals = {
    window: global.window,
    document: global.document,
    Node: global.Node,
    Element: global.Element,
    HTMLElement: global.HTMLElement,
    globalWindow: globalThis.window,
    globalDocument: globalThis.document,
    globalNode: globalThis.Node,
    globalElement: globalThis.Element,
    globalHTMLElement: globalThis.HTMLElement
  };

  global.window = window;
  global.document = document;
  global.Node = window.Node;
  global.Element = window.Element;
  global.HTMLElement = window.HTMLElement;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.Node = window.Node;
  globalThis.Element = window.Element;
  globalThis.HTMLElement = window.HTMLElement;

  const axeResults = await axe.run(
    { include: [document.documentElement] },
    {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa']
      }
    }
  );

  const filteredViolations = axeResults.violations.filter(v => !IGNORED_AXE_RULES.has(v.id));
  const ignoredCount = axeResults.violations.length - filteredViolations.length;

  Object.assign(global, prevGlobals);
  globalThis.window = prevGlobals.globalWindow;
  globalThis.document = prevGlobals.globalDocument;
  globalThis.Node = prevGlobals.globalNode;
  globalThis.Element = prevGlobals.globalElement;
  globalThis.HTMLElement = prevGlobals.globalHTMLElement;

  return {
    name: page.name,
    file: page.file,
    domIssues,
    axeViolations: filteredViolations,
    ignoredViolations: ignoredCount
  };
}

async function main() {
  const reports = [];
  for (const page of pages) {
    try {
      reports.push(await runPageChecks(page));
    } catch (error) {
      console.error(`Error while analyzing ${page.name}:`, error);
      reports.push({
        name: page.name,
        file: page.file,
        domIssues: [`Error parsing page: ${error.message}`],
        axeViolations: []
      });
    }
  }

  let exitCode = 0;
  reports.forEach(report => {
    console.log(`\n=== ${report.name} (${report.file}) ===`);
    if (report.domIssues.length) {
      exitCode = 1;
      console.log('DOM checks failed:');
      report.domIssues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('DOM checks passed.');
    }

    if (report.axeViolations.length) {
      exitCode = 1;
      console.log(`axe accessibility violations (${report.axeViolations.length}):`);
      report.axeViolations.slice(0, 5).forEach(v => {
        console.log(`  - ${v.id} (${v.impact}): ${v.help}`);
      });
      if (report.axeViolations.length > 5) {
        console.log(`  ...and ${report.axeViolations.length - 5} more violations.`);
      }
      if (report.ignoredViolations) {
        console.log(`  (+${report.ignoredViolations} filtered warnings for document-title/html-has-lang)`);
      }
    } else {
      console.log('axe accessibility checks passed.');
      if (report.ignoredViolations) {
        console.log(`  (+${report.ignoredViolations} filtered warnings for document-title/html-has-lang)`);
      }
    }
  });

  process.exit(exitCode);
}

main().catch(err => {
  console.error('Unexpected error while running page tests:', err);
  process.exit(1);
});
