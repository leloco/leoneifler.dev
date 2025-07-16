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
      cancelActions(light);
    } else {
      localStorage.theme = light;
      document.documentElement.classList.remove(dark);
      darkCssLink.disabled = true;
      lightCssLink.disabled = false;
      updateFavicon(light);
      cancelActions(dark);
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
    setCopyListeners();
  });

  function updateFavicon(theme) {
    const favicon = document.getElementById("favicon");
    if (favicon) {
      favicon.href =
        theme === "dark" ? "/favicon-dark.svg" : "/favicon-light.svg";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const tagsUl = document.getElementById("tags");
    if (!tagsUl) return;

    const activeTag = tagsUl.dataset.activeTag;
    const allTags = Array.from(tagsUl.querySelectorAll("li"));
    const activeExists = allTags.some((tag) => tag.dataset.name === activeTag);

    if (
      (activeExists && tagsUl.children.length > 0) ||
      !window.location.pathname.includes("/tags")
    ) {
      return;
    }

    const tagHTML = `
      <li class="mt-2 mr-2" data-name="${activeTag}">
        <a
          href="/tags/${activeTag}/"
          class="rounded-sm px-2 py-1 text-sm text-[#4B70F5] dark:text-[#BEF992] ring-1 ring-[#4B70F5] dark:ring-[#BEF992] backdrop-blur-sm bg-slate-50 dark:bg-gray-700"
        >
          ${activeTag}
        </a>
      </li>
    `;

    tagsUl.insertAdjacentHTML("beforeend", tagHTML);
  });

  function setCopyListeners() {
    const copyIcons = document.querySelectorAll('[data-name*="copy-icon"]');

    copyIcons.forEach((copyIcon) => {
      copyIcon.addEventListener("click", () => {
        const button = copyIcon.parentElement;
        let checkIcon;
        let clazz;
        if (copyIcon.getAttribute("data-name").includes("dark")) {
          checkIcon = button.querySelector('[data-name="check-icon-dark"]');
          clazz = "dark:hidden";
        } else {
          checkIcon = button.querySelector('[data-name="check-icon-light"]');
          clazz = "hidden";
        }

        setTimeout(() => {
          copyIcon.classList.remove(clazz);
          checkIcon.classList.add("hidden");
        }, 1800);

        copyIcon.classList.add(clazz);
        checkIcon.classList.remove("hidden");

        const highlightWrapper =
          button.nextElementSibling?.querySelector(".highlight");

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

        const textToCopy = codeBlockElement.innerText;
        console.log(textToCopy);
        navigator.clipboard.writeText(textToCopy);
      });
    });
  }

  function cancelActions(theme) {
    const checkIcons = Array.from(
      document.querySelectorAll(`[data-name="check-icon-${theme}"]`)
    );
    checkIcons.map((icon) => icon.classList.add("hidden"));
  }
})();
