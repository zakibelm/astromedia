import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

async function checkDirectory(dir, name) {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath)) {
        log(colors.green, `✅ ${name} found at ${dir}`);
        return true;
    } else {
        log(colors.red, `❌ ${name} MISSING at ${dir}`);
        return false;
    }
}

function runCommand(command, cwd) {
    return new Promise((resolve) => {
        log(colors.cyan, `Running: ${command} in ${cwd}...`);
        exec(command, { cwd: path.join(rootDir, cwd) }, (error, stdout, stderr) => {
            if (error) {
                log(colors.red, `❌ Command failed: ${command}`);
                console.error(stderr);
                resolve(false);
            } else {
                log(colors.green, `✅ Command success: ${command}`);
                resolve(true);
            }
        });
    });
}

async function main() {
    log(colors.yellow, '=== ASTROMEDIA HEALTH CHECK ===\n');

    // Check node_modules
    const frontendModules = await checkDirectory('node_modules', 'Frontend node_modules');
    const backendModules = await checkDirectory('backend/node_modules', 'Backend node_modules');

    if (!frontendModules || !backendModules) {
        log(colors.red, '\n⚠️  CRITICAL: Dependencies missing. Please run "npm install" and "cd backend && npm install".');
        process.exit(1);
    }

    // Check Build
    log(colors.yellow, '\n--- Verifying Builds ---');

    // Frontend Build (using tsc only for speed check)
    const frontendBuild = await runCommand('npx tsc --noEmit', '.');

    // Backend Build
    const backendBuild = await runCommand('npm run build', 'backend');

    if (frontendBuild && backendBuild) {
        log(colors.green, '\n✨ SYSTEM HEALTHY: All checks passed!');
        process.exit(0);
    } else {
        log(colors.red, '\n💥 SYSTEM UNHEALTHY: Build failure detected.');
        process.exit(1);
    }
}

main();
