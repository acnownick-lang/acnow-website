window.__loadErrors = [];
window.addEventListener('error', function(e) {
    window.__loadErrors.push('ERROR: ' + e.message + ' at ' + e.filename + ':' + e.lineno);
});
const originalWarn = console.warn;
console.warn = function() {
    window.__loadErrors.push('WARN: ' + Array.from(arguments).join(' '));
    originalWarn.apply(console, arguments);
};
const originalError = console.error;
console.error = function() {
    window.__loadErrors.push('CONSOLE_ERROR: ' + Array.from(arguments).join(' '));
    originalError.apply(console, arguments);
};
