const test = require("node:test");
const assert = require("node:assert/strict");
const TransferStore = require("../src/transfer-store.js");

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

test("keeps drafts active without adding them to history", () => {
  const storage = memoryStorage();
  TransferStore.save({ id: "draft", hasBurn: false, status: "draft" }, storage);
  assert.equal(TransferStore.getActive(storage).id, "draft");
  assert.deepEqual(TransferStore.list(storage), []);
});

test("adds burned transfers to history and updates them in place", () => {
  const storage = memoryStorage();
  TransferStore.save({ id: "one", hasBurn: true, status: "attesting", flow: { burnTxHash: "0x1" } }, storage);
  TransferStore.save({ id: "one", hasBurn: true, status: "complete", flow: { burnTxHash: "0x1", autoDelivered: true } }, storage);
  const history = TransferStore.list(storage);
  assert.equal(history.length, 1);
  assert.equal(history[0].status, "complete");
  assert.equal(history[0].flow.autoDelivered, true);
});

test("restores safely from malformed storage", () => {
  const storage = memoryStorage({ [TransferStore.STORAGE_KEY]: "{broken" });
  assert.deepEqual(TransferStore.read(storage), TransferStore.emptyStore());
});

test("removes individual transfers and clears completed history", () => {
  const storage = memoryStorage();
  TransferStore.save({ id: "pending", hasBurn: true, status: "attesting" }, storage);
  TransferStore.save({ id: "done", hasBurn: true, status: "complete" }, storage);
  TransferStore.clearCompleted(storage);
  assert.deepEqual(TransferStore.list(storage).map((item) => item.id), ["pending"]);
  TransferStore.remove("pending", storage);
  assert.deepEqual(TransferStore.list(storage), []);
});
