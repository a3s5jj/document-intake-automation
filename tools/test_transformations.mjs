import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const readJson = async (relative) => JSON.parse(await readFile(resolve(root, relative), 'utf8'));
const gmailWorkflow = await readJson('workflows/gmail_multi_label_to_sheets_drive.json');
const telegramWorkflow = await readJson('workflows/telegram_receipts_to_sheets_drive.json');
const gmailFixtures = await readJson('fixtures/gmail_messages.json');
const telegramFixtures = await readJson('fixtures/telegram_updates.json');
const geminiFixtures = await readJson('fixtures/gemini_responses.json');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function workflowCode(workflow, nodeName) {
  const found = workflow.nodes.find((node) => node.name === nodeName);
  assert.ok(found, 'missing workflow node ' + nodeName);
  return found.parameters.jsCode;
}

async function runCode(code, { item = { json: {}, binary: {} }, items, nodeOutputs = {} } = {}) {
  const allItems = items || [item];
  const lookup = (name) => {
    const value = nodeOutputs[name];
    if (!value) throw new Error('No mocked output for node ' + name);
    const normalized = Array.isArray(value) ? value : [value];
    return { item: normalized[0], all: () => normalized };
  };
  const context = {
    $input: { item, all: () => allItems },
    $json: item.json,
    $binary: item.binary || {},
    $: lookup,
    console,
  };
  return await new vm.Script('(async () => {\n' + code + '\n})()').runInNewContext(context);
}

const gmailNormalizeCode = workflowCode(gmailWorkflow, 'Normalize Gmail Message');
const gmailExplodeCode = workflowCode(gmailWorkflow, 'Explode Gmail Attachments');
const gmailFinalizeCode = workflowCode(gmailWorkflow, 'Finalize Gmail Email');
const captureAttachmentCode = workflowCode(gmailWorkflow, 'Capture Uploaded Attachment');
const telegramNormalizeCode = workflowCode(telegramWorkflow, 'Normalize Telegram Update');
const telegramValidateCode = workflowCode(telegramWorkflow, 'Validate Gemini Receipt');
const duplicateRowCode = workflowCode(telegramWorkflow, 'Build Duplicate Receipt Row');
const telegramUploadFailureCode = workflowCode(telegramWorkflow, 'Build Upload Failure Receipt');

test('Gmail sender parsing, Unicode filename, multiple and repeated filenames', async () => {
  const result = await runCode(gmailNormalizeCode, { item: gmailFixtures.named_sender_multiple_attachments });
  assert.equal(result.json.sender_name, 'María Santos');
  assert.equal(result.json.sender_email, 'maria@example.test');
  assert.equal(result.json.attachment_count, 3);
  assert.equal(JSON.stringify(result.json.attachments.map((entry) => entry.original_filename)), JSON.stringify(['résumé 你好.pdf', 'invoice.txt', 'invoice.txt']));
  assert.equal(JSON.stringify(result.json.attachments.map((entry) => entry.attachment_key)), JSON.stringify([
    'msg-multi-001:Label_Test_1:0', 'msg-multi-001:Label_Test_1:1', 'msg-multi-001:Label_Test_1:2',
  ]));
});

test('Gmail missing display name falls back to sender email and supports no attachments', async () => {
  const result = await runCode(gmailNormalizeCode, { item: gmailFixtures.email_only_no_attachment });
  assert.equal(result.json.sender_name, 'fallback@example.test');
  assert.equal(result.json.sender_folder, 'fallback@example.test');
  assert.equal(result.json.attachment_count, 0);
  assert.equal(result.json.email_key, 'msg-empty-001:Label_Test_2');
});

test('Gmail multi-label copies produce distinct replay-safe keys', () => {
  const fixture = gmailFixtures.multilabel_copy;
  const keys = fixture.label_ids.map((label) => fixture.message_id + ':' + label);
  assert.equal(new Set(keys).size, 2);
  assert.notEqual(keys[0], keys[1]);
});

test('Gmail explode keeps exact filenames and binary bytes', async () => {
  const normalized = await runCode(gmailNormalizeCode, { item: gmailFixtures.named_sender_multiple_attachments });
  const foldered = { json: { ...normalized.json, sender_folder_id: 'folder-fixture', folder_url: 'https://drive.example.test/folder-fixture' } };
  const result = await runCode(gmailExplodeCode, {
    item: foldered,
    items: [foldered],
    nodeOutputs: { 'Normalize Gmail Message': normalized },
  });
  assert.equal(result.length, 3);
  assert.equal(result[0].json.original_filename, 'résumé 你好.pdf');
  assert.equal(result[1].binary.data.data, 'fixture-b');
  assert.equal(result[2].binary.data.data, 'fixture-c');
});

