/* Abyssora Forge v3 — shared JS (wallet, buy-fix, i18n, theme, splash,
   slideshow, marquee, reveal). Mirrors the working v2 patterns.
   Ethers 6.13.2 UMD is loaded by each page before this file. */

/* ---- contract addresses: v3 NOT deployed yet. Fill after deploy. ---- */
const CONTRACT = "0x4785e7B396d13fB23b50BD66a6f828797C862770"; // AbyssoraV3 NFT (deployed 2026-11-16)
const MARKET   = "0xe7a4AB88F93ccE29DD4Ef030227a1C48291c1B6b"; // AbyssoraV3Market
const CLAIM    = "0x3638Dcfba442cd84AdC250299BA1290CF2Ef30E4"; // AbyssoraV3Claim
const ABY_TOKEN = "0xB184E6dda32aD7AcBca4a1CC232480e3bcCE1065"; // $ABY token — REUSED from v2 (live)
const DEPLOY_BLOCK = 133938076; // v3 NFT deploy block (claim scan start)
const ZERO = "0x0000000000000000000000000000000000000000";
const IS_PLACEHOLDER = CONTRACT === ZERO; // true until v3 is deployed
const MAX_SUPPLY = 6666;

const RPCS = ["https://bsc-dataseed.bnbchain.org","https://bsc-dataseed1.binance.org","https://rpc-bsc.48.club"];
const SEL_TOTAL = "0xa2309ff8", SEL_PRICEFOR = "0xd527979a";
const SEL_FORGECOUNT = "0xa40283d5", SEL_FORGEFEE = "0x1c1c0bda";
const SEL_TIEROF = "0x53f96df2", SEL_MINTPAUSED = "0x7e4831d3";
const SEL_BALANCEOF = "0x70a08231", SEL_ALLOWANCE = "0xdd62ed3e";
const SEL_LISTED = "0x05337198", SEL_LISTING = "0x107a274a";
const SEL_OWNEROF = "0x6352211e", SEL_TOKENURI = "0xc87b56dd", SEL_ISAPPROVED = "0xe985e9c5";
const SEL_CLAIMED = "0xdbe7e3bd", SEL_FEEPERNFT = "0x6256cbc6", SEL_TOTALSUPPLY = "0x18160ddd";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

let provider = null, signer = null, userAddr = null;
let LANG = "en";
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

async function rpcCall(to, data){
  for(const url of RPCS){
    try{
      const r = await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({jsonrpc:"2.0",id:1,method:"eth_call",params:[{to,data},"latest"]})});
      const j = await r.json(); if(j.result) return j.result;
    }catch(e){}
  }
  return null;
}
async function rpcGasPrice(){
  for(const url of RPCS){
    try{
      const r = await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({jsonrpc:"2.0",id:1,method:"eth_gasPrice",params:[]})});
      const j = await r.json(); if(j.result) return BigInt(j.result);
    }catch(e){}
  }
  return 1000000000n;
}
/* buy-fix: explicit gasPrice from the site's own RPCs + explicit gas limit.
   Never let the buyer wallet's provider return null fee data. */
async function sendTx(tx, gasLimit){
  const gp = await rpcGasPrice();
  return signer.sendTransaction({...tx, gasPrice: gp, gasLimit: BigInt(gasLimit)});
}
function txErrMsg(e){
  const m = (e && e.message) || String(e || "");
  if(m.indexOf("invalid BigNumberish") >= 0 || m.indexOf("value=null") >= 0) return STR[LANG].txWalletFee;
  return (e && e.reason) || m;
}
function shortAddr(a){ return a.slice(0,6) + "…" + a.slice(-4); }

