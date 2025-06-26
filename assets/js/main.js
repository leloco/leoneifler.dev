(function () {
  // On page load or when changing themes, best to add inline in `head` to avoid FOUC
  const themeToggle = document.querySelector(".darkmode-toggle input");
  const lightCssLink = document.getElementById("chroma-light-css");
  const darkCssLink = document.getElementById("chroma-dark-css");

  const light = "light";
  const dark = "dark";
  let isDark =
    localStorage.theme === dark ||
    (!("theme" in localStorage) &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (isDark) {
    document.documentElement.classList.add(dark);
    themeToggle.checked = true;
    lightCssLink.disabled = true;
    darkCssLink.disabled = false;
    updateFavicon(dark);
  } else {
    document.documentElement.classList.remove(dark);
    themeToggle.checked = false;
    darkCssLink.disabled = true;
    lightCssLink.disabled = false;
    updateFavicon(light);
  }

  themeToggle.addEventListener("change", function () {
    if (this.checked) {
      localStorage.theme = dark;
      document.documentElement.classList.add(dark);
      lightCssLink.disabled = true;
      darkCssLink.disabled = false;
      updateFavicon(dark);
    } else {
      localStorage.theme = light;
      document.documentElement.classList.remove(dark);
      darkCssLink.disabled = true;
      lightCssLink.disabled = false;
      updateFavicon(light);
    }
  });

  const navbarMenuToggle = document.getElementById("navbar-menu-toggle");
  const navbarMenu = document.getElementById("navbar-menu");
  const navbarLangToggle =
    document.getElementById("navbar-lang-toggle") ||
    document.createElement("div"); // fix #56
  const navbarLang = document.getElementById("navbar-lang");

  document.addEventListener("click", function (event) {
    const target = event.target;
    if (navbarMenuToggle.contains(target)) {
      navbarLang && navbarLang.classList.add("hidden");
      navbarMenu && navbarMenu.classList.toggle("hidden");
    } else if (navbarLangToggle.contains(target)) {
      navbarMenu && navbarMenu.classList.add("hidden");
      navbarLang && navbarLang.classList.toggle("hidden");
    } else {
      navbarMenu && navbarMenu.classList.add("hidden");
      navbarLang && navbarLang.classList.add("hidden");
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    const copyButtons = document.querySelectorAll(".icon-tabler-copy");

    copyButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const highlightWrapper = button.closest(".highlight");

        if (!highlightWrapper) {
          console.error(
            "Could not find '.highlight-wrapper' for the copy button."
          );
          return;
        }

        const codeBlockElement = highlightWrapper.querySelector("pre code");

        if (!codeBlockElement) {
          console.error(
            "Could not find 'pre code' within the highlight wrapper."
          );
          return;
        }

        const textToCopy = codeBlockElement.innerText; // .innerText is generally good for code
        navigator.clipboard.writeText(textToCopy);
      });
    });
  });

  function updateFavicon(theme) {
    const favicon = document.getElementById("favicon");
    if (favicon) {
      favicon.href =
        theme === "dark" ? "/favicon-dark.svg" : "/favicon-light.svg";
    }
  }
})();
