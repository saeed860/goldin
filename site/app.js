(function(){
var $=function(i){return document.getElementById(i)};
var FEE=0.005, MS=4.3318;
var PD='۰۱۲۳۴۵۶۷۸۹',AD='٠١٢٣٤٥٦٧٨٩';
function parse(v){v=String(v).replace(/[۰-۹]/g,function(d){return PD.indexOf(d)}).replace(/[٠-٩]/g,function(d){return AD.indexOf(d)}).replace(/[,٬،\s]/g,'');var n=parseFloat(v);return isFinite(n)?n:0}
function fa(n,d){return Number(n).toLocaleString('fa-IR',{maximumFractionDigits:d==null?0:d})}
function fmt(n,d){if(!n)return '';var s=n.toFixed(d);if(d>0)s=s.replace(/\.?0+$/,'');var p=s.split('.');p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');return p.join('.')}

// ذخیره‌سازی (اگر مرورگر اجازه ندهد، فقط در حافظهٔ صفحه)
var mem={users:{},session:null,price:24898000,usdt:259750};
function load(){try{var d=JSON.parse(localStorage.getItem('goldin_db'));if(d&&d.users)return d}catch(e){}return mem}
function save(){mem=db;try{localStorage.setItem('goldin_db',JSON.stringify(db))}catch(e){}}
var db=load();
function toast(m){var t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2400)}
function me(){return db.session&&db.users[db.session]}

// رمز عبور: نمک + SHA-256 (نمونهٔ آزمایشی؛ در نسخهٔ واقعی سمت سرور انجام می‌شود)
function hex(buf){return Array.prototype.map.call(new Uint8Array(buf),function(b){return ('0'+b.toString(16)).slice(-2)}).join('')}
function hash(salt,pw){
  if(!window.crypto||!crypto.subtle)return Promise.reject(new Error('نیاز به اتصال امن (https)'));
  return crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+pw)).then(hex);
}
function rnd(){var a=new Uint8Array(16);crypto.getRandomValues(a);return hex(a)}

// مسیریابی با hash ساده
var mode='login';
function route(){
  var h=location.hash.replace('#','')||'home';
  if(h==='panel'&&!me()){location.hash='#login';return}
  if((h==='login'||h==='signup')&&me()){location.hash='#panel';return}
  ['home','auth','panel'].forEach(function(v){$('v-'+v).classList.remove('on')});
  if(h==='login'||h==='signup'){mode=h;$('v-auth').classList.add('on');authUI()}
  else if(h==='panel'){$('v-panel').classList.add('on');renderPanel()}
  else $('v-home').classList.add('on');
  nav();window.scrollTo(0,0);
}
function nav(){
  var n=$('nav');n.textContent='';
  function a(t,href,cls,fn){var e=document.createElement(href?'a':'button');e.textContent=t;e.className='btn sm '+cls;if(href)e.href=href;else{e.type='button';e.onclick=fn}n.appendChild(e)}
  if(me()){a('پنل من','#panel','',null);a('خروج','','ghost',function(){db.session=null;save();location.hash='#home';route()})}
  else{a('ورود','#login','ghost',null);a('ثبت‌نام','#signup','',null)}
}
window.addEventListener('hashchange',route);

// ورود و ثبت‌نام
function authUI(){
  var s=mode==='signup';
  Array.prototype.forEach.call($('authTabs').children,function(b){b.classList.toggle('on',b.dataset.m===mode)});
  $('pw2w').hidden=!s;$('authGo').textContent=s?'ساخت حساب':'ورود';
  $('pw').autocomplete=s?'new-password':'current-password';$('authErr').textContent='';
}
$('authTabs').addEventListener('click',function(e){var m=e.target.dataset&&e.target.dataset.m;if(m)location.hash='#'+m});
$('authGo').addEventListener('click',function(){
  var em=$('em').value.trim().toLowerCase(),pw=$('pw').value,err=$('authErr');err.textContent='';
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){err.textContent='ایمیل معتبر وارد کنید.';return}
  if(pw.length<8){err.textContent='رمز عبور باید حداقل ۸ کاراکتر باشد.';return}
  if(mode==='signup'){
    if(pw!==$('pw2').value){err.textContent='تکرار رمز با رمز اصلی یکی نیست.';return}
    if(db.users[em]){err.textContent='با این ایمیل قبلاً حساب ساخته شده است. وارد شوید.';return}
    var salt=rnd();
    hash(salt,pw).then(function(h){
      db.users[em]={salt:salt,hash:h,bal:{t:0,u:0,s:0},tx:[]};db.session=em;save();
      $('pw').value=$('pw2').value='';toast('حساب ساخته شد.');location.hash='#panel';route();
    }).catch(function(x){err.textContent=x.message});
  }else{
    var u=db.users[em];
    if(!u){err.textContent='ایمیل یا رمز عبور درست نیست.';return}
    hash(u.salt,pw).then(function(h){
      if(h!==u.hash){err.textContent='ایمیل یا رمز عبور درست نیست.';return}
      db.session=em;save();$('pw').value='';location.hash='#panel';route();
    }).catch(function(x){err.textContent=x.message});
  }
});

