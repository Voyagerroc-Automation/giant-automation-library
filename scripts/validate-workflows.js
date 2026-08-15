const fs = require('node:fs');
const path = require('node:path');

const workflowsRoot = path.resolve(__dirname, '..', 'workflows');

function listJsonFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJsonFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
  });
}

function validateWorkflow(file) {
  const relativePath = path.relative(workflowsRoot, file);
  const workflow = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = [];

  if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
    errors.push('workflow must be a JSON object');
    return errors;
  }
  if (typeof workflow.name !== 'string' || !workflow.name.trim()) errors.push('missing workflow name');
  if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) errors.push('missing workflow nodes');
  if (!workflow.connections || typeof workflow.connections !== 'object' || Array.isArray(workflow.connections)) {
    errors.push('missing workflow connections');
  }

  const nodeNames = new Set();
  for (const node of workflow.nodes ?? []) {
    if (!node || typeof node.name !== 'string' || !node.name.trim()) {
      errors.push('node without a name');
      continue;
    }
    if (nodeNames.has(node.name)) errors.push(`duplicate node name: ${node.name}`);
    nodeNames.add(node.name);
    if (typeof node.type !== 'string' || !node.type.trim()) errors.push(`node ${node.name} has no type`);
  }

  for (const [source, groups] of Object.entries(workflow.connections ?? {})) {
    if (!nodeNames.has(source)) errors.push(`connection source does not exist: ${source}`);
    for (const group of groups?.main ?? []) {
      for (const connection of group ?? []) {
        if (!nodeNames.has(connection.node)) errors.push(`connection target does not exist: ${connection.node}`);
      }
    }
  }

  return errors.map((error) => `${relativePath}: ${error}`);
}

if (!fs.existsSync(workflowsRoot)) {
  console.error('workflows directory is missing');
  process.exit(1);
}

const files = listJsonFiles(workflowsRoot);
const errors = files.flatMap(validateWorkflow);
if (errors.length > 0) {
  console.error(`Workflow validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}

console.log(`Validated ${files.length} workflow${files.length === 1 ? '' : 's'}.`);
