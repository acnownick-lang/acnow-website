const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = [
    { src: 'src/redesign.css', dest: 'assets/css/redesign.css' },
    { src: 'src/home.css', dest: 'assets/css/home.css' },
    { src: 'src/app.js', dest: 'assets/js/app.js' },
    { src: 'src/home-widgets.js', dest: 'assets/js/home-widgets.js' },
    { src: 'src/home-interactive.js', dest: 'assets/js/home-interactive.js' },
    { src: 'src/energy-game.js', dest: 'assets/js/energy-game.js' },
    { src: 'src/calendar-widget.js', dest: 'assets/js/calendar-widget.js' },
    { src: 'src/corrosion-meter.js', dest: 'assets/js/corrosion-meter.js' },
    { src: 'src/diagnose-wizard.js', dest: 'assets/js/diagnose-wizard.js' },
    { src: 'src/duct-simulator.js', dest: 'assets/js/duct-simulator.js' },
    { src: 'src/humidity-planner.js', dest: 'assets/js/humidity-planner.js' },
    { src: 'src/hvac-configurator.js', dest: 'assets/js/hvac-configurator.js' },
    { src: 'src/lifecycle-planner.js', dest: 'assets/js/lifecycle-planner.js' },
    { src: 'src/pool-calculator.js', dest: 'assets/js/pool-calculator.js' },
    { src: 'src/rebate-estimator.js', dest: 'assets/js/rebate-estimator.js' },
    { src: 'src/soundboard.js', dest: 'assets/js/soundboard.js' },
    { src: 'src/error-logger.js', dest: 'assets/js/error-logger.js' }
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