test('Gmail finalizer reports COMPLETE, PARTIAL, and FAILED accurately', async () => {
  const base = { email_key: 'm:l', original_filename: 'a.txt', attachment_status: 'COMPLETE', attachment_error: '' };
  const complete = await runCode(gmailFinalizeCode, { items: [{ json: base }, { json: { ...base, original_filename: 'b.txt' } }] });
  assert.equal(complete[0].json.status, 'COMPLETE');
  const partial = await runCode(gmailFinalizeCode, { items: [{ json: base }, { json: { ...base, original_filename: 'b.txt', attachment_status: 'FAILED', attachment_error: 'simulated' } }] });
  assert.equal(partial[0].json.status, 'PARTIAL');
  assert.match(partial[0].json.error, /simulated/);
  const failed = await runCode(gmailFinalizeCode, { items: [{ json: { ...base, attachment_status: 'FAILED', attachment_error: 'simulated' } }] });
  assert.equal(failed[0].json.status, 'FAILED');
});

test('Gmail simulated Drive integration failure never reports complete', async () => {
  const result = await runCode(captureAttachmentCode, {
    item: { json: { attachment_key: 'm:l:0', email_key: 'm:l', original_filename: 'x.bin', error: { message: 'simulated Drive outage' } }, binary: { data: { data: 'bytes' } } },
  });
  assert.equal(result.json.attachment_status, 'FAILED');
  assert.match(result.json.attachment_error, /simulated Drive outage/);
});

test('Telegram chooses the highest-resolution/largest photo and uses Manila submission date', async () => {
  const result = await runCode(telegramNormalizeCode, { item: telegramFixtures.photo });
  assert.equal(result.json.accepted, true);
  assert.equal(result.json.file_id, 'largest');
  assert.equal(result.json.file_unique_id, 'unique-largest');
  assert.match(result.json.submission_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(result.json.drive_filename, 'telegram_12345_77.jpg');
});

test('Telegram accepts image documents and rejects non-image updates', async () => {
  const document = await runCode(telegramNormalizeCode, { item: telegramFixtures.image_document });
  assert.equal(document.json.accepted, true);
  assert.equal(document.json.extension, 'webp');
  const rejected = await runCode(telegramNormalizeCode, { item: telegramFixtures.non_image });
  assert.equal(rejected.json.accepted, false);
  assert.match(rejected.json.rejection_reason, /photo or image document/);
});

const uploadContext = {
  json: {
    receipt_key: '12345:77', submitted_at: '2026-08-31T00:00:00.000Z', chat_id: '12345', message_id: '77',
    file_unique_id: 'unique-largest', submitter: 'Test Applicant', drive_file_id: 'drive-fixture',
    drive_file_url: 'https://drive.example.test/drive-fixture',
  },
};

test('Gemini JSON validation normalizes valid values without invention', async () => {
  const result = await runCode(telegramValidateCode, {
    item: { json: geminiFixtures.complete },
    nodeOutputs: { 'Capture Telegram Upload': uploadContext },
  });
  assert.equal(result.json.status, 'COMPLETE');
  assert.equal(result.json.amount, 123.45);
  assert.equal(result.json.currency, 'PHP');
  assert.equal(result.json.receipt_date, '2026-08-31');
});

test('Gemini ambiguous fields become NEEDS_REVIEW and stay null', async () => {
  const result = await runCode(telegramValidateCode, {
    item: { json: geminiFixtures.ambiguous },
    nodeOutputs: { 'Capture Telegram Upload': uploadContext },
  });
  assert.equal(result.json.status, 'NEEDS_REVIEW');
  assert.equal(result.json.merchant_name, null);
  assert.equal(result.json.amount, null);
  assert.match(result.json.review_reason, /merchant_name/);
});

test('Invalid Gemini output is FAILED while preserving the already-uploaded Drive image', async () => {
  const result = await runCode(telegramValidateCode, {
    item: { json: geminiFixtures.invalid_json },
    nodeOutputs: { 'Capture Telegram Upload': uploadContext },
  });
  assert.equal(result.json.status, 'FAILED');
  assert.equal(result.json.drive_file_id, 'drive-fixture');
  assert.match(result.json.review_reason, /Unexpected token|JSON/);
});

test('Telegram duplicate row and simulated upload failure use explicit outcomes', async () => {
  const duplicateInput = {
    json: {
      receipt_key: '12345:88', submitted_at: '2026-08-31T00:00:00.000Z', chat_id: '12345', message_id: '88',
      file_unique_id: 'unique-largest', submitter: 'Test Applicant', duplicate_drive_file_id: 'existing-drive-id', duplicate_drive_file_url: 'https://drive.example.test/existing',
    },
  };
  const duplicate = await runCode(duplicateRowCode, { item: duplicateInput });
  assert.equal(duplicate.json.status, 'DUPLICATE');
  assert.equal(duplicate.json.drive_file_id, 'existing-drive-id');
  const failed = await runCode(telegramUploadFailureCode, { item: { json: { ...duplicateInput.json, upload_error: 'simulated integration failure' } } });
  assert.equal(failed.json.status, 'FAILED');
  assert.match(failed.json.review_reason, /simulated integration failure/);
});

let failed = 0;
for (const entry of tests) {
  try {
    await entry.fn();
    process.stdout.write('ok - ' + entry.name + '\n');
  } catch (error) {
    failed += 1;
    process.stderr.write('not ok - ' + entry.name + '\n' + (error.stack || error.message) + '\n');
  }
}

process.stdout.write('\n' + (tests.length - failed) + '/' + tests.length + ' transformation tests passed.\n');
if (failed) process.exitCode = 1;
