import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertCiWorkflowPolicy,
  assertPublishWorkflowPolicy
} from "../../scripts/release-workflow-policy.js";

const checkoutAction = "actions/checkout@v7";
const setupNodeAction = "actions/setup-node@v7";

test("accepts the current CI and publish workflow policies", () => {
  const ciWorkflow = readFileSync(
    new URL("../../.github/workflows/ci.yml", import.meta.url),
    "utf8"
  );
  const publishWorkflow = readFileSync(
    new URL("../../.github/workflows/publish.yml", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => assertCiWorkflowPolicy(ciWorkflow));
  assert.doesNotThrow(() => assertPublishWorkflowPolicy(publishWorkflow));
});

test("rejects invalid CI checkout policies", async (t) => {
  const cases = [
    {
      name: "missing input",
      workflow: workflow(step("Checkout", checkoutAction)),
      error: "ci_checkout_persist_credentials_false_missing"
    },
    {
      name: "true input",
      workflow: workflow(step("Checkout", checkoutAction, {
        "persist-credentials": "true"
      })),
      error: "ci_checkout_persist_credentials_false_missing"
    },
    {
      name: "quoted false input",
      workflow: workflow(step("Checkout", checkoutAction, {
        "persist-credentials": '"false"'
      })),
      error: "ci_checkout_persist_credentials_false_missing"
    },
    {
      name: "input on another step",
      workflow: workflow(
        step("Checkout", checkoutAction),
        step("Setup Node", setupNodeAction, { "persist-credentials": "false" })
      ),
      error: "ci_checkout_persist_credentials_false_missing"
    },
    {
      name: "duplicate checkout action",
      workflow: workflow(
        step("Checkout", checkoutAction, { "persist-credentials": "false" }),
        step("Checkout again", checkoutAction, { "persist-credentials": "false" })
      ),
      error: "ci_checkout_action_count_invalid"
    }
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, () => {
      assertPolicyError(
        () => assertCiWorkflowPolicy(testCase.workflow),
        testCase.error
      );
    });
  }
});

test("rejects invalid publish checkout policies", async (t) => {
  const validSetupNode = step("Setup Node", setupNodeAction, {
    "node-version": "24",
    "package-manager-cache": "false"
  });
  const cases = [
    {
      name: "missing input",
      workflow: workflow(step("Checkout", checkoutAction), validSetupNode),
      error: "publish_checkout_persist_credentials_false_missing"
    },
    {
      name: "true input",
      workflow: workflow(
        step("Checkout", checkoutAction, { "persist-credentials": "true" }),
        validSetupNode
      ),
      error: "publish_checkout_persist_credentials_false_missing"
    },
    {
      name: "input on another step",
      workflow: workflow(
        step("Checkout", checkoutAction),
        step("Setup Node", setupNodeAction, {
          "persist-credentials": "false",
          "package-manager-cache": "false"
        })
      ),
      error: "publish_checkout_persist_credentials_false_missing"
    },
    {
      name: "duplicate checkout action",
      workflow: workflow(
        step("Checkout", checkoutAction, { "persist-credentials": "false" }),
        step("Checkout again", checkoutAction, { "persist-credentials": "false" }),
        validSetupNode
      ),
      error: "publish_checkout_action_count_invalid"
    }
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, () => {
      assertPolicyError(
        () => assertPublishWorkflowPolicy(testCase.workflow),
        testCase.error
      );
    });
  }
});

test("rejects invalid publish setup-node cache policies", async (t) => {
  const validCheckout = step("Checkout", checkoutAction, {
    "persist-credentials": "false"
  });
  const cases = [
    {
      name: "missing input",
      workflow: workflow(validCheckout, step("Setup Node", setupNodeAction, {
        "node-version": "24"
      })),
      error: "publish_setup_node_package_manager_cache_false_missing"
    },
    {
      name: "true input",
      workflow: workflow(validCheckout, step("Setup Node", setupNodeAction, {
        "package-manager-cache": "true"
      })),
      error: "publish_setup_node_package_manager_cache_false_missing"
    },
    {
      name: "quoted false input",
      workflow: workflow(validCheckout, step("Setup Node", setupNodeAction, {
        "package-manager-cache": "'false'"
      })),
      error: "publish_setup_node_package_manager_cache_false_missing"
    },
    {
      name: "input on another step",
      workflow: workflow(
        step("Checkout", checkoutAction, {
          "package-manager-cache": "false",
          "persist-credentials": "false"
        }),
        step("Setup Node", setupNodeAction)
      ),
      error: "publish_setup_node_package_manager_cache_false_missing"
    },
    {
      name: "duplicate setup-node action",
      workflow: workflow(
        validCheckout,
        step("Setup Node", setupNodeAction, { "package-manager-cache": "false" }),
        step("Setup Node again", setupNodeAction, {
          "package-manager-cache": "false"
        })
      ),
      error: "publish_setup_node_action_count_invalid"
    }
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, () => {
      assertPolicyError(
        () => assertPublishWorkflowPolicy(testCase.workflow),
        testCase.error
      );
    });
  }
});

function workflow(...steps) {
  return [
    "name: Synthetic",
    "jobs:",
    "  test:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    ...steps
  ].join("\n");
}

function step(name, action, inputs = null) {
  const lines = [
    `      - name: ${name}`,
    `        uses: ${action}`
  ];

  if (inputs) {
    lines.push("        with:");
    for (const [key, value] of Object.entries(inputs)) {
      lines.push(`          ${key}: ${value}`);
    }
  }

  return lines.join("\n");
}

function assertPolicyError(run, expectedMessage) {
  assert.throws(run, (error) => {
    assert.equal(error instanceof Error, true);
    assert.equal(error.message, expectedMessage);
    assert.equal(error.message.includes("actions/"), false);
    return true;
  });
}
