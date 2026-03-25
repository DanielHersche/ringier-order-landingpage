const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const inputPath = path.join(projectRoot, 'public', 'original-famillesuisse.html');
const outputPath = path.join(projectRoot, 'src', 'views', '_main_pixel.html');

function mustRead(p) {
  return fs.readFileSync(p, 'utf8');
}

function extractMain(html) {
  const m = html.match(/<main[\s\S]*?<\/main>/);
  if (!m) throw new Error('Kein <main>...</main> Block gefunden');
  return m[0];
}

function replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}

function transformMain(mainHtml) {
  let html = mainHtml;

  // Anchor links: /famillesuisse#... -> /#...
  html = html.replaceAll('href="/famillesuisse#', 'href="/#');
  html = html.replaceAll('href="/famillesuisse', 'href="/"');

  // CTA links: online-kiosk cart -> our cart route
  html = html.replaceAll('href="https://www.online-kiosk.ch/cart/30229429"', 'href="/cart/add?offer=beobachter"');
  html = html.replaceAll('href="https://www.online-kiosk.ch/cart/30229433"', 'href="/cart/add?offer=gluecksPost"');
  html = html.replaceAll('href="https://www.online-kiosk.ch/cart/30228714"', 'href="/cart/add?offer=landLiebe"');
  html = html.replaceAll('href="https://www.online-kiosk.ch/cart/30229435"', 'href="/cart/add?offer=schweizerIllustrierte"');
  html = html.replaceAll('href="https://www.online-kiosk.ch/cart/30229441"', 'href="/cart/add?offer=tele"');
  html = html.replaceAll('href="https://www.online-kiosk.ch/cart/30229431"', 'href="/cart/add?offer=blick"');
  html = html.replaceAll('href="https://www.online-kiosk.ch/cart/30229439"', 'href="/cart/add?offer=sonntagsBlick"');
  html = html.replaceAll('href="https://www.online-kiosk.ch/cart/30229437"', 'href="/cart/add?offer=lIllustrE"');

  // Replace Next image optimizer URLs with local assets.
  // We match the decoded "src" attribute that the SSR delivers.
  const imageReplacements = [
    // banner
    {
      from: /src="\/_next\/image\?url=https%3A%2F%2Fdirectus-files-ringier-shops-admin-prod\.s3\.eu-central-1\.amazonaws\.com%2F8b8b53f9-3e00-4133-a854-e5869df4b01f\.jpg&amp;w=\d+&amp;q=\d+"/g,
      to: 'src="/images/banner.jpg"',
    },
    // magazines
    {
      from: /src="\/_next\/image\?url=https%3A%2F%2Fdirectus-files-ringier-shops-admin-prod\.s3\.eu-central-1\.amazonaws\.com%2Ff20fd285-9161-4ed1-8256-babc3cacf984\.png&amp;w=\d+&amp;q=\d+"/g,
      to: 'src="/images/beobachter.png"',
    },
    {
      from: /src="\/_next\/image\?url=https%3A%2F%2Fdirectus-files-ringier-shops-admin-prod\.s3\.eu-central-1\.amazonaws\.com%2Fad9b1b22-1ee5-440c-93d4-733270624389\.png&amp;w=\d+&amp;q=\d+"/g,
      to: 'src="/images/gluecksPost.png"',
    },
    {
      from: /src="\/_next\/image\?url=https%3A%2F%2Fdirectus-files-ringier-shops-admin-prod\.s3\.eu-central-1\.amazonaws\.com%2F40046fe0-2bea-42f4-82f8-a9bf21766c2d\.png&amp;w=\d+&amp;q=\d+"/g,
      to: 'src="/images/landLiebe.png"',
    },
    {
      from: /src="\/_next\/image\?url=https%3A%2F%2Fdirectus-files-ringier-shops-admin-prod\.s3\.eu-central-1\.amazonaws\.com%2Fbd276e85-1ce5-4639-8c8a-559a0413e10b\.png&amp;w=\d+&amp;q=\d+"/g,
      to: 'src="/images/schweizerIllustrierte.png"',
    },
    {
      from: /src="\/_next\/image\?url=https%3A%2F%2Fdirectus-files-ringier-shops-admin-prod\.s3\.eu-central-1\.amazonaws\.com%2F7e52f1dd-4305-4e75-99b9-3b3a1e19249b\.png&amp;w=\d+&amp;q=\d+"/g,
      to: 'src="/images/tele.png"',
    },
    {
      from: /src="\/_next\/image\?url=https%3A%2F%2Fdirectus-files-ringier-shops-admin-prod\.s3\.eu-central-1\.amazonaws\.com%2F384136e3-6531-4687-9102-6938ec387ad1\.png&amp;w=\d+&amp;q=\d+"/g,
      to: 'src="/images/blick.png"',
    },
    {
      from: /src="\/_next\/image\?url=https%3A%2F%2Fdirectus-files-ringier-shops-admin-prod\.s3\.eu-central-1\.amazonaws\.com%2Fffee4191-2e93-4752-aaca-b78a45b0c735\.png&amp;w=\d+&amp;q=\d+"/g,
      to: 'src="/images/sonntagsBlick.png"',
    },
    {
      from: /src="\/_next\/image\?url=https%3A%2F%2Fdirectus-files-ringier-shops-admin-prod\.s3\.eu-central-1\.amazonaws\.com%2F6bc04e53-a749-46ba-a234-59bdd9d96583\.png&amp;w=\d+&amp;q=\d+"/g,
      to: 'src="/images/lIllustrE.png"',
    },
  ];

  for (const r of imageReplacements) {
    html = html.replace(r.from, r.to);
  }

  // Remove srcSet attributes that still point to /_next/image (optional, but keeps HTML smaller/cleaner).
  html = html.replace(/\s+srcSet="[^"]*"/g, '');
  html = html.replace(/\s+sizes="[^"]*"/g, '');

  return html;
}

function main() {
  const full = mustRead(inputPath);
  const mainBlock = extractMain(full);
  const out = transformMain(mainBlock);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, out, 'utf8');
  console.log(`Wrote ${outputPath} (${out.length} chars)`);
}

main();

