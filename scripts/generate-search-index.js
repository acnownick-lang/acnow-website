const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'assets', 'data');
const outputFile = path.join(outputDir, 'search-index.json');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const searchIndex = [];

// Helper to recursively scan folders for .html files
function scanDirectory(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // Exclude directories we don't want to scan
            const relativeDir = path.relative(rootDir, fullPath);
            if (!relativeDir.startsWith('.') && 
                !relativeDir.startsWith('node_modules') && 
                !relativeDir.startsWith('assets') && 
                !relativeDir.startsWith('src') &&
                !relativeDir.startsWith('scripts') &&
                !relativeDir.startsWith('preview') &&
                !relativeDir.startsWith('scratch') &&
                !relativeDir.startsWith('publish_ready_blocks') &&
                !relativeDir.startsWith('audit_reports') &&
                !relativeDir.startsWith('dashboard-backup')) {
                scanDirectory(fullPath);
            }
        } else if (file.endsWith('.html')) {
            parseHtmlFile(fullPath);
        }
    });
}

function parseHtmlFile(filePath) {
    const relativePath = path.relative(rootDir, filePath);
    // Ignore offline, 404, members, team-portal, 3d-airflow, and success pages
    const baseName = path.basename(filePath);
    if (
        baseName === 'offline.html' || 
        baseName === '404.html' || 
        baseName === 'members.html' || 
        baseName === 'team-portal.html' || 
        baseName === '3d-airflow.html' || 
        baseName === 'success.html'
    ) {
        return;
    }

    const html = fs.readFileSync(filePath, 'utf-8');
    
    // 1. Extract Title
    let title = '';
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
        title = titleMatch[1].replace(/\s+/g, ' ').replace(' | A/C Now LLC', '').trim();
    }
    
    // 2. Extract Meta Description
    let description = '';
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) || 
                      html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);
    if (descMatch) {
        description = descMatch[1].replace(/\s+/g, ' ').trim();
    }
    
    // 3. Extract Heading Elements
    let headings = [];
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) {
        headings.push(h1Match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
    }
    
    const h2Matches = html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
    for (const match of h2Matches) {
        headings.push(match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
    }
    
    // 4. Extract and Clean Main Text Body
    let body = html;
    
    // Strip comments, scripts, styles
    body = body.replace(/<!--[\s\S]*?-->/g, '');
    body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    body = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Strip header, footer, navigation blocks to index ONLY core page content
    body = body.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    body = body.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
    body = body.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    
    // Strip all HTML tags
    body = body.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    body = body.replace(/&nbsp;/g, ' ')
               .replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'");
               
    // Normalize spaces
    body = body.replace(/\s+/g, ' ').trim();
    
    // Grab first 1500 chars of body content
    const bodySnippet = body.substring(0, 1500);
    
    // Determine proper URL path
    let urlPath = '/' + relativePath.replace(/\\/g, '/');
    if (urlPath.endsWith('/index.html')) {
        urlPath = urlPath.slice(0, -10); // e.g. /contact-us/
    }
    
    searchIndex.push({
        id: urlPath,
        title: title || path.basename(filePath, '.html'),
        description: description,
        headings: headings.join(' '),
        body: bodySnippet
    });
}

console.log('Generating search index...');
// Start scanning from root
scanDirectory(rootDir);

fs.writeFileSync(outputFile, JSON.stringify(searchIndex, null, 2), 'utf-8');
console.log(`Search index successfully written to: ${outputFile} (${searchIndex.length} pages indexed)`);
