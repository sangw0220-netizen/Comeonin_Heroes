/* ===== 빌드 스크립트 =====
   소스(index.html, css/, js/, assets/)는 그대로 두고,
   실제로 배포할 난독화된 버전만 dist/ 폴더에 새로 만듭니다.

   로컬 개발/유지보수는 항상 이 파일이 아니라 원래 소스 파일들(js/01-backend-and-data.js 등)을
   직접 고치시면 됩니다. dist/ 는 매번 이 스크립트가 새로 생성하는 산출물이라 git에 커밋하지 않고,
   Vercel이 배포할 때마다 자동으로 이 스크립트를 실행해서 만들어냅니다.

   실행: node build.js
*/
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SRC_DIR = __dirname;
const DIST_DIR = path.join(__dirname, 'dist');

// ---- 여기서 난독화 강도를 조절할 수 있습니다 ----
const OBFUSCATOR_OPTIONS = {
  compact: true,
  // renameGlobals는 반드시 false로 둬야 합니다.
  // 이 프로젝트는 js/01~06, config.js, patches.js가 각각 별도 <script> 태그로 로드되면서
  // state, renderUI, gameLoop 같은 전역 이름을 서로 공유합니다. true로 바꾸면 파일마다
  // 이름이 제각각 바뀌어서 게임이 즉시 깨집니다.
  renameGlobals: false,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.4, // 너무 높이면(1에 가까울수록) 저사양 모바일에서 살짝 느려질 수 있습니다.
  stringArray: true,
  stringArrayThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  deadCodeInjection: false, // 용량만 늘고 실질적 보호 효과는 적어서 꺼둡니다.
  selfDefending: true,      // 코드를 포맷터로 예쁘게 펴서 실행하려 하면 동작을 멈추는 안전장치.
  debugProtection: false,   // true로 켜면 개발자도구 열 때마다 무한 debugger가 걸립니다.
                             // 방문자뿐 아니라 우리 자신도 나중에 디버깅하기 어려워져서 꺼둡니다.
  disableConsoleOutput: false,
  numbersToExpressions: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
};

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function obfuscateFile(src, dest) {
  const code = fs.readFileSync(src, 'utf-8');
  const result = JavaScriptObfuscator.obfuscate(code, OBFUSCATOR_OPTIONS);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, result.getObfuscatedCode());
}

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'dist' || entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(full, onFile);
    } else {
      onFile(full);
    }
  }
}

console.log('[build] cleaning dist/ ...');
rimraf(DIST_DIR);

console.log('[build] copying index.html, css/, assets/ as-is ...');
copyFile(path.join(SRC_DIR, 'index.html'), path.join(DIST_DIR, 'index.html'));
walk(path.join(SRC_DIR, 'css'), (file) => {
  const rel = path.relative(SRC_DIR, file);
  copyFile(file, path.join(DIST_DIR, rel));
});
walk(path.join(SRC_DIR, 'assets'), (file) => {
  const rel = path.relative(SRC_DIR, file);
  copyFile(file, path.join(DIST_DIR, rel));
});

console.log('[build] obfuscating js/ ...');
let jsCount = 0;
walk(path.join(SRC_DIR, 'js'), (file) => {
  if (!file.endsWith('.js')) return;
  const rel = path.relative(SRC_DIR, file);
  obfuscateFile(file, path.join(DIST_DIR, rel));
  jsCount++;
  console.log('  -', rel);
});

console.log(`[build] done. ${jsCount} js file(s) obfuscated into dist/`);
