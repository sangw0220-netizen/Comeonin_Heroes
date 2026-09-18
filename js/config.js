/* ===== Supabase configuration =====
   Project URL is fixed to the user's Supabase project.
   Replace ONLY the publishable key below with the key from:
   Supabase → Project Settings → API Keys → Publishable Keys
*/
window.DUNGEON_SUPABASE_URL = 'https://thdhzvozwzsjaicknhgj.supabase.co';
window.DUNGEON_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZySCTRrNQdookaHtB0FlLQ_RuXM_7j_';
window.MAWANG_SPRITE_DATA = 'assets/images/img_001_e38aa36200.png';

/* ===== 도메인 잠금 =====
   여기 적힌 주소가 아니면 게임이 실행되지 않고 안내 화면만 뜹니다.
   완전한 차단은 아니고(개발자도구로 이 파일 자체를 지우면 우회 가능), 코드를 그대로
   복사해서 다른 주소에 올리는 것 정도를 막는 용도입니다.

   나중에 커스텀 도메인을 연결하면 아래 배열에 그 주소도 추가하세요.
   예: 'mygame.com', 'www.mygame.com'
*/
(function(){
  var ALLOWED_HOSTS = [
    'comeonin-heroes.vercel.app',
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '[::1]'
  ];
  var host = window.location.hostname;
  var proto = window.location.protocol;

  // comeonin-heroes-xxxxx.vercel.app 같은 Vercel 프리뷰 배포 주소도 자동으로 허용합니다
  // (PR/브랜치마다 생기는 임시 주소라 미리 다 적어둘 수 없어서, 접두사로 판단합니다).
  var isVercelPreview = /^comeonin-heroes(-[a-z0-9-]+)?\.vercel\.app$/i.test(host);

  /* ---- 로컬 개발 환경은 항상 허용합니다 ----
     1) index.html을 더블클릭해서 열면 주소가 file:// 이고 hostname이 빈 문자열입니다.
        (이 경우가 빠져 있어서 로컬 테스트가 막혔습니다.)
     2) 같은 와이파이의 휴대폰으로 테스트할 때 쓰는 사설 IP(192.168.x.x, 10.x.x.x,
        172.16~31.x.x)도 허용합니다.
     로컬은 어차피 본인 컴퓨터 안이라, 여기서 열린다고 코드가 유출되지는 않습니다. */
  var isFileProtocol = (proto === 'file:') || host === '';
  var isPrivateIP = /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)
                 || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
                 || /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host);
  var isLocalDev = isFileProtocol || isPrivateIP;

  var allowed = isLocalDev || ALLOWED_HOSTS.indexOf(host) !== -1 || isVercelPreview;

  if(!allowed){
    window.__DUNGEON_DOMAIN_LOCKED__ = true;
    // 아래에서 게임 루프(gameLoop)가 requestAnimationFrame으로 자기 자신을 계속 예약하며 도는데,
    // 이 시점에 requestAnimationFrame을 빈 함수로 바꿔두면 게임 로직 자체가 시작되지 않습니다.
    // (게임 파일들은 건드리지 않고 여기서만 막습니다.)
    window.requestAnimationFrame = function(){ return 0; };

    var showLock = function(){
      var overlay = document.createElement('div');
      overlay.id = 'domainLockOverlay';
      overlay.innerHTML =
        '<div class="dlo-box">' +
          '<div class="dlo-icon">🔒</div>' +
          '<h2>허용되지 않은 주소입니다</h2>' +
          '<p>이 게임은 아래 주소에서만 플레이할 수 있어요.</p>' +
          '<a class="dlo-link" href="https://comeonin-heroes.vercel.app">https://comeonin-heroes.vercel.app</a>' +
        '</div>';
      document.body.appendChild(overlay);
    };
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded', showLock);
    } else {
      showLock();
    }
  }
})();
