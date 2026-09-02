import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import {
  EDGE_GAP,
  NODE_STEP,
  WORKFLOW_LAYOUTS,
  validateWorkflowLayout,
} from './workflow_layouts.mjs';

const root = resolve(import.meta.dirname, '..');
const workflowFiles = [
  'workflows/gmail_multi_label_to_sheets_drive.json',
  'workflows/telegram_receipts_to_sheets_drive.json',
];

const supportedVersions = new Map([
  ['n8n-nodes-base.scheduleTrigger', new Set([1.3])],
  ['n8n-nodes-base.gmail', new Set([2.1])],
  ['n8n-nodes-base.googleSheets', new Set([4.5])],
  ['n8n-nodes-base.googleDrive', new Set([3])],
  ['n8n-nodes-base.telegramTrigger', new Set([1.3])],
  ['n8n-nodes-base.telegram', new Set([1.2])],
  ['@n8n/n8n-nodes-langchain.googleGemini', new Set([1.2])],
  ['n8n-nodes-base.code', new Set([2])],
  ['n8n-nodes-base.if', new Set([2.2])],
  ['n8n-nodes-base.merge', new Set([3.2])],
  ['n8n-nodes-base.splitInBatches', new Set([3])],
  ['n8n-nodes-base.stickyNote', new Set([1])],
]);

const triggerTypes = new Set(['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.telegramTrigger']);
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

check(NODE_STEP === 208, 'canonical node step must remain 208px');
check(EDGE_GAP === 112, 'canonical edge gap must remain 112px');

function walk(value, visitor, path = '$') {
  visitor(value, path);
  if (Array.isArray(value)) value.forEach((entry, index) => walk(entry, visitor, path + '[' + index + ']'));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, entry]) => walk(entry, visitor, path + '.' + key));
}

function validateExpressions(workflow, file) {
  walk(workflow, (value, path) => {
    if (typeof value !== 'string' || !value.startsWith('={{') || !value.endsWith('}}')) return;
    const expression = value.slice(3, -2).trim();
    try {
      new vm.Script('(' + expression + ')');
      check(true, '');
    } catch (error) {
      check(false, file + ' has invalid expression at ' + path + ': ' + error.message);
    }
  });
}

function reachableNames(workflow) {
  const queue = workflow.nodes.filter((entry) => triggerTypes.has(entry.type)).map((entry) => entry.name);
  const seen = new Set(queue);
  while (queue.length) {
    const current = queue.shift();
    const outputs = workflow.connections[current]?.main || [];
    for (const branch of outputs) {
      for (const link of branch || []) {
        if (!seen.has(link.node)) {
          seen.add(link.node);
          queue.push(link.node);
        }
      }
    }
  }
  return seen;
}

function credentialBindings(node) {
  return Object.values(node.credentials || {});
}

