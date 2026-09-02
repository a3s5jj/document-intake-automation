export const DOT_SIZE = 16;
export const NODE_SIZE = 96;
export const GAP_DOTS = 7;
export const EDGE_GAP = DOT_SIZE * GAP_DOTS;
export const NODE_STEP = NODE_SIZE + EDGE_GAP;

const grid = (column, row) => [column * NODE_STEP, row * NODE_STEP];
const lane = (row, startColumn, names) =>
  Object.fromEntries(names.map((name, index) => [name, grid(startColumn + index, row)]));
const noteAbove = (x, height) => [x, -(height + EDGE_GAP)];

export const GMAIL_WORKFLOW_LAYOUT = Object.freeze({
  'Configuration and Safety': noteAbove(0, 420),

  'Every 5 Minutes': grid(0, 1),
  ...lane(0, 1, ['Search Intake_Label1', 'Tag Intake_Label1']),
  ...lane(1, 1, [
    'Search Intake_Label2',
    'Tag Intake_Label2',
    'Merge Label Searches',
    'Process Emails Serially',
    'Normalize Gmail Message',
    'Build PROCESSING Email Row',
    'Upsert PROCESSING Email',
    'Restore Gmail Context',
    'Has Attachments?',
  ]),
  ...lane(2, 1, ['Search Intake_Label3', 'Tag Intake_Label3']),

  ...lane(3, 10, [
    'Set NO_ATTACHMENTS',
    'Build NO_ATTACHMENTS Email Row',
    'Upsert NO_ATTACHMENTS Email',
  ]),

  ...lane(4, 10, [
    'Find Label Folder',
    'Attach Label Search Result',
    'Label Folder Found?',
    'Use Existing Label Folder',
  ]),
  ...lane(5, 13, ['Create Label Folder', 'Capture Created Label Folder']),
  'Merge Label Folder': grid(15, 4),

  ...lane(6, 10, [
    'Find Date Folder',
    'Attach Date Search Result',
    'Date Folder Found?',
    'Use Existing Date Folder',
  ]),
  ...lane(7, 13, ['Create Date Folder', 'Capture Created Date Folder']),
  'Merge Date Folder': grid(15, 6),

  ...lane(8, 10, [
    'Find Sender Folder',
    'Attach Sender Search Result',
    'Sender Folder Found?',
    'Use Existing Sender Folder',
  ]),
  ...lane(9, 13, ['Create Sender Folder', 'Capture Created Sender Folder']),
  ...lane(8, 15, [
    'Merge Sender Folder',
    'Attach Sender Folder URL',
    'Explode Gmail Attachments',
    'Start Attachment Loop',
  ]),

  ...lane(10, 10, [
    'Process Attachments Serially',
    'Find Existing Attachment',
    'Attach Existing File Search',
    'Attachment Already Uploaded?',
    'Use Existing Attachment',
  ]),
  ...lane(11, 14, [
    'Restore Attachment Binary',
    'Upload Original Attachment',
    'Combine Attachment Upload Result',
    'Capture Uploaded Attachment',
  ]),
  ...lane(10, 18, [
    'Merge Attachment Outcome',
    'Build Gmail Attachment Row',
    'Upsert Gmail Attachment',
    'Restore Attachment Outcome',
    'Continue Attachment Loop',
  ]),

  ...lane(12, 18, [
    'Finalize Gmail Email',
    'Build Final Gmail Email Row',
    'Upsert Final Gmail Email',
  ]),
  ...lane(13, 19, [
    'Email Has Errors?',
    'Build Gmail Error Row',
    'Append Gmail Error',
  ]),
});