/* ---- i18n: dynamic strings (static copy uses data-en/ja/zh/ko attrs) ---- */
const STR = {
en:{loading:"Loading live count…",noCount:"Could not load live count — check your connection and refresh.",
  comingSoon:"Contracts deploying — mint opens soon.",
  minted:(n,p)=>n+" of 6,666 minted ("+p+"%)",
  total:(q,t,f)=>"Total for "+q+": "+t+" BNB"+(f?" — FREE":""),
  txWalletFee:"Your wallet could not prepare this transaction (empty answer from the browser). Open this site inside your wallet app browser (MetaMask / Trust Wallet / Binance Wallet) and try again.",
  noWallet:"No browser wallet detected. Open this site inside your wallet app browser (MetaMask / Trust Wallet / Binance Wallet).",
  connected:"Connected. Your price is based on how many you have minted before.",
  connectFailed:"Connect failed: "},
ja:{loading:"ライブカウントを読み込み中…",noCount:"ライブカウントを読み込めませんでした — 接続を確認して更新してください。",
  comingSoon:"コントラクトをデプロイ中 — ミントは近日開始。",
  minted:(n,p)=>"6,666匹中"+n+"匹ミント済み（"+p+"%）",
  total:(q,t,f)=>"合計（"+q+"匹）: "+t+" BNB"+(f?" — 無料":""),
  txWalletFee:"ウォレットがこの取引を準備できませんでした（ブラウザからの応答が空でした）。MetaMask / Trust Wallet / Binance Wallet のアプリ内ブラウザでこのサイトを開いて、もう一度お試しください。",
  noWallet:"ブラウザウォレットが見つかりません。MetaMask / Trust Wallet / Binance Wallet のアプリ内ブラウザでこのサイトを開いてください。",
  connected:"接続しました。価格はあなたのミント回数で決まります。",
  connectFailed:"接続に失敗しました: "},
zh:{loading:"正在加载实时数量…",noCount:"无法加载实时数量——请检查网络并刷新。",
  comingSoon:"合约部署中——铸造即将开始。",
  minted:(n,p)=>"已铸造 "+n+" / 6,666（"+p+"%）",
  total:(q,t,f)=>"总价（"+q+"只）: "+t+" BNB"+(f?"——免费":""),
  txWalletFee:"您的钱包无法准备这笔交易（浏览器返回为空）。请在钱包应用内浏览器（MetaMask / Trust Wallet / Binance Wallet）中打开本网站，然后重试。",
  noWallet:"未检测到浏览器钱包。请在钱包应用内浏览器（MetaMask / Trust Wallet / Binance Wallet）中打开本网站。",
  connected:"已连接。价格按你之前的铸造次数计算。",
  connectFailed:"连接失败："},
ko:{loading:"실시간 수량 불러오는 중…",noCount:"실시간 수량을 불러올 수 없습니다 — 연결을 확인하고 새로고침하세요。",
  comingSoon:"컨트랙트 배포 중 — 민팅 곧 시작.",
  minted:(n,p)=>"6,666개 중 "+n+"개 민팅됨 ("+p+"%)",
  total:(q,t,f)=>"총액（"+q+"개）: "+t+" BNB"+(f?" — 무료":""),
  txWalletFee:"지갑이 이 거래를 준비하지 못했습니다(브라우저의 응답이 비어 있습니다). MetaMask / Trust Wallet / Binance Wallet 앱 내 브라우저에서 이 사이트를 열고 다시 시도해 주세요。",
  noWallet:"브라우저 지갑이 없습니다. MetaMask / Trust Wallet / Binance Wallet 앱 내 브라우저에서 이 사이트를 여세요.",
  connected:"연결됨. 가격은 이전 민팅 횟수를 따릅니다.",
  connectFailed:"연결 실패: "}
};

function setLang(l){
  LANG = l;
  try{ localStorage.setItem("abyssora-v3-lang", l); }catch(e){}
  document.documentElement.lang = l === "zh" ? "zh-CN" : l;
  document.querySelectorAll("[data-lang]").forEach(b=>{
    b.classList.toggle("on", b.dataset.lang === l);
  });
  document.querySelectorAll("[data-en]").forEach(el=>{
    if(el.id === "connectBtn" && userAddr) return;
    const v = el.dataset[l]; if(v !== undefined) el.textContent = v;
  });
  document.querySelectorAll("[data-en-html]").forEach(el=>{
    const v = el.dataset[l+"Html"]; if(v !== undefined) el.innerHTML = v;
  });
  if(typeof refresh === "function") refresh();
}
function initLang(){
  const saved = (function(){ try{ return localStorage.getItem("abyssora-v3-lang") || ""; }catch(e){ return ""; } })();
  const nav = (navigator.language || "en").slice(0,2);
  setLang(saved || (nav === "ja" ? "ja" : nav === "zh" ? "zh" : nav === "ko" ? "ko" : "en"));
}