for (const relativeFile of workflowFiles) {
  const file = resolve(root, relativeFile);
  let workflow;
  try {
    workflow = JSON.parse(await readFile(file, 'utf8'));
    check(true, '');
  } catch (error) {
    check(false, relativeFile + ' is not valid JSON: ' + error.message);
    continue;
  }

  check(workflow.active === false, relativeFile + ' must export inactive');
  check(workflow.settings?.executionOrder === 'v1', relativeFile + ' must use executionOrder v1');
  check(workflow.settings?.timezone === 'Asia/Manila', relativeFile + ' must use Asia/Manila');
  check(typeof workflow.id === 'string' && workflow.id.length >= 8, relativeFile + ' needs a stable workflow ID');

  const names = workflow.nodes.map((entry) => entry.name);
  const ids = workflow.nodes.map((entry) => entry.id);
  check(new Set(names).size === names.length, relativeFile + ' has duplicate node names');
  check(new Set(ids).size === ids.length, relativeFile + ' has duplicate node IDs');
  const knownNames = new Set(names);

  const layoutSpec = WORKFLOW_LAYOUTS[workflow.id];
  check(Boolean(layoutSpec), relativeFile + ' has no registered deterministic layout');
  if (layoutSpec) {
    check(layoutSpec.file === relativeFile.split('/').at(-1), relativeFile + ' is registered under the wrong layout filename');
    try {
      validateWorkflowLayout(workflow);
      check(true, '');
    } catch (error) {
      check(false, relativeFile + ' has an invalid layout registry: ' + error.message);
    }
    check(workflow.nodes.every((entry) => JSON.stringify(entry.position) === JSON.stringify(layoutSpec.positions[entry.name])), relativeFile + ' positions do not match the deterministic layout');
    check(new Set(workflow.nodes.map((entry) => entry.position.join(','))).size === workflow.nodes.length, relativeFile + ' has duplicate node coordinates');

    const operational = workflow.nodes.filter((entry) => entry.type !== 'n8n-nodes-base.stickyNote');
    const firstOperationalY = Math.min(...operational.map((entry) => entry.position[1]));
    for (const note of workflow.nodes.filter((entry) => entry.type === 'n8n-nodes-base.stickyNote')) {
      check(note.position[1] + Number(note.parameters.height ?? 160) <= firstOperationalY - EDGE_GAP, relativeFile + ' has a sticky note inside the seven-dot canvas gap: ' + note.name);
    }
  }

  for (const node of workflow.nodes) {
    check(supportedVersions.has(node.type), relativeFile + ' has unsupported node type ' + node.type + ' at ' + node.name);
    check(supportedVersions.get(node.type)?.has(node.typeVersion), relativeFile + ' has unsupported ' + node.type + ' version ' + node.typeVersion + ' at ' + node.name);
    if (node.type === 'n8n-nodes-base.code') {
      try {
        new Function(node.parameters.jsCode);
        check(true, '');
      } catch (error) {
        check(false, relativeFile + ' has invalid Code syntax at ' + node.name + ': ' + error.message);
      }
    }
    for (const credential of credentialBindings(node)) {
      check(String(credential.id || '').startsWith('REPLACE_'), relativeFile + ' embeds a credential ID at ' + node.name);
      check(String(credential.name || '').startsWith('REPLACE_'), relativeFile + ' embeds a credential name at ' + node.name);
    }
  }

  for (const [source, outputs] of Object.entries(workflow.connections || {})) {
    check(knownNames.has(source), relativeFile + ' connection source does not exist: ' + source);
    for (const branch of outputs.main || []) {
      for (const link of branch || []) {
        check(knownNames.has(link.node), relativeFile + ' connection target does not exist: ' + link.node);
      }
    }
  }

  const reachable = reachableNames(workflow);
  const functionalNodes = workflow.nodes.filter((entry) => entry.type !== 'n8n-nodes-base.stickyNote');
  check(workflow.nodes.some((entry) => triggerTypes.has(entry.type)), relativeFile + ' has no trigger');
  for (const item of functionalNodes) check(reachable.has(item.name), relativeFile + ' has unreachable functional node ' + item.name);

  validateExpressions(workflow, relativeFile);

  const serialized = JSON.stringify(workflow);
  check(!/[A-Za-z]:\\Users\\/i.test(serialized), relativeFile + ' leaks a local Windows path');
  check(!/AIza[0-9A-Za-z_-]{20,}/.test(serialized), relativeFile + ' appears to contain a Google API key');
  check(!/\b\d{8,12}:[A-Za-z0-9_-]{20,}\b/.test(serialized), relativeFile + ' appears to contain a Telegram bot token');

  for (const node of workflow.nodes.filter((entry) => entry.type === 'n8n-nodes-base.googleSheets')) {
    check(node.parameters.documentId?.value === 'REPLACE_SPREADSHEET_ID', relativeFile + ' embeds a spreadsheet ID at ' + node.name);
  }
  const folderValues = workflow.nodes
    .filter((entry) => entry.type === 'n8n-nodes-base.googleDrive')
    .map((entry) => entry.parameters.folderId?.value)
    .filter((value) => typeof value === 'string' && !value.startsWith('={{'));
  for (const value of folderValues) {
    check(value === 'REPLACE_GMAIL_ATTACHMENTS_ROOT_FOLDER_ID' || value === 'REPLACE_TELEGRAM_RECEIPTS_ROOT_FOLDER_ID', relativeFile + ' embeds a Drive folder ID: ' + value);
  }

  if (workflow.id === 'GmailDocumentIntake01') {
    const schedule = workflow.nodes.find((entry) => entry.name === 'Every 5 Minutes');
    check(schedule?.parameters?.rule?.interval?.[0]?.minutesInterval === 5, 'Gmail workflow schedule is not every five minutes');
    const searches = workflow.nodes.filter((entry) => entry.type === 'n8n-nodes-base.gmail' && entry.parameters.operation === 'getAll');
    check(searches.length === 3, 'Gmail workflow must have three independent searches');
    check(searches.every((entry) => entry.parameters.limit === 50), 'Gmail searches must cap at 50 messages');
    check(searches.every((entry) => entry.parameters.filters?.readStatus === 'both'), 'Gmail searches must include read and unread mail');
    check(searches.every((entry) => entry.parameters.options?.downloadAttachments === true), 'Gmail searches must download attachments');
    check(!workflow.nodes.some((entry) => entry.type === 'n8n-nodes-base.gmail' && ['markAsRead', 'removeLabels', 'addLabels', 'delete'].includes(entry.parameters.operation)), 'Gmail workflow mutates inbox state');
    check(serialized.includes('document_intake_attachment_key'), 'Gmail workflow is missing Drive idempotency appProperties');
    check(serialized.includes('email_key') && serialized.includes('attachment_key'), 'Gmail workflow is missing idempotency keys');
    check(serialized.includes('NO_ATTACHMENTS') && serialized.includes('PARTIAL') && serialized.includes('FAILED'), 'Gmail workflow is missing required outcomes');
  }

  if (workflow.id === 'TelegramReceiptIntake01') {
    const trigger = workflow.nodes.find((entry) => entry.type === 'n8n-nodes-base.telegramTrigger');
    check(trigger?.typeVersion === 1.3, 'Telegram Trigger must be version 1.3');
    check(trigger?.parameters?.additionalFields?.download === true, 'Telegram Trigger must download image bytes');
    check(trigger?.parameters?.additionalFields?.imageSize === 'extraLarge', 'Telegram Trigger must select the largest configured image size');
    const gemini = workflow.nodes.find((entry) => entry.type === '@n8n/n8n-nodes-langchain.googleGemini');
    check(gemini?.typeVersion === 1.2, 'Google Gemini must be version 1.2');
    check(gemini?.parameters?.modelId?.value === 'REPLACE_GEMINI_MODEL_ID', 'Gemini model must remain a placeholder');
    check(gemini?.parameters?.inputType === 'binary', 'Gemini must receive binary image input');
    check(serialized.includes('NOT_LIVE_TESTED'), 'Telegram workflow must state NOT_LIVE_TESTED');
    check(serialized.includes('document_intake_receipt_key') && serialized.includes('document_intake_file_unique_id'), 'Telegram workflow is missing both dedupe appProperties');
    check(serialized.includes('DUPLICATE') && serialized.includes('NEEDS_REVIEW') && serialized.includes('FAILED'), 'Telegram workflow is missing required outcomes');
  }
}

if (failures.length) {
  process.stderr.write('Workflow validation failed (' + failures.length + ' failures):\n- ' + failures.join('\n- ') + '\n');
  process.exitCode = 1;
} else {
  process.stdout.write('Workflow validation passed: ' + checks + ' checks across ' + workflowFiles.length + ' exports.\n');
}