export const TELEGRAM_WORKFLOW_LAYOUT = Object.freeze({
  'Configuration and Test Boundary': noteAbove(0, 420),

  ...lane(0, 0, [
    'Telegram Receipt Trigger',
    'Normalize Telegram Update',
    'Accepted Receipt Image?',
    'Find Duplicate Receipt',
    'Attach Duplicate Search Result',
    'Duplicate Receipt?',
  ]),

  'Reject Non-Image Update': grid(3, 1),
  ...lane(1, 6, [
    'Build Duplicate Receipt Row',
    'Upsert Duplicate Receipt',
    'Reply Duplicate Receipt',
  ]),

  ...lane(2, 6, [
    'Find Submission Date Folder',
    'Attach Submission Date Search',
    'Submission Date Folder Found?',
    'Use Existing Submission Date Folder',
  ]),
  ...lane(3, 9, [
    'Create Submission Date Folder',
    'Capture Submission Date Folder',
  ]),
  ...lane(2, 10, [
    'Merge Submission Date Folder',
    'Restore Telegram Binary',
    'Upload Raw Receipt Image',
    'Capture Telegram Upload',
    'Raw Image Uploaded?',
  ]),

  ...lane(4, 15, [
    'Extract Receipt with Gemini',
    'Validate Gemini Receipt',
    'Upsert Telegram Receipt',
    'Reply Receipt Result',
  ]),
  ...lane(5, 17, [
    'Receipt Needs Error Log?',
    'Build Gemini Error Row',
    'Append Gemini Error',
  ]),

  ...lane(6, 15, [
    'Build Upload Failure Receipt',
    'Upsert Upload Failure',
    'Reply Upload Failure',
  ]),
  ...lane(7, 16, ['Build Upload Error Row', 'Append Upload Error']),
});

const GMAIL_HORIZONTAL_GROUPS = [
  ['Search Intake_Label1', 'Tag Intake_Label1'],
  [
    'Every 5 Minutes',
    'Search Intake_Label2',
    'Tag Intake_Label2',
    'Merge Label Searches',
    'Process Emails Serially',
    'Normalize Gmail Message',
    'Build PROCESSING Email Row',
    'Upsert PROCESSING Email',
    'Restore Gmail Context',
    'Has Attachments?',
  ],
  ['Search Intake_Label3', 'Tag Intake_Label3'],
  ['Set NO_ATTACHMENTS', 'Build NO_ATTACHMENTS Email Row', 'Upsert NO_ATTACHMENTS Email'],
  ['Find Label Folder', 'Attach Label Search Result', 'Label Folder Found?', 'Use Existing Label Folder'],
  ['Create Label Folder', 'Capture Created Label Folder'],
  ['Find Date Folder', 'Attach Date Search Result', 'Date Folder Found?', 'Use Existing Date Folder'],
  ['Create Date Folder', 'Capture Created Date Folder'],
  ['Find Sender Folder', 'Attach Sender Search Result', 'Sender Folder Found?', 'Use Existing Sender Folder'],
  ['Create Sender Folder', 'Capture Created Sender Folder'],
  ['Merge Sender Folder', 'Attach Sender Folder URL', 'Explode Gmail Attachments', 'Start Attachment Loop'],
  ['Process Attachments Serially', 'Find Existing Attachment', 'Attach Existing File Search', 'Attachment Already Uploaded?', 'Use Existing Attachment'],
  ['Restore Attachment Binary', 'Upload Original Attachment', 'Combine Attachment Upload Result', 'Capture Uploaded Attachment'],
  ['Merge Attachment Outcome', 'Build Gmail Attachment Row', 'Upsert Gmail Attachment', 'Restore Attachment Outcome', 'Continue Attachment Loop'],
  ['Finalize Gmail Email', 'Build Final Gmail Email Row', 'Upsert Final Gmail Email'],
  ['Email Has Errors?', 'Build Gmail Error Row', 'Append Gmail Error'],
];

const GMAIL_VERTICAL_GROUPS = [
  ['Search Intake_Label1', 'Search Intake_Label2', 'Search Intake_Label3'],
  ['Tag Intake_Label1', 'Tag Intake_Label2', 'Tag Intake_Label3'],
  ['Use Existing Label Folder', 'Create Label Folder'],
  ['Use Existing Date Folder', 'Create Date Folder'],
  ['Use Existing Sender Folder', 'Create Sender Folder'],
  ['Use Existing Attachment', 'Restore Attachment Binary'],
  ['Build Final Gmail Email Row', 'Email Has Errors?'],
];