/* ---- theme ---- */
function setTheme(t){
  document.documentElement.setAttribute("data-theme", t);
  try{ localStorage.setItem("abyssora-v3-theme", t); }catch(e){}
  document.querySelectorAll(".themebtn").forEach(b=>{ b.textContent = t === "light" ? "DARK" : "LIGHT"; });
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  setTheme(cur === "light" ? "dark" : "light");
}
function initTheme(){
  const saved = (function(){ try{ return localStorage.getItem("abyssora-v3-theme") || "dark"; }catch(e){ return "dark"; } })();
  setTheme(saved);
}

/* ---- wallet ---- */
async function connectWallet(){
  const msgEl = document.getElementById("mintMsg") || document.getElementById("pageMsg");
  if(!window.ethereum){
    if(msgEl){ msgEl.className = "warn"; msgEl.textContent = STR[LANG].noWallet; }
    return false;
  }
  try{
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const net = await provider.getNetwork();
    if(net.chainId !== 56n){ await window.ethereum.request({method:"wallet_switchEthereumChain", params:[{chainId:"0x38"}]}); }
    signer = await provider.getSigner(); userAddr = await signer.getAddress();
    const btn = document.getElementById("connectBtn");
    if(btn) btn.textContent = "CONNECTED: " + userAddr.slice(0,6) + "…" + userAddr.slice(-4);
    if(msgEl){ msgEl.className = ""; msgEl.textContent = STR[LANG].connected; }
    if(typeof updateCost === "function") updateCost();
    if(typeof onConnect === "function") onConnect();
    return true;
  }catch(e){
    if(msgEl) msgEl.textContent = STR[LANG].connectFailed + (e.message || e);
    return false;
  }
}

/* ---- splash ---- */
function initSplash(){
  const s = document.getElementById("splash"); if(!s) return;
  let seen = false;
  try{ seen = sessionStorage.getItem("abyssora-v3-splash") === "1"; }catch(e){}
  if(seen){ s.classList.add("hide"); return; }
  const enter = document.getElementById("splashEnter"), skip = document.getElementById("splashSkip");
  const close = ()=>{ s.classList.add("hide"); try{ sessionStorage.setItem("abyssora-v3-splash","1"); }catch(e){} };
  if(enter) enter.addEventListener("click", close);
  if(skip) skip.addEventListener("click", close);
  setTimeout(close, 9000);
}

/* ---- hero slideshow: two-layer opacity crossfade (no flash) ---- */
const SLIDES = [
  {img:"images/mythic.webp",    name:"The Abyss Itself",  rarity:"Mythic",    color:"#ffb347"},
  {img:"images/legendary.webp", name:"Sunken Royalty",    rarity:"Legendary", color:"#b388ff"},
  {img:"images/epic.webp",      name:"Ancient Leviathan", rarity:"Epic",      color:"#4ec9e1"},
  {img:"images/rare.webp",      name:"Abyss Hunter",      rarity:"Rare",      color:"#35e0c8"},
  {img:"images/uncommon.webp",  name:"Tide Guardian",     rarity:"Uncommon",  color:"#7ddf8e"},
  {img:"images/common.webp",    name:"Reef Dweller",      rarity:"Common",    color:"#e8e8e8"}
];
let slideIdx = 0, slideTimer = null, slidePaused = false, slideToken = 0;
let slideLayerA = true; /* which layer (slideImg vs slideImgB) is visible */
function showSlide(i){
  slideIdx = (i + SLIDES.length) % SLIDES.length;
  const s = SLIDES[slideIdx];
  const imgA = document.getElementById("slideImg"), imgB = document.getElementById("slideImgB");
  const nm = document.getElementById("slideName"), num = document.getElementById("slideNum");
  if(nm){ nm.textContent = s.rarity + " — " + s.name; nm.style.color = s.color; }
  if(num) num.textContent = (slideIdx + 1) + " / " + SLIDES.length;
  if(!imgA) return;
  if(!imgB){ imgA.src = s.img; imgA.alt = s.name; return; } /* single-layer fallback */
  const show = slideLayerA ? imgB : imgA; /* hidden layer becomes the new slide */
  const hide = slideLayerA ? imgA : imgB;
  const token = ++slideToken; /* stale preloads must not flip layers */
  const pre = new Image();
  const swap = ()=>{
    if(token !== slideToken) return;
    show.src = s.img; show.alt = s.name;
    show.style.opacity = "1"; hide.style.opacity = "0";
    slideLayerA = !slideLayerA;
  };
  pre.onload = swap; pre.onerror = swap;
  pre.src = s.img;
}
function startSlideshow(){
  if(!document.getElementById("slideImg")) return;
  SLIDES.forEach(s=>{ const im = new Image(); im.src = s.img; }); /* preload all slides */
  showSlide(0);
  if(REDUCED_MOTION) return; /* static first slide, no auto-advance */
  slideTimer = setInterval(()=>{ if(!slidePaused) showSlide(slideIdx + 1); }, 4000);
}
function toggleSlidePause(){
  slidePaused = !slidePaused;
  const b = document.getElementById("slidePause");
  if(b) b.textContent = slidePaused ? "▶ PLAY" : "❚❚ PAUSE";
}
function nextSlide(){ showSlide(slideIdx + 1); }

