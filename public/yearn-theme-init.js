(function () {
  try {
    var stored = localStorage.getItem("yearn-theme-pref");
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = stored === "soft-dark" || (!stored && systemDark) ? "soft-dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "soft-dark") {
      document.documentElement.classList.add("dark");
    }
  } catch {
    // Ignore storage/matchMedia failures and keep default theme.
  }
})();
