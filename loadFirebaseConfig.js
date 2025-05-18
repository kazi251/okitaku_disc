(function() {
  const isDev = location.pathname.includes("/dev/");
  const basePath = isDev ? "/dev/" : "./";

  // Firebase config 読み込み
  const firebaseScript = document.createElement("script");
  firebaseScript.src = basePath + "firebaseConfig.js";
  document.head.appendChild(firebaseScript);

  // 開発バナーも読み込み（開発環境だけ）
  if (isDev) {
    const devBannerScript = document.createElement("script");
    devBannerScript.src = basePath + "dev-banner.js";
    document.head.appendChild(devBannerScript);
  }
})();
