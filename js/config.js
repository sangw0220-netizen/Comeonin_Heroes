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

  /* 비밀번호는 평문으로 저장하지 않고 SHA-256 해시만 비교합니다.
     입력 비밀번호: 사용자 지정 값 / 아래에는 해시만 존재합니다. */
  var ACCESS_PASSWORD_SHA256 = '801c3b3af68112aef15275551bd2f5a88cf4efdeb61c48eefe97f7cd387a713f';
  var SESSION_UNLOCK_KEY = '__comeonin_domain_unlock_v1__:' + (host || 'file');

  function hasSessionUnlock(){
    try { return sessionStorage.getItem(SESSION_UNLOCK_KEY) === '1'; }
    catch(_){ return false; }
  }
  function saveSessionUnlock(){
    try { sessionStorage.setItem(SESSION_UNLOCK_KEY,'1'); return true; }
    catch(_){ return false; }
  }
  function rotr(n,x){ return (x>>>n)|(x<<(32-n)); }
  function sha256Fallback(ascii){
    var mathPow=Math.pow,maxWord=mathPow(2,32),lengthProperty='length',i,j,result='',words=[],asciiBitLength=ascii[lengthProperty]*8;
    var baseHash=sha256Fallback.h=sha256Fallback.h||[],k=sha256Fallback.k=sha256Fallback.k||[],primeCounter=k[lengthProperty],isComposite={};
    if(!primeCounter){
      for(var candidate=2;primeCounter<64;candidate++){
        if(!isComposite[candidate]){
          for(i=0;i<313;i+=candidate)isComposite[i]=candidate;
          baseHash[primeCounter]=(mathPow(candidate,.5)*maxWord)|0;
          k[primeCounter++]=(mathPow(candidate,1/3)*maxWord)|0;
        }
      }
    }
    var hash=baseHash.slice(0);
    ascii += '\x80';
    while(ascii[lengthProperty]%64-56) ascii+='\x00';
    for(i=0;i<ascii[lengthProperty];i++){
      j=ascii.charCodeAt(i);
      if(j>>8) return '';
      words[i>>2]|=j<<((3-i)%4)*8;
    }
    words[words[lengthProperty]]=((asciiBitLength/maxWord)|0);
    words[words[lengthProperty]]=asciiBitLength;
    for(j=0;j<words[lengthProperty];){
      var w=words.slice(j,j+=16),oldHash=hash.slice(0),a=hash[0],b=hash[1],c=hash[2],d=hash[3],e=hash[4],f=hash[5],g=hash[6],h=hash[7];
      for(i=0;i<64;i++){
        var w15=w[i-15],w2=w[i-2];
        var s0=i<16?0:(rotr(7,w15)^rotr(18,w15)^(w15>>>3));
        var s1=i<16?0:(rotr(17,w2)^rotr(19,w2)^(w2>>>10));
        var wi=w[i]=i<16?w[i]:((w[i-16]+s0+w[i-7]+s1)|0);
        var S1=rotr(6,e)^rotr(11,e)^rotr(25,e),ch=(e&f)^((~e)&g),temp1=(h+S1+ch+k[i]+wi)|0;
        var S0=rotr(2,a)^rotr(13,a)^rotr(22,a),maj=(a&b)^(a&c)^(b&c),temp2=(S0+maj)|0;
        h=g;g=f;f=e;e=(d+temp1)|0;d=c;c=b;b=a;a=(temp1+temp2)|0;
      }
      hash=[(oldHash[0]+a)|0,(oldHash[1]+b)|0,(oldHash[2]+c)|0,(oldHash[3]+d)|0,(oldHash[4]+e)|0,(oldHash[5]+f)|0,(oldHash[6]+g)|0,(oldHash[7]+h)|0];
    }
    for(i=0;i<8;i++) for(j=3;j+1;j--){ var byte=(hash[i]>>(j*8))&255; result+=(byte<16?'0':'')+byte.toString(16); }
    return result;
  }
  async function sha256Hex(value){
    if(window.crypto && window.crypto.subtle && window.TextEncoder){
      try{
        var buf=await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
        return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
      }catch(_){ }
    }
    return sha256Fallback(unescape(encodeURIComponent(value)));
  }

  // comeonin-heroes-xxxxx.vercel.app 같은 Vercel 프리뷰 배포 주소도 자동으로 허용합니다.
  var isVercelPreview = /^comeonin-heroes(-[a-z0-9-]+)?\.vercel\.app$/i.test(host);

  /* ---- 로컬 개발 환경은 항상 허용합니다 ---- */
  var isFileProtocol = (proto === 'file:') || host === '';
  var isPrivateIP = /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)
                 || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
                 || /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host);
  var isLocalDev = isFileProtocol || isPrivateIP;
  var passwordUnlocked = hasSessionUnlock();
  var allowed = isLocalDev || passwordUnlocked || ALLOWED_HOSTS.indexOf(host) !== -1 || isVercelPreview;

  if(!allowed){
    window.__DUNGEON_DOMAIN_LOCKED__ = true;
    window.requestAnimationFrame = function(){ return 0; };

    var showLock = function(){
      if(document.getElementById('domainLockOverlay')) return;
      var overlay = document.createElement('div');
      overlay.id = 'domainLockOverlay';
      overlay.innerHTML =
        '<div class="dlo-box">' +
          '<div class="dlo-icon">🔒</div>' +
          '<h2>허용되지 않은 주소입니다</h2>' +
          '<p>공식 주소에서 접속하거나, 관리자 비밀번호를 입력하면 현재 탭에서 임시로 이용할 수 있습니다.</p>' +
          '<a class="dlo-link" href="https://comeonin-heroes.vercel.app">https://comeonin-heroes.vercel.app</a>' +
          '<div class="dlo-divider"><span>또는</span></div>' +
          '<form class="dlo-form" id="domainUnlockForm" autocomplete="off">' +
            '<label class="dlo-label" for="domainUnlockPassword">관리자 비밀번호</label>' +
            '<div class="dlo-input-row">' +
              '<input id="domainUnlockPassword" class="dlo-input" type="password" autocomplete="current-password" spellcheck="false" placeholder="비밀번호 입력" />' +
              '<button class="dlo-btn" type="submit">잠금 해제</button>' +
            '</div>' +
            '<div class="dlo-error" id="domainUnlockError" role="alert" aria-live="polite"></div>' +
            '<div class="dlo-note">승인은 이 브라우저 탭을 닫을 때까지 유지됩니다.</div>' +
          '</form>' +
        '</div>';
      document.body.appendChild(overlay);

      var form=document.getElementById('domainUnlockForm');
      var input=document.getElementById('domainUnlockPassword');
      var error=document.getElementById('domainUnlockError');
      var button=form&&form.querySelector('.dlo-btn');
      if(input) setTimeout(function(){ input.focus(); },0);
      if(form){
        form.addEventListener('submit',async function(e){
          e.preventDefault();
          if(!input || !button) return;
          var value=input.value||'';
          if(!value){ error.textContent='비밀번호를 입력해 주세요.'; input.focus(); return; }
          button.disabled=true; button.textContent='확인 중…'; error.textContent='';
          var digest=await sha256Hex(value);
          if(digest===ACCESS_PASSWORD_SHA256){
            saveSessionUnlock();
            button.textContent='승인 완료';
            window.location.reload();
            return;
          }
          button.disabled=false; button.textContent='잠금 해제';
          error.textContent='비밀번호가 올바르지 않습니다.';
          overlay.classList.remove('dlo-denied'); void overlay.offsetWidth; overlay.classList.add('dlo-denied');
          input.select(); input.focus();
        });
      }
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',showLock);
    else showLock();
  }
})();;
