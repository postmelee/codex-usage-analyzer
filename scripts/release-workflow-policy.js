const CI_CHECKOUT_POLICY = {
  action: "actions/checkout@v7",
  actionCountError: "ci_checkout_action_count_invalid",
  input: "persist-credentials",
  inputValueError: "ci_checkout_persist_credentials_false_missing"
};

const PUBLISH_CHECKOUT_POLICY = {
  action: "actions/checkout@v7",
  actionCountError: "publish_checkout_action_count_invalid",
  input: "persist-credentials",
  inputValueError: "publish_checkout_persist_credentials_false_missing"
};

const PUBLISH_SETUP_NODE_POLICY = {
  action: "actions/setup-node@v7",
  actionCountError: "publish_setup_node_action_count_invalid",
  input: "package-manager-cache",
  inputValueError: "publish_setup_node_package_manager_cache_false_missing"
};

export function assertCiWorkflowPolicy(workflowText) {
  assertPolicy(workflowText, CI_CHECKOUT_POLICY);
}

export function assertPublishWorkflowPolicy(workflowText) {
  assertPolicy(workflowText, PUBLISH_CHECKOUT_POLICY);
  assertPolicy(workflowText, PUBLISH_SETUP_NODE_POLICY);
}

function assertPolicy(workflowText, policy) {
  const steps = parseNamedSteps(workflowText);
  const matches = [];

  for (const step of steps) {
    const actionValues = readScalarValues(step.lines, step.indent + 2, "uses");
    for (const value of actionValues) {
      if (value === policy.action) {
        matches.push(step);
      }
    }
  }

  if (matches.length !== 1) {
    throw new Error(policy.actionCountError);
  }

  if (!hasExactFalseInput(matches[0], policy.input)) {
    throw new Error(policy.inputValueError);
  }
}

function parseNamedSteps(workflowText) {
  if (typeof workflowText !== "string") {
    throw new TypeError("workflow_text_invalid");
  }

  const lines = workflowText.replace(/\r\n?/gu, "\n").split("\n");
  const starts = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^( *)- name:\s*\S.*$/u);
    if (match) {
      starts.push({ index, indent: match[1].length });
    }
  }

  return starts.map((start) => {
    let end = start.index + 1;
    while (end < lines.length) {
      const line = lines[end];
      const trimmed = line.trim();
      if (
        trimmed.length > 0
        && !trimmed.startsWith("#")
        && leadingSpaces(line) <= start.indent
      ) {
        break;
      }
      end += 1;
    }

    return {
      indent: start.indent,
      lines: lines.slice(start.index, end)
    };
  });
}

function hasExactFalseInput(step, input) {
  const withPattern = new RegExp(`^ {${step.indent + 2}}with:\\s*$`, "u");
  const withIndexes = [];

  for (let index = 0; index < step.lines.length; index += 1) {
    if (withPattern.test(step.lines[index])) {
      withIndexes.push(index);
    }
  }

  if (withIndexes.length !== 1) {
    return false;
  }

  const withIndex = withIndexes[0];
  const withIndent = step.indent + 2;
  let withEnd = step.lines.length;

  for (let index = withIndex + 1; index < step.lines.length; index += 1) {
    const line = step.lines[index];
    const trimmed = line.trim();
    if (
      trimmed.length > 0
      && !trimmed.startsWith("#")
      && leadingSpaces(line) <= withIndent
    ) {
      withEnd = index;
      break;
    }
  }

  const values = readScalarValues(
    step.lines.slice(withIndex + 1, withEnd),
    withIndent + 2,
    input
  );
  return values.length === 1 && values[0] === "false";
}

function readScalarValues(lines, indent, key) {
  const pattern = new RegExp(
    `^ {${indent}}${escapeRegex(key)}:\\s*(.*?)\\s*$`,
    "u"
  );
  const values = [];

  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      values.push(match[1]);
    }
  }

  return values;
}

function leadingSpaces(line) {
  return line.match(/^ */u)[0].length;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
