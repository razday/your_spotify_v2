// Applies the theme before the app starts, so there is no light flash
(function () {
  var mode = "follow";
  try {
    mode = localStorage.getItem("ys-theme") || "follow";
  } catch (e) {}
  var dark =
    mode === "dark" ||
    (mode !== "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) {
    document.documentElement.classList.add("dark");
  }
})();
