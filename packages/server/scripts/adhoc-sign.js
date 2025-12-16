/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */
const { spawnSync } = require("child_process");

/**
 * electron-builder afterPack hook to deep ad-hoc sign the macOS app bundle.
 * This reproduces the manual:
 *   codesign --force --deep --sign - "App.app"
 * that fixed the "app is damaged" dialog on downloaded builds.
 */
exports.default = async function adhocSign(context) {
    // Only run for macOS builds
    if (process.platform !== "darwin") return;

    const appName = context.packager.appInfo.productFilename;
    const appPath = `${context.appOutDir}/${appName}.app`;

    // Deep ad-hoc sign the entire bundle
    const result = spawnSync("codesign", ["--force", "--deep", "--sign", "-", appPath], {
        stdio: "inherit"
    });

    if (result.status !== 0) {
        throw new Error(`Ad-hoc signing failed for ${appPath}`);
    }
};


