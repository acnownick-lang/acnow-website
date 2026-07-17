const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const searchIndexFile = path.join(rootDir, 'assets', 'data', 'search-index.json');
const sitemapFile = path.join(rootDir, 'sitemap.xml');

const today = new Date().toISOString().split('T')[0];

console.log('Generating sitemap.xml...');

if (!fs.existsSync(searchIndexFile)) {
    console.error('Error: search-index.json not found! Run generate-search-index.js first.');
    process.exit(1);
}

const searchIndex = JSON.parse(fs.readFileSync(searchIndexFile, 'utf-8'));

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

searchIndex.forEach(item => {
    let urlPath = item.id;
    
    // Normalize root path
    if (urlPath === '/' || urlPath === '/index.html') {
        xml += '  <url>\n';
        xml += '    <loc>https://acnowllc.com/</loc>\n';
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>1.0</priority>\n';
        xml += '  </url>\n';
        return;
    }
    
    // Determine priority and changefreq based on path depth
    const depth = urlPath.split('/').filter(Boolean).length;
    let priority = '0.8';
    let changefreq = 'monthly';
    
    // Nested regional/SEO pages get lower priority
    if (depth >= 2) {
        priority = '0.6';
    }
    
    xml += '  <url>\n';
    xml += `    <loc>https://acnowllc.com${urlPath}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${changefreq}</changefreq>\n`;
    xml += `    <priority>${priority}</priority>\n`;
    xml += '  </url>\n';
});

xml += '</urlset>\n';

// Supplemental entries: /hvac-services-{city}/ pages are served via 200-rewrite
// from /pages/ (no physical directory), so add their canonical clean paths explicitly.
const hvacServicesCities = [
    'palm-city', 'stuart', 'port-st-lucie', 'jensen-beach',
    'hobe-sound', 'north-palm-beach', 'fort-pierce', 'jupiter', 'palm-beach-gardens'
];
xml = xml.replace('</urlset>\n', '');
hvacServicesCities.forEach(city => {
    xml += '  <url>\n';
    xml += `    <loc>https://acnowllc.com/hvac-services-${city}/</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <changefreq>monthly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
});
xml += '</urlset>\n';

fs.writeFileSync(sitemapFile, xml, 'utf-8');
const totalCount = searchIndex.length + hvacServicesCities.length;
console.log(`sitemap.xml successfully written to: ${sitemapFile} (${totalCount} URLs mapped)`);

