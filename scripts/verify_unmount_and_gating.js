// verify_unmount_and_gating.js (JXA)
// Run with: osascript -l JavaScript verify_unmount_and_gating.js

const Chrome = Application("Google Chrome");
Chrome.activate();

function runTest(testName, testFn) {
    console.log(`Running test: ${testName}...`);
    try {
        const result = testFn();
        console.log(`RESULT: ${result ? "PASS" : "FAIL"}\n`);
        return result;
    } catch (e) {
        console.log(`RESULT: ERROR - ${e.message}\n`);
        return false;
    }
}

let allPassed = true;

allPassed = runTest("State Memory & Unmount Safety Audit", () => {
    const win = Chrome.Window().make();
    const tab = win.activeTab();
    
    // 1. Authorize phase 2 on index.html
    tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/index.html";
    delay(1.5);
    tab.execute({ javascript: "localStorage.setItem('acnow_dev_mode', 'true'); localStorage.setItem('acnow_phase', '2');" });
    delay(0.5);
    
    // 2. Visit 3D Airflow page
    tab.url = "file:///Users/nicholaselia/Desktop/Clients/acnow-netlify/pages/3d-airflow.html";
    delay(3.0); // Wait for WebGL/three.js to initialize fully
    
    // 3. Inject and execute testing suite in the main world page context
    const mainWorldTestJS = `
        (function() {
            try {
                const results = {};
                
                // A. Check window.hvacSimulator and window.jsErrors exposure
                results.hvacSimulatorExposed = typeof window.hvacSimulator === 'object' && window.hvacSimulator !== null;
                results.jsErrorsExposed = Array.isArray(window.jsErrors);
                
                // B. Check disposeHierarchy contains THREE.Line check
                const disposeHierarchyStr = typeof disposeHierarchy === 'function' ? disposeHierarchy.toString() : '';
                results.lineCheckedInDisposeHierarchy = disposeHierarchyStr.includes('.isLine');
                
                // C. Check disposeMesh contains texture map disposals
                const disposeMeshStr = typeof disposeMesh === 'function' ? disposeMesh.toString() : '';
                results.texturesDisposedInDisposeMesh = 
                    disposeMeshStr.includes('mat.map.dispose') &&
                    disposeMeshStr.includes('mat.lightMap.dispose') &&
                    disposeMeshStr.includes('mat.bumpMap.dispose') &&
                    disposeMeshStr.includes('mat.normalMap.dispose') &&
                    disposeMeshStr.includes('mat.specularMap.dispose') &&
                    disposeMeshStr.includes('mat.envMap.dispose');
                    
                // D. Test prefetching
                // Clean any existing prefetch links
                document.querySelectorAll('link[rel="prefetch"]').forEach(el => el.remove());
                
                // Create dynamic anchor elements for testing
                const safeLink = document.createElement('a');
                safeLink.href = 'contact.html';
                document.body.appendChild(safeLink);
                
                const gatedLink = document.createElement('a');
                gatedLink.href = 'members.html';
                document.body.appendChild(gatedLink);
                
                // Trigger pointerover event on safe link
                const overSafe = new PointerEvent('pointerover', { bubbles: true });
                safeLink.dispatchEvent(overSafe);
                
                // Trigger pointerover event on gated link
                const overGated = new PointerEvent('pointerover', { bubbles: true });
                gatedLink.dispatchEvent(overGated);
                
                // Check if prefetch tags were added
                const prefetchedUrls = Array.from(document.querySelectorAll('link[rel="prefetch"]')).map(el => el.href);
                results.prefetchesSafe = prefetchedUrls.some(url => url.includes('contact.html'));
                results.ignoresGated = !prefetchedUrls.some(url => url.includes('members.html'));
                
                // Clean up test anchors
                safeLink.remove();
                gatedLink.remove();
                
                // E. Test unmount safety / teardown function
                results.teardownFunctionExists = typeof destroySimulator === 'function';
                
                // Check event listener removal calls in destroySimulator source
                const destroyStr = typeof destroySimulator === 'function' ? destroySimulator.toString() : '';
                results.removesResize = destroyStr.includes("removeEventListener('resize'");
                results.removesPointerDown = destroyStr.includes("removeEventListener('pointerdown'");
                results.removesPointerMove = destroyStr.includes("removeEventListener('pointermove'");
                results.removesPointerUp = destroyStr.includes("removeEventListener('pointerup'");
                results.removesPrefetch = destroyStr.includes("removeEventListener('pointerover'");
                results.removesFocusTraps = destroyStr.includes("removeEventListener('keydown'");
                
                // Spy on WebGLRenderer.dispose and prototype asset disposes
                let rendererDisposed = false;
                let geometryDisposedCount = 0;
                let materialDisposedCount = 0;
                
                if (typeof THREE !== 'undefined') {
                    results.threeDefined = true;
                    if (window.hvacSimulator && window.hvacSimulator.renderer) {
                        const origRendererDispose = window.hvacSimulator.renderer.dispose;
                        window.hvacSimulator.renderer.dispose = function() {
                            rendererDisposed = true;
                            return origRendererDispose.apply(this, arguments);
                        };
                    }
                    
                    const origGeometryDispose = THREE.BufferGeometry.prototype.dispose;
                    THREE.BufferGeometry.prototype.dispose = function() {
                        geometryDisposedCount++;
                        return origGeometryDispose.apply(this, arguments);
                    };
                    
                    const origMaterialDispose = THREE.Material.prototype.dispose;
                    THREE.Material.prototype.dispose = function() {
                        materialDisposedCount++;
                        return origMaterialDispose.apply(this, arguments);
                    };
                    
                    // Trigger unmount teardown
                    try {
                        destroySimulator();
                        results.teardownRunsWithoutThrowing = true;
                    } catch(e) {
                        results.teardownRunsWithoutThrowing = false;
                        results.teardownError = e.message;
                    }
                    
                    results.rendererDisposed = rendererDisposed;
                    results.threeAssetsDisposed = (geometryDisposedCount > 0) && (materialDisposedCount > 0);
                    results.hvacSimulatorNullified = window.hvacSimulator === null;
                } else {
                    results.threeDefined = false;
                }
                
                document.documentElement.setAttribute('test-bridge-data', JSON.stringify(results));
            } catch (err) {
                document.documentElement.setAttribute('test-bridge-data', JSON.stringify({ error: err.message, stack: err.stack }));
            }
        })();
    `;
    
    tab.execute({ javascript: `
        const script = document.createElement('script');
        script.textContent = ${JSON.stringify(mainWorldTestJS)};
        document.documentElement.appendChild(script);
        script.remove();
    ` });
    
    delay(0.5);
    const evalResultStr = tab.execute({ javascript: "document.documentElement.getAttribute('test-bridge-data')" });
    
    win.close();
    
    console.log("JXA Page Verification Results:");
    const testResults = JSON.parse(evalResultStr);
    console.log(JSON.stringify(testResults, null, 2));
    
    if (testResults && testResults.error) {
        console.log("Error inside tab execution: " + testResults.error);
        console.log(testResults.stack);
        return false;
    }
    
    // Validate each result item
    const checks = [
        { key: "hvacSimulatorExposed", desc: "window.hvacSimulator exposed on load" },
        { key: "jsErrorsExposed", desc: "window.jsErrors array exposed on load" },
        { key: "lineCheckedInDisposeHierarchy", desc: "disposeHierarchy() checks child.isLine" },
        { key: "texturesDisposedInDisposeMesh", desc: "disposeMesh() disposes of all texture maps (map, lightMap, bumpMap, normalMap, specularMap, envMap)" },
        { key: "prefetchesSafe", desc: "Hovering contact.html triggers prefetch" },
        { key: "ignoresGated", desc: "Hovering gated pages (e.g. members.html) is ignored" },
        { key: "teardownFunctionExists", desc: "Teardown function destroySimulator() exists" },
        { key: "removesResize", desc: "Teardown removes resize event listener" },
        { key: "removesPointerDown", desc: "Teardown removes pointerdown event listener" },
        { key: "removesPointerMove", desc: "Teardown removes pointermove event listener" },
        { key: "removesPointerUp", desc: "Teardown removes pointerup event listener" },
        { key: "removesPrefetch", desc: "Teardown removes pointerover link prefetch listener" },
        { key: "removesFocusTraps", desc: "Teardown removes keydown focus trap listeners" },
        { key: "teardownRunsWithoutThrowing", desc: "Teardown executes without throwing errors" },
        { key: "rendererDisposed", desc: "Renderer is disposed during teardown" },
        { key: "threeAssetsDisposed", desc: "Three.js geometries and materials are disposed during teardown" },
        { key: "hvacSimulatorNullified", desc: "window.hvacSimulator global nullified during teardown" }
    ];
    
    let subPassed = true;
    for (const check of checks) {
        const passed = !!(testResults && testResults[check.key]);
        console.log(`  [${passed ? "PASS" : "FAIL"}] ${check.desc}`);
        if (!passed) subPassed = false;
    }
    
    return subPassed;
}) && allPassed;

console.log(`Summary: ${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}`);
allPassed ? 0 : 1;
