const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = [
    { src: 'src/redesign.css', dest: 'redesign.css' },
    { src: 'src/home.css', dest: 'home.css' },
    { src: 'src/app.js', dest: 'app.js' },
    { src: 'src/home-widgets.js', dest: 'home-widgets.js' },
    { src: 'src/home-interactive.js', dest: 'home-interactive.js' },
    { src: 'src/energy-game.js', dest: 'energy-game.js' },
    { src: 'src/calendar-widget.js', dest: 'calendar-widget.js' },
    { src: 'src/corrosion-meter.js', dest: 'corrosion-meter.js' },
    { src: 'src/diagnose-wizard.js', dest: 'diagnose-wizard.js' },
    { src: 'src/duct-simulator.js', dest: 'duct-simulator.js' },
    { src: 'src/humidity-planner.js', dest: 'humidity-planner.js' },
    { src: 'src/hvac-configurator.js', dest: 'hvac-configurator.js' },
    { src: 'src/lifecycle-planner.js', dest: 'lifecycle-planner.js' },
    { src: 'src/pool-calculator.js', dest: 'pool-calculator.js' },
    { src: 'src/rebate-estimator.js', dest: 'rebate-estimator.js' },
    { src: 'src/soundboard.js', dest: 'soundboard.js' },
    { src: 'src/error-logger.js', dest: 'error-logger.js' }
];
const projectRoot = path.join(__dirname, '..');

console.log("Minifying assets with esbuild...");
files.forEach(file => {
    try {
        const srcPath = path.join(projectRoot, file.src);
        const destPath = path.join(projectRoot, file.dest);
        execSync(`npx esbuild "${srcPath}" --minify --outfile="${destPath}"`);
        console.log(`Minified: ${file.src} -> ${file.dest} (${fs.statSync(destPath).size} bytes)`);
    } catch (err) {
        console.error(`Error minifying ${file.src}:`, err.message);
    }
});
console.log("All assets minified successfully!");
