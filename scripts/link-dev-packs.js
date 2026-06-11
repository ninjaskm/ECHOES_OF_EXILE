import { existsSync, lstatSync, mkdirSync, realpathSync, symlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const BP_DEV_NAME = "EchoesOfExile_BP_DEV";
const RP_DEV_NAME = "EchoesOfExile_RP_DEV";

function parseArgs(args) {
  const rootIndex = args.indexOf("--root");
  const mojangRootIndex = args.indexOf("--mojang-root");

  return {
    root: rootIndex === -1 ? process.cwd() : resolve(args[rootIndex + 1]),
    mojangRoot:
      mojangRootIndex === -1
        ? join(
            homedir(),
            "AppData",
            "Local",
            "Packages",
            "Microsoft.MinecraftUWP_8wekyb3d8bbwe",
            "LocalState",
            "games",
            "com.mojang"
          )
        : resolve(args[mojangRootIndex + 1])
  };
}

function ensureSourceDirectory(path, label) {
  if (!existsSync(path) || !lstatSync(path).isDirectory()) {
    throw new Error(`${label} source directory not found: ${path}`);
  }
}

function ensureLink(linkPath, sourcePath, label) {
  if (existsSync(linkPath)) {
    const currentRealPath = realpathSync(linkPath);
    const sourceRealPath = realpathSync(sourcePath);

    if (currentRealPath === sourceRealPath) {
      console.log(`${label} dev link already points to ${sourcePath}`);
      return;
    }

    throw new Error(
      `${label} dev path already exists and points to ${currentRealPath}. ` +
        `Remove or rename it manually before linking to ${sourcePath}.`
    );
  }

  symlinkSync(sourcePath, linkPath, "junction");
  console.log(`Linked ${label} ${linkPath} -> ${sourcePath}`);
}

const { root, mojangRoot } = parseArgs(process.argv.slice(2));
const bpSource = join(root, "BP");
const rpSource = join(root, "RP");
const behaviorDevRoot = join(mojangRoot, "development_behavior_packs");
const resourceDevRoot = join(mojangRoot, "development_resource_packs");

ensureSourceDirectory(bpSource, "BP");
ensureSourceDirectory(rpSource, "RP");
mkdirSync(behaviorDevRoot, { recursive: true });
mkdirSync(resourceDevRoot, { recursive: true });

ensureLink(join(behaviorDevRoot, BP_DEV_NAME), bpSource, "BP");
ensureLink(join(resourceDevRoot, RP_DEV_NAME), rpSource, "RP");

console.log("Development packs are linked. Activate the DEV packs once in Minecraft, then use npm run dev.");
