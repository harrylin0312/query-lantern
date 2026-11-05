// Apply the reading preference before CSS paints to avoid a bright/dark flash.
(() => {
  let preference;
  try {
    preference = localStorage.getItem("lantern-theme-v1");
  } catch {}
  const light =
    preference === "light" ||
    (preference !== "dark" &&
      matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.dataset.theme = light ? "light" : "dark";
  document.querySelector('meta[name="theme-color"]').content = light
    ? "#f5f3ec"
    : "#101b26";
})();
