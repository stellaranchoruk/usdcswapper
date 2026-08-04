(function attachTransferStore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CctpTransferStore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTransferStore() {
  const STORAGE_KEY = "usdcswap:cctp-transfers:v1";
  const MAX_HISTORY = 30;

  function emptyStore() {
    return { version: 1, active: null, history: [] };
  }

  function read(storage) {
    try {
      const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.history)) return emptyStore();
      return {
        version: 1,
        active: parsed.active && parsed.active.id ? parsed.active : null,
        history: parsed.history.filter((item) => item && item.id),
      };
    } catch {
      return emptyStore();
    }
  }

  function write(store, storage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
    return store;
  }

  function save(snapshot, storage) {
    if (!snapshot || !snapshot.id) throw new Error("A transfer snapshot with an id is required.");
    const store = read(storage);
    const previous = store.history.find((item) => item.id === snapshot.id) ??
      (store.active?.id === snapshot.id ? store.active : null);
    const now = Date.now();
    const saved = {
      ...snapshot,
      createdAt: Number(previous?.createdAt || snapshot.createdAt || now),
      updatedAt: now,
    };
    store.active = saved;
    if (saved.hasBurn) {
      store.history = [saved, ...store.history.filter((item) => item.id !== saved.id)]
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
        .slice(0, MAX_HISTORY);
    }
    write(store, storage);
    return saved;
  }

  function getActive(storage) {
    return read(storage).active;
  }

  function list(storage) {
    return read(storage).history
      .slice()
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  }

  function get(id, storage) {
    const store = read(storage);
    if (store.active?.id === id) return store.active;
    return store.history.find((item) => item.id === id) ?? null;
  }

  function clearActive(storage) {
    const store = read(storage);
    store.active = null;
    write(store, storage);
  }

  function remove(id, storage) {
    const store = read(storage);
    if (store.active?.id === id) store.active = null;
    store.history = store.history.filter((item) => item.id !== id);
    write(store, storage);
  }

  function clearCompleted(storage) {
    const store = read(storage);
    store.history = store.history.filter((item) => item.status !== "complete");
    if (store.active?.status === "complete") store.active = null;
    write(store, storage);
  }

  return {
    STORAGE_KEY,
    clearActive,
    clearCompleted,
    emptyStore,
    get,
    getActive,
    list,
    read,
    remove,
    save,
  };
});