// قیمت‌ها
function rates(){
  var p=db.price>0?db.price:24898000,u=db.usdt>0?db.usdt:259750;
  return{p:p,u:u,buy:p*(1+FEE),sell:p*(1-FEE)};
}
$('feeTxt').textContent=fa(FEE*100,1)+'٪';
$('price').value=fmt(rates().p,0);$('usdt').value=fmt(rates().u,0);
['price','usdt'].forEach(function(id){
  $(id).addEventListener('input',function(){
    var v=parse(this.value);if(v<=0)return;
    if(id==='price')db.price=v;else db.usdt=v;save();
  });
});

// آدرس سرویس قیمت در config.js تنظیم می‌شود؛ خالی یعنی ورود دستی
var PRICE_API=(window.GOLDIN_CONFIG&&window.GOLDIN_CONFIG.PRICE_API)||'';
var live=false,lastOk=0;
function stamp(t,ok){var e=$('src');e.textContent=t;e.style.color=ok?'var(--green)':'var(--muted)'}
function pull(){
  if(!PRICE_API)return;
  fetch(PRICE_API,{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){
    var g=Number(d.gold18PerGram),u=Number(d.usdtToman);
    if(!(g>0&&u>0))throw 0;
    db.price=g;db.usdt=u;live=true;lastOk=Date.now();save();feed(d);
    $('price').value=fmt(g,0);$('usdt').value=fmt(u,0);
    $('price').readOnly=$('usdt').readOnly=true;
    stamp('قیمت زنده · '+new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'}),true);
    if($('v-panel').classList.contains('on'))renderPanel();
  }).catch(function(){stamp(live?'ارتباط قطع شد؛ آخرین قیمت':'قیمت دستی',false)});
}

// پنل
var side='buy',sot=0;
function renderPanel(){
  var u=me();if(!u)return;
  $('who').textContent=db.session;
  $('bT').textContent=fa(u.bal.t);$('bU').textContent=fa(u.bal.u,2);
  $('bG').textContent=fa(u.bal.s/1000,3);
  $('bGv').textContent='≈ '+fa(Math.round(u.bal.s/1000*rates().sell))+' تومان';
  var h=$('hist');h.textContent='';
  if(!u.tx.length){var li=document.createElement('li');li.textContent='هنوز معامله‌ای ندارید.';h.appendChild(li)}
  u.tx.slice(0,8).forEach(function(t){
    var li=document.createElement('li'),l=document.createElement('span'),r=document.createElement('span');
    l.className=t.type;l.textContent=(t.type==='b'?'خرید ':'فروش ')+fa(t.s/1000,3)+' گرم';
    var sm=document.createElement('small');sm.textContent=' · '+new Date(t.ts).toLocaleDateString('fa-IR');l.appendChild(sm);
    r.textContent=fa(t.amt,t.cur==='u'?2:0)+(t.cur==='u'?' تتر':' تومان');
    li.appendChild(l);li.appendChild(r);h.appendChild(li);
  });
  sideUI();
}
function sideUI(){
  var s=side==='buy';
  Array.prototype.forEach.call($('side').children,function(b){b.classList.toggle('on',b.dataset.s===side)});
  $('side').classList.toggle('sell',!s);
  $('curL').textContent=s?'پرداخت با':'دریافت پول به';
  $('trGo').textContent=s?'خرید طلا':'فروش طلا';
  sum();
}
function priceNow(){return side==='buy'?rates().buy:rates().sell}
function totalToman(){return Math.round(sot/1000*priceNow())}
function amount(){
  var t=totalToman(),c=$('cur').value;
  return c==='u'?(side==='buy'?Math.ceil(t/rates().u*100)/100:Math.floor(t/rates().u*100)/100):t;
}
function sum(){
  var el=$('sum'),r=rates();
  if(!sot){el.textContent='وزن یا مبلغ را وارد کنید.';return}
  var c=$('cur').value,a=amount(),fee=Math.round(sot/1000*r.p*FEE);
  el.innerHTML='';
  [['قیمت هر گرم',fa(Math.round(priceNow()))+' تومان'],['وزن',fa(sot,0)+' سوت'],['کارمزد',fa(fee)+' تومان'],
   [side==='buy'?'مبلغ پرداختی':'مبلغ دریافتی',fa(a,c==='u'?2:0)+(c==='u'?' تتر':' تومان')]].forEach(function(x,i){
    var d=document.createElement('div'),k=document.createElement('span'),v=document.createElement('b');
    k.textContent=x[0];v.textContent=x[1];if(i<3){v.style.fontWeight='400'}d.appendChild(k);d.appendChild(v);el.appendChild(d);
  });
}
$('tg').addEventListener('input',function(){
  var g=parse(this.value);sot=Math.max(0,Math.round(g*1000));
  $('tt').value=sot?fmt(totalToman(),0):'';sum();
});
$('tt').addEventListener('input',function(){
  var t=parse(this.value);sot=t>0?Math.round(t/priceNow()*1000):0;
  $('tg').value=sot?fmt(sot/1000,3):'';sum();
});
$('cur').addEventListener('change',sum);
$('side').addEventListener('click',function(e){
  var s=e.target.dataset&&e.target.dataset.s;if(!s)return;side=s;$('trErr').textContent='';
  $('tt').value=sot?fmt(totalToman(),0):'';sideUI();
});
$('trGo').addEventListener('click',function(){
  var u=me(),err=$('trErr');err.textContent='';if(!u)return;
  if(sot<1){err.textContent='مقدار معامله را وارد کنید.';return}
  if(PRICE_API&&Date.now()-lastOk>120000){err.textContent='قیمت زنده قدیمی است. چند لحظه بعد دوباره تلاش کنید.';return}
  var c=$('cur').value,a=amount();
  if(side==='buy'){
    if(u.bal[c]+1e-9<a){err.textContent='موجودی کافی نیست.';return}
    u.bal[c]=Math.round((u.bal[c]-a)*100)/100;u.bal.s+=sot;
  }else{
    if(u.bal.s<sot){err.textContent='موجودی طلا کافی نیست.';return}
    u.bal.s-=sot;u.bal[c]=Math.round((u.bal[c]+a)*100)/100;
  }
  u.tx.unshift({ts:Date.now(),type:side==='buy'?'b':'s',s:sot,amt:a,cur:c});
  u.tx=u.tx.slice(0,50);save();sot=0;$('tg').value=$('tt').value='';
  toast(side==='buy'?'خرید انجام شد.':'فروش انجام شد.');renderPanel();
});
document.querySelector('[data-dep="t"]').addEventListener('click',function(){var u=me();if(u){u.bal.t+=10000000;save();renderPanel()}});
document.querySelector('[data-dep="u"]').addEventListener('click',function(){var u=me();if(u){u.bal.u+=100;save();renderPanel()}});

// نمودار و کارت‌های قیمت زنده (نمونه‌ها در مرورگر بازدیدکننده تا ۲۴ ساعت نگه داشته می‌شوند)
var series={g:[],u:[],o:[]},cur='g',rng=24;
var LBL={g:['طلای ۱۸ عیار / گرم','تومان',0],u:['تتر','تومان',0],o:['طلای جهانی / اونس','تتر',2]};
try{var hs=JSON.parse(localStorage.getItem('goldin_hist'));if(hs&&hs.g&&hs.u&&hs.o)series=hs}catch(e){}
function feed(d){
  var t=Date.now(),v={g:d.gold18PerGram,u:d.usdtToman,o:d.goldUsdtPerOunce};
  ['g','u','o'].forEach(function(k){
    if(!(v[k]>0))return;var s=series[k];
    if(!s.length||t-s[s.length-1][0]>=25000)s.push([t,v[k]]);
    series[k]=s.filter(function(p){return t-p[0]<rng*36e5}).slice(-3000);
  });
  try{localStorage.setItem('goldin_hist',JSON.stringify(series))}catch(e){}
  drawStats();drawChart();
}
function drawStats(){
  [['u','st-u','ch-u'],['g','st-g','ch-g'],['o','st-o','ch-o']].forEach(function(r){
    var s=series[r[0]];if(!s.length)return;var a=s[0][1],z=s[s.length-1][1],p=(z-a)/a*100,e=$(r[2]);
    $(r[1]).textContent=fa(z,LBL[r[0]][2]);
    e.textContent=s.length>1?(p>=0?'▲ ':'▼ ')+fa(Math.abs(p),2)+'٪':'';e.className=p>=0?'up':'dn';
  });
}
function drawChart(){
  var s=series[cur],b=$('chart'),L=LBL[cur];
  $('cnote').textContent=L[0]+' · '+L[1]+(s.length>1?' · '+fa(s.length)+' نمونه · درصد تغییر نسبت به اولین نمونه':'');
  if(s.length<2){b.innerHTML='<div class="empty">'+(PRICE_API?'نمودار در حال ساخته شدن است؛ چند لحظه صبر کن.':'برای نمودار زنده، آدرس سرویس قیمت را در config.js بگذار.')+'</div>';return}
  var W=600,H=240,pl=10,pr=10,pt=18,pb=28,t0=s[0][0],t1=s[s.length-1][0],lo=1e99,hi=-1e99;
  s.forEach(function(p){lo=Math.min(lo,p[1]);hi=Math.max(hi,p[1])});
  if(hi===lo){hi+=1;lo-=1}var pad=(hi-lo)*.1;lo-=pad;hi+=pad;
  function X(t){return pl+(t-t0)/Math.max(1,t1-t0)*(W-pl-pr)}
  function Y(v){return pt+(hi-v)/(hi-lo)*(H-pt-pb)}
  var d=s.map(function(p,i){return(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)}).join('');
  var c=s[s.length-1][1]>=s[0][1]?'#4cc38a':'#ef6b6b',g='';
  for(var i=0;i<4;i++){var y=pt+i*(H-pt-pb)/3;g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="#262d3d"/>'}
  function tm(t){var d=new Date(t),h=d.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});return rng>24?d.toLocaleDateString('fa-IR',{month:'short',day:'numeric'})+' '+h:h}
  b.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نمودار قیمت" font-family="Vazirmatn,Tahoma,sans-serif" font-size="11" fill="#9099ad"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+c+'" stop-opacity=".35"/><stop offset="1" stop-color="'+c+'" stop-opacity="0"/></linearGradient></defs>'+g+'<path d="'+d+'L'+X(t1).toFixed(1)+' '+(H-pb)+'L'+X(t0).toFixed(1)+' '+(H-pb)+'Z" fill="url(#ga)"/><path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2.2" stroke-linejoin="round"/><text x="'+pl+'" y="12">'+fa(hi,L[2])+'</text><text x="'+pl+'" y="'+(H-pb-4)+'">'+fa(lo,L[2])+'</text><text x="'+pl+'" y="'+(H-8)+'">'+tm(t0)+'</text><text x="'+(W-pr)+'" y="'+(H-8)+'" text-anchor="end">'+tm(t1)+'</text></svg>';
}
$('ctabs').addEventListener('click',function(e){
  var c=e.target.dataset&&e.target.dataset.c;if(!c)return;cur=c;
  Array.prototype.forEach.call($('ctabs').children,function(b){b.classList.toggle('on',b.dataset.c===c)});drawChart();
});
// تاریخچهٔ ذخیره‌شده در سرور (Worker + KV)؛ اگر در دسترس نبود، نمونه‌های مرورگر استفاده می‌شود
function loadHist(){
  if(!PRICE_API)return;
  fetch(PRICE_API.replace(/\/+$/,'')+'/history?hours='+rng,{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){
    var p=j&&j.points;if(!p||!p.length)throw 0;
    series={g:[],u:[],o:[]};
    p.forEach(function(x){series.g.push([x[0],x[1]]);series.u.push([x[0],x[2]]);series.o.push([x[0],x[3]])});
    drawStats();drawChart();
  }).catch(function(){});
}
$('rtabs').addEventListener('click',function(e){
  var r=Number(e.target.dataset&&e.target.dataset.r);if(!r)return;rng=r;
  Array.prototype.forEach.call($('rtabs').children,function(b){b.classList.toggle('on',Number(b.dataset.r)===r)});loadHist();
});
drawStats();drawChart();loadHist();

if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}
route();
stamp('قیمت دستی',false);pull();if(PRICE_API)setInterval(pull,30000);
})();