const TELEGRAM_HORIZONTAL_GROUPS = [
  ['Telegram Receipt Trigger', 'Normalize Telegram Update', 'Accepted Receipt Image?', 'Find Duplicate Receipt', 'Attach Duplicate Search Result', 'Duplicate Receipt?'],
  ['Build Duplicate Receipt Row', 'Upsert Duplicate Receipt', 'Reply Duplicate Receipt'],
  ['Find Submission Date Folder', 'Attach Submission Date Search', 'Submission Date Folder Found?', 'Use Existing Submission Date Folder'],
  ['Create Submission Date Folder', 'Capture Submission Date Folder'],
  ['Merge Submission Date Folder', 'Restore Telegram Binary', 'Upload Raw Receipt Image', 'Capture Telegram Upload', 'Raw Image Uploaded?'],
  ['Extract Receipt with Gemini', 'Validate Gemini Receipt', 'Upsert Telegram Receipt', 'Reply Receipt Result'],
  ['Receipt Needs Error Log?', 'Build Gemini Error Row', 'Append Gemini Error'],
  ['Build Upload Failure Receipt', 'Upsert Upload Failure', 'Reply Upload Failure'],
  ['Build Upload Error Row', 'Append Upload Error'],
];

const TELEGRAM_VERTICAL_GROUPS = [
  ['Use Existing Submission Date Folder', 'Create Submission Date Folder'],
  ['Upsert Telegram Receipt', 'Receipt Needs Error Log?'],
  ['Upsert Upload Failure', 'Build Upload Error Row'],
];

export const WORKFLOW_LAYOUTS = Object.freeze({
  GmailDocumentIntake01: Object.freeze({
    file: 'gmail_multi_label_to_sheets_drive.json',
    nodeCount: 62,
    positions: GMAIL_WORKFLOW_LAYOUT,
    horizontalGroups: GMAIL_HORIZONTAL_GROUPS,
    verticalGroups: GMAIL_VERTICAL_GROUPS,
  }),
  TelegramReceiptIntake01: Object.freeze({
    file: 'telegram_receipts_to_sheets_drive.json',
    nodeCount: 34,
    positions: TELEGRAM_WORKFLOW_LAYOUT,
    horizontalGroups: TELEGRAM_HORIZONTAL_GROUPS,
    verticalGroups: TELEGRAM_VERTICAL_GROUPS,
  }),
});

export const WORKFLOW_FILES = Object.freeze(
  Object.values(WORKFLOW_LAYOUTS).map(({ file }) => file),
);

export function applyCompleteLayout(nodes, layout, aliases = {}) {
  const expectedNames = new Set(Object.keys(layout));
  const seenNames = new Set();

  for (const item of nodes) {
    const canonicalName = aliases[item.name] || item.name;
    const position = layout[canonicalName];
    if (!position) throw new Error('Missing layout coordinate for node: ' + item.name);
    if (seenNames.has(canonicalName)) throw new Error('Duplicate layout node name: ' + canonicalName);
    item.position = [...position];
    seenNames.add(canonicalName);
  }

  const missing = [...expectedNames].filter((name) => !seenNames.has(name));
  if (missing.length) throw new Error('Layout contains unknown nodes: ' + missing.join(', '));

  const coordinateKeys = nodes.map((item) => item.position.join(','));
  if (new Set(coordinateKeys).size !== coordinateKeys.length) {
    throw new Error('Layout contains duplicate coordinates');
  }

  return nodes;
}

function validateSpacingGroups(spec, groups, axis) {
  const primary = axis === 'horizontal' ? 0 : 1;
  const secondary = axis === 'horizontal' ? 1 : 0;
  for (const group of groups) {
    for (let index = 1; index < group.length; index++) {
      const previousName = group[index - 1];
      const currentName = group[index];
      const previous = spec.positions[previousName];
      const current = spec.positions[currentName];
      if (!previous || !current) {
        throw new Error(`${spec.file}: ${axis} spacing group references an unknown node`);
      }
      if (
        current[primary] - previous[primary] !== NODE_STEP ||
        current[secondary] !== previous[secondary]
      ) {
        throw new Error(
          `${spec.file}: ${previousName} -> ${currentName} is not exactly ${NODE_STEP}px ${axis}`,
        );
      }
    }
  }
}