/* ---- marquee: button pause + touch-hold pause ---- */
let marqueeHeld = false, marqueeManual = false;
function applyMarqueePause(){
  const paused = marqueeHeld || marqueeManual;
  document.querySelectorAll(".marquee").forEach(m=>m.classList.toggle("paused", paused));
  const b = document.getElementById("marqueePause");
  if(b) b.textContent = paused ? "▶ RESUME SCROLL" : "❚❚ PAUSE SCROLL";
}
function toggleMarquee(){
  marqueeManual = !marqueeManual;
  applyMarqueePause();
}
function initMarqueeHold(){
  document.querySelectorAll(".marquee").forEach(m=>{
    m.addEventListener("pointerdown", ()=>{ marqueeHeld = true; applyMarqueePause(); }, {passive:true});
    ["pointerup","pointercancel","pointerleave"].forEach(ev=>
      m.addEventListener(ev, ()=>{ marqueeHeld = false; applyMarqueePause(); }, {passive:true}));
  });
}

/* ---- misc chrome: reveals, sticky CTA, burger menu ---- */
function initChrome(){
  const reveals = document.querySelectorAll(".reveal");
  if(REDUCED_MOTION || !("IntersectionObserver" in window)){
    reveals.forEach(el=>el.classList.add("on")); /* content visible immediately */
  } else {
    const io = new IntersectionObserver((es,o)=>{ es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("on"); o.unobserve(e.target); } }); },
      {threshold:0.15, rootMargin:"0px 0px -6% 0px"});
    reveals.forEach(el=>io.observe(el));
  }
  const top = document.getElementById("toTop");
  window.addEventListener("scroll", ()=>{
    if(top) top.classList.toggle("show", window.scrollY > 700);
    const cta = document.getElementById("mobileCta");
    if(cta) cta.classList.toggle("show", window.scrollY > 560);
  }, {passive:true});
  if(top) top.addEventListener("click", ()=>window.scrollTo({top:0, behavior: REDUCED_MOTION ? "auto" : "smooth"}));
  /* burger menu: close on link tap / Escape */
  const mm = document.getElementById("mobileMenu");
  if(mm){
    mm.querySelectorAll("a").forEach(a=>a.addEventListener("click", ()=>mm.classList.remove("open")));
    document.addEventListener("keydown", e=>{ if(e.key === "Escape") mm.classList.remove("open"); });
  }
  initMarqueeHold();
}
function toggleMenu(){
  const m = document.getElementById("mobileMenu"); if(m) m.classList.toggle("open");
}
var lastCount = null;
function countUp(el, to){
  if(!el) return;
  if(REDUCED_MOTION){ el.textContent = to; lastCount = to; return; }
  if(lastCount === null){ el.textContent = to; lastCount = to; return; }
  const from = lastCount; lastCount = to;
  if(from === to){ el.textContent = to; return; }
  const t0 = performance.now();
  function step(ts){
    const k = Math.min(1, (ts - t0) / 700);
    el.textContent = Math.round(from + (to - from) * k);
    if(k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
