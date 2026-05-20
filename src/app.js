(async () => {
  const parts = await Promise.all(
    [1, 2, 3, 4].map(async (part) => {
      const response = await fetch(`./app.payload.${part}.b64`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load app payload ${part}`);
      return response.text();
    })
  );
  const source = atob(parts.join("").replace(/\s+/g, ""));
  (0, eval)(source);
})().catch((error) => {
  console.error(error);
  const target = document.getElementById("routeSubtitle") || document.body;
  target.textContent = `App failed to load: ${error.message || error}`;
});