function validateRectangles(workflow, spec) {
  const rectangles = workflow.nodes.map((node) => {
    const [x, y] = spec.positions[node.name];
    const isNote = node.type === 'n8n-nodes-base.stickyNote';
    return {
      name: node.name,
      isNote,
      x,
      y,
      width: isNote ? Number(node.parameters.width ?? 160) : NODE_SIZE,
      height: isNote ? Number(node.parameters.height ?? 160) : NODE_SIZE,
    };
  });

  for (let left = 0; left < rectangles.length; left++) {
    for (let right = left + 1; right < rectangles.length; right++) {
      const a = rectangles[left];
      const b = rectangles[right];
      const overlaps =
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
      if (overlaps) throw new Error(`${spec.file}: ${a.name} overlaps ${b.name}`);
    }
  }

  const operational = rectangles.filter((rectangle) => !rectangle.isNote);
  const firstOperationalY = Math.min(...operational.map((rectangle) => rectangle.y));
  for (const note of rectangles.filter((rectangle) => rectangle.isNote)) {
    if (note.y + note.height > firstOperationalY - EDGE_GAP) {
      throw new Error(`${spec.file}: ${note.name} is less than ${EDGE_GAP}px above the canvas`);
    }
  }
}

export function validateWorkflowLayout(workflow) {
  const spec = WORKFLOW_LAYOUTS[workflow.id];
  if (!spec) throw new Error('No layout registered for workflow id ' + workflow.id);
  if (workflow.nodes.length !== spec.nodeCount) {
    throw new Error(
      `${spec.file}: expected ${spec.nodeCount} nodes, found ${workflow.nodes.length}`,
    );
  }

  const nodeNames = workflow.nodes.map((item) => item.name);
  if (new Set(nodeNames).size !== nodeNames.length) {
    throw new Error(`${spec.file}: duplicate node names prevent deterministic layout`);
  }

  const mappedNames = Object.keys(spec.positions);
  const nodeNameSet = new Set(nodeNames);
  const mappedNameSet = new Set(mappedNames);
  const missing = nodeNames.filter((name) => !mappedNameSet.has(name));
  const unknown = mappedNames.filter((name) => !nodeNameSet.has(name));
  if (missing.length || unknown.length) {
    throw new Error(
      `${spec.file}: layout mismatch; missing=[${missing.join(', ')}], unknown=[${unknown.join(', ')}]`,
    );
  }

  const occupied = new Map();
  const operationalRows = new Set();
  for (const node of workflow.nodes) {
    const position = spec.positions[node.name];
    if (
      !Array.isArray(position) ||
      position.length !== 2 ||
      !position.every(Number.isFinite)
    ) {
      throw new Error(`${spec.file}: invalid position for ${node.name}`);
    }
    const key = position.join(',');
    if (occupied.has(key)) {
      throw new Error(`${spec.file}: ${node.name} and ${occupied.get(key)} share position ${key}`);
    }
    occupied.set(key, node.name);

    if (node.type !== 'n8n-nodes-base.stickyNote') {
      if (position[0] % NODE_STEP !== 0 || position[1] % NODE_STEP !== 0) {
        throw new Error(`${spec.file}: ${node.name} is off the ${NODE_STEP}px grid`);
      }
      operationalRows.add(position[1] / NODE_STEP);
    }
  }

  const maxRow = Math.max(...operationalRows);
  for (let row = 0; row <= maxRow; row++) {
    if (!operationalRows.has(row)) throw new Error(`${spec.file}: unused operational row ${row}`);
  }

  validateSpacingGroups(spec, spec.horizontalGroups ?? [], 'horizontal');
  validateSpacingGroups(spec, spec.verticalGroups ?? [], 'vertical');
  validateRectangles(workflow, spec);
  return spec;
}

export function applyWorkflowLayout(workflow) {
  const spec = validateWorkflowLayout(workflow);
  applyCompleteLayout(workflow.nodes, spec.positions);
  return workflow;
}

export function stripNodePositions(workflow) {
  const copy = structuredClone(workflow);
  for (const item of copy.nodes) delete item.position;
  return copy;
}
