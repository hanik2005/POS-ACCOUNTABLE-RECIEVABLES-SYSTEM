export const goFullScreen = async () => {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) {
    return;
  }

  try {
    await document.documentElement.requestFullscreen();

    if (navigator.keyboard && navigator.keyboard.lock) {
      await navigator.keyboard.lock(["Escape"]);
    }
  } catch (error) {}
};

export const enterFullScreen = (e) => {
  if (e.type == "keydown" && (e.key == "Escape" || e.key == "F11")) {
    return;
  }

  document.removeEventListener("keydown", enterFullScreen);
  document.removeEventListener("click", enterFullScreen);

  goFullScreen();
};