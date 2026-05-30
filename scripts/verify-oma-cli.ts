import { execSync } from "child_process";
import { existsSync } from "fs";

export default async function beforeAgent() {
  const globalCliPath = "C:/Users/user/.bun/install/global/node_modules/oh-my-agent/bin/cli.js";
  const localCliPath = "C:/Users/user/AI_Orchestra_Lab/core_system/oh-my-agent/cli/bin/cli.js";
  const rebuildScript = "C:/Users/user/AI_Orchestra_Lab/projects/scripts/rebuild-oma.sh";

  if (!existsSync(globalCliPath) || !existsSync(localCliPath)) {
    return;
  }

  // Check if "docs" is accepted as a valid agent type by the global CLI
  let needsRebuild = false;
  try {
    // Run dummy command to trigger validator check
    execSync("oma verify docs --json", { encoding: "utf-8", stdio: "pipe" });
  } catch (err: any) {
    // Any error during 'oma verify docs' means the CLI is broken, missing support, or corrupted.
    needsRebuild = true;
  }

  if (needsRebuild) {
    console.log("[BeforeAgent Hook] OMA CLI has been overwritten or is missing docs support. Auto-rebuilding OMA...");
    try {
      execSync(`"C:\\Program Files\\Git\\bin\\bash.exe" "${rebuildScript}"`, {
        stdio: "inherit",
      });
      console.log("[BeforeAgent Hook] OMA CLI successfully restored to patched local build.");
    } catch (rebuildErr) {
      console.error("[BeforeAgent Hook] Failed to auto-restore OMA CLI:", rebuildErr);
    }
  }
}
