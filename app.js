const MAX_PHOTOS=3;
const photos=[];
const passportColors=[['白底','#ffffff'],['蓝底','#cfe4ff'],['粉底','#ffdbe2'],['薄荷绿','#d8f7e9']];
let lastAnalysis=null;

const $=s=>document.querySelector(s);
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2000)};

function renderPhotos(){
  const grid=$('#photoGrid');
  grid.innerHTML=photos.map((p,i)=>`<div class="photo-card"><img src="${p.url}" alt="宠物照片 ${i+1}"><button data-remove="${i}" aria-label="删除">×</button></div>`).join('');
  $('#uploadBox').style.display=photos.length>=MAX_PHOTOS?'none':'flex';
}

$('#photoInput').addEventListener('change',e=>{
  [...e.target.files].slice(0,MAX_PHOTOS-photos.length).forEach(file=>{
    if(!file.type.startsWith('image/'))return;
    photos.push({file,url:URL.createObjectURL(file)});
  });
  e.target.value=''; renderPhotos();
});

$('#photoGrid').addEventListener('click',e=>{
  const b=e.target.closest('[data-remove]'); if(!b)return;
  const i=Number(b.dataset.remove); URL.revokeObjectURL(photos[i].url); photos.splice(i,1); renderPhotos();
});

function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}

function updateAIStatus(ev){
  const label=$('#aiStatus'), text=$('#aiProgressText'), bar=$('#aiProgressBar');
  if(ev.phase==='download'){
    label.textContent='正在下载本地 AI 模型…';
    if(ev.total){
      const pct=Math.min(100,ev.got/ev.total*100);
      bar.style.width=pct.toFixed(1)+'%';
      text.textContent=`${(ev.got/1e6).toFixed(1)} / ${(ev.total/1e6).toFixed(1)} MB`;
    }else{
      bar.style.width='35%'; text.textContent=`${(ev.got/1e6).toFixed(1)} MB`;
    }
  }else if(ev.phase==='starting'){
    label.textContent='正在启动 AI 模型…'; bar.style.width='8%'; text.textContent='首次加载';
  }else if(ev.phase==='ready'){
    label.textContent='AI 模型已就绪'; bar.style.width='100%'; text.textContent='本地运行';
  }else if(ev.phase==='analyzing'){
    label.textContent=`正在分析第 ${ev.index+1} / ${ev.total} 张照片…`;
    text.textContent='照片不会上传';
  }
}

function renderAnalysis(data){
  const cards=$('#breedGrid').querySelectorAll('.breed-card');
  cards.forEach(card=>card.classList.add('ghost'));
  data.breeds.slice(0,3).forEach((breed,i)=>{
    if(!cards[i])return;
    cards[i].classList.remove('ghost');
    cards[i].querySelector('b').textContent=breed.name;
    cards[i].querySelector('.bar i').style.width=Math.max(2,breed.similarity*100).toFixed(1)+'%';
    cards[i].querySelector('span').textContent=`TOP ${i+1} · ${(breed.similarity*100).toFixed(1)}%`;
  });
  $('#resultStatus').textContent=data.mixAssessment;
  const warn=data.oodCount? `有 ${data.oodCount} 张照片触发低置信度提示，综合结果需谨慎参考。` : '输入照片通过模型的基础宠物/已知分布检查。';
  $('#analysisNotice').innerHTML=`<b>真实本地 AI 分析完成</b><p>${warn}<br>${data.disclaimer}</p>`;
}

function renderVisualProfile(data){
  const c=data.consistency;
  $('#consistencyScore').textContent=c.score==null?'单图':`${c.score}%`;
  $('#consistencyLabel').textContent=c.label;
  $('#textureScore').textContent=`${data.traits.textureScore || 0}/100`;
  $('#textureLabel').textContent=data.traits.textureLabel || '无法估算';

  $('#coatPalette').innerHTML=(data.palette||[]).map(p=>`
    <div class="palette-item">
      <i style="background:${p.hex}"></i>
      <div><b>${p.name}</b><span>${p.hex.toUpperCase()} · ${Math.round(p.share*100)}%</span></div>
    </div>`).join('') || '<span class="hint">当前照片无法提取稳定色板</span>';

  $('#traitPills').innerHTML=[
    ['被毛主色',data.traits.coatColor],
    ['物种',data.traits.species],
    ['外观分布',data.mixAssessment],
    ['纹理',data.traits.textureLabel]
  ].map(x=>`<span>${x[0]}：${x[1]}</span>`).join('');

  $('#photoAnalysisList').innerHTML=(data.perPhoto||[]).map((p,i)=>`
    <div class="photo-analysis-row">
      <b>照片 ${i+1}</b>
      <span>${p.topBreed?.name||'—'} · ${p.topBreed?Math.round(p.topBreed.similarity*100):0}%</span>
      <span>宠物区域 ${Math.round(p.petArea*100)}%</span>
      <em class="${p.ood?'warn-dot':'ok-dot'}">${p.ood?'低置信度':'有效'}</em>
    </div>`).join('');
}

function supplementValues(){
  return {
    coatLength:$('#coatLength').value||'未填写',
    eyeColor:$('#eyeColor').value||'未填写',
    earShape:$('#earShape').value||'未填写',
    faceShape:$('#faceShape').value||'未填写'
  };
}

function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){
  const chars=String(text).split('');
  let line='',lineNo=0;
  for(const ch of chars){
    const test=line+ch;
    if(ctx.measureText(test).width>maxWidth && line){
      ctx.fillText(line,x,y+lineNo*lineHeight);
      line=ch; lineNo++;
      if(lineNo>=maxLines-1) break;
    }else line=test;
  }
  if(lineNo<maxLines) ctx.fillText(line,x,y+lineNo*lineHeight);
}

function drawIdCard(img,data){
  const c=$('#idCanvas'),x=c.getContext('2d');
  const name=$('#petName').value.trim()||'毛孩子';
  const age=$('#petAge').value.trim()||'未填写';
  const weight=$('#petWeight').value?`${$('#petWeight').value} kg`:'未填写';
  const breed=data?.breeds?.[0];
  x.clearRect(0,0,c.width,c.height);
  const g=x.createLinearGradient(0,0,900,1200);g.addColorStop(0,'#141922');g.addColorStop(.58,'#1d2430');g.addColorStop(1,'#0d1117');
  x.fillStyle=g;x.fillRect(0,0,900,1200);
  x.fillStyle='#6cddb1';x.font='900 50px sans-serif';x.fillText('PawID',64,82);
  x.fillStyle='#fff';x.font='800 24px sans-serif';x.fillText('毛球身份卡 · PET IDENTITY CARD',66,120);
  x.fillStyle='#f2c84b';x.font='900 72px sans-serif';x.fillText(name,64,250);
  x.save();x.beginPath();x.roundRect(64,320,772,500,44);x.clip();
  const side=Math.min(img.naturalWidth,img.naturalHeight),sx=(img.naturalWidth-side)/2,sy=(img.naturalHeight-side)/2;
  x.drawImage(img,sx,sy,side,side,64,320,772,500);x.restore();
  x.fillStyle='#fff';x.font='700 23px sans-serif';
  x.fillText(`物种  ${data?.traits?.species||$('#species').value}`,70,886);
  x.fillText(`年龄  ${age}`,70,928);
  x.fillText(`体重  ${weight}`,70,970);
  x.fillText(`外观最相似  ${breed?breed.name:'待分析'}`,70,1012);
  x.fillStyle='#8fe8c3';x.font='700 18px sans-serif';
  x.fillText(breed?`相似度 ${(breed.similarity*100).toFixed(1)}% · ${data.mixAssessment}`:'',70,1052);
  x.fillText(`被毛 ${data.traits.coatColor} · ${data.traits.textureLabel}`,70,1086);
  x.fillStyle='#9aa8a1';x.font='500 16px sans-serif';
  x.fillText('仅做照片外观相似度分析，不代表纯种 / 混血 / 血统证明',70,1140);
  x.fillText('喵造实验室 008 · PawID v0.4',70,1172);
}

async function drawReport(data){
  const c=$('#reportCanvas'),x=c.getContext('2d'),name=$('#petName').value.trim()||'毛孩子';
  const sup=supplementValues(), top=data.breeds||[], palette=data.palette||[];
  x.clearRect(0,0,900,1200);
  x.fillStyle='#f7f1e6';x.fillRect(0,0,900,1200);
  x.fillStyle='#171b22';x.fillRect(0,0,900,205);
  x.fillStyle='#6cddb1';x.font='900 48px sans-serif';x.fillText('PawID',58,72);
  x.fillStyle='#fff';x.font='900 32px sans-serif';x.fillText('毛球身份鉴定报告',58,119);
  x.fillStyle='#a9b4ae';x.font='500 17px sans-serif';x.fillText('PET IDENTITY REPORT · v0.4',58,155);
  x.fillStyle='#f2c84b';x.font='900 54px sans-serif';x.fillText(name,620,112);

  const portrait=await PawIDAI.makePassport(photos[0].file,data.primary,'#d8f7e9',1024);
  x.save();x.beginPath();x.roundRect(58,245,315,315,30);x.clip();x.drawImage(portrait,58,245,315,315);x.restore();

  x.fillStyle='#171b22';x.font='900 22px sans-serif';x.fillText('AI 外观档案',414,270);
  x.font='700 18px sans-serif';x.fillStyle='#3c4541';
  x.fillText(`物种：${data.traits.species}`,414,316);
  x.fillText(`被毛：${data.traits.coatColor}`,414,352);
  x.fillText(`纹理：${data.traits.textureLabel}`,414,388);
  x.fillText(`外观：${data.mixAssessment}`,414,424);
  x.fillText(`多图一致性：${data.consistency.score==null?'单图':data.consistency.score+'%'}`,414,460);

  x.fillStyle='#6a756f';x.font='600 16px sans-serif';
  x.fillText('主人补充',414,510);
  x.fillText(`毛长 ${sup.coatLength}  ·  眼睛 ${sup.eyeColor}`,414,538);
  x.fillText(`耳型 ${sup.earShape}  ·  脸型 ${sup.faceShape}`,414,566);

  x.fillStyle='#171b22';x.font='900 24px sans-serif';x.fillText('TOP 3 品种外观相似度',58,630);
  top.slice(0,3).forEach((b,i)=>{
    const y=676+i*75, pct=Math.round(b.similarity*100);
    x.fillStyle='#26302c';x.font='800 18px sans-serif';x.fillText(`${i+1}. ${b.name}`,58,y);
    x.fillStyle='#dedfd8';x.beginPath();x.roundRect(335,y-18,430,16,8);x.fill();
    x.fillStyle=i===0?'#55cf9d':i===1?'#f2c84b':'#f29a91';x.beginPath();x.roundRect(335,y-18,Math.max(10,430*b.similarity),16,8);x.fill();
    x.fillStyle='#26302c';x.font='900 17px sans-serif';x.fillText(`${pct}%`,790,y);
  });

  x.fillStyle='#171b22';x.font='900 24px sans-serif';x.fillText('被毛视觉色板',58,912);
  palette.slice(0,3).forEach((p,i)=>{
    const px=58+i*250;
    x.fillStyle=p.hex;x.beginPath();x.arc(px+28,968,28,0,Math.PI*2);x.fill();
    x.strokeStyle='#d4d0c7';x.lineWidth=2;x.stroke();
    x.fillStyle='#26302c';x.font='800 16px sans-serif';x.fillText(p.name,px+66,962);
    x.fillStyle='#7d817c';x.font='500 14px sans-serif';x.fillText(`${p.hex.toUpperCase()} · ${Math.round(p.share*100)}%`,px+66,987);
  });

  x.fillStyle='#fff';x.beginPath();x.roundRect(58,1040,784,95,24);x.fill();
  x.fillStyle='#454d49';x.font='600 15px sans-serif';
  wrapText(x,data.disclaimer,82,1074,730,23,3);
  x.fillStyle='#5da988';x.font='800 14px sans-serif';x.fillText('喵造实验室 008 · 照片本地分析 · 不上传 PawID 服务器',82,1122);
  x.fillStyle='#a89c88';x.font='500 13px sans-serif';x.fillText('生成时间 '+new Date().toLocaleDateString('zh-CN'),58,1172);
}


const personalityKeys=['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10'];

function personalityProfile(){
  const v=id=>Number($('#'+id)?.value||3);
  const dims=[
    {key:'affection',label:'亲人度',value:(v('q1')+v('q2'))/2},
    {key:'energy',label:'活力',value:(v('q3')+v('q4'))/2},
    {key:'curiosity',label:'好奇心',value:(v('q5')+v('q6'))/2},
    {key:'food',label:'吃货指数',value:(v('q7')+v('q8'))/2},
    {key:'boldness',label:'胆量',value:(v('q9')+v('q10'))/2}
  ].map(d=>({...d,score:Math.round(d.value*20)}));

  const by=Object.fromEntries(dims.map(d=>[d.key,d.score]));
  let title='五边形小明星',desc='性格比较均衡，今天是哪一面占上风，要看主子的心情。';
  if(by.food>=88){title='罐头鉴赏家';desc='对食物的热情相当稳定，开罐声可能就是它的专属召唤铃。'}
  else if(by.energy>=88){title='夜间跑酷选手';desc='活力值拉满，家里的直线通道大概率都是它的私人赛道。'}
  else if(by.affection>=88){title='黏人小尾巴';desc='很享受陪伴和贴贴，是那种会默默把自己塞到你旁边的类型。'}
  else if(by.boldness>=86 && by.affection>=70){title='社牛小队长';desc='对人和新环境都比较放松，社交半径通常比主人想象得更大。'}
  else if(by.curiosity>=86){title='好奇探险家';desc='纸箱、袋子、新家具、陌生角落，都可能成为它今天的研究课题。'}
  else if(by.boldness<=44 && by.affection<=56){title='高冷观察家';desc='先观察、再决定要不要参与。不是不理你，只是审核流程比较严格。'}
  else if(by.boldness<=44){title='谨慎小侦探';desc='对陌生变化比较敏感，但熟悉之后通常会慢慢建立自己的安全节奏。'}
  else if(by.affection>=76 && by.energy<=55){title='温柔陪伴家';desc='比起满屋跑酷，更喜欢稳定陪在熟悉的人身边。'}

  return {dims,title,desc};
}

function drawRadar(canvas,profile,opts={}){
  const x=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  x.clearRect(0,0,w,h);
  if(opts.background){x.fillStyle=opts.background;x.fillRect(0,0,w,h)}
  const cx=w/2,cy=h/2+8,r=Math.min(w,h)*0.31,n=profile.dims.length;
  const pts=(scale=1)=>profile.dims.map((d,i)=>{
    const a=-Math.PI/2+i*Math.PI*2/n;
    return [cx+Math.cos(a)*r*scale,cy+Math.sin(a)*r*scale,a];
  });
  x.lineJoin='round';
  for(let level=1;level<=5;level++){
    const p=pts(level/5);
    x.beginPath();p.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();
    x.strokeStyle=opts.grid||'#d9ddd9';x.lineWidth=1.5;x.stroke();
  }
  pts(1).forEach(q=>{x.beginPath();x.moveTo(cx,cy);x.lineTo(q[0],q[1]);x.strokeStyle=opts.grid||'#d9ddd9';x.stroke()});
  const data=profile.dims.map((d,i)=>{
    const a=-Math.PI/2+i*Math.PI*2/n,scale=d.score/100;
    return [cx+Math.cos(a)*r*scale,cy+Math.sin(a)*r*scale];
  });
  x.beginPath();data.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();
  x.fillStyle=opts.fill||'rgba(85,207,157,.24)';x.fill();
  x.strokeStyle=opts.stroke||'#55cf9d';x.lineWidth=4;x.stroke();
  data.forEach(q=>{x.beginPath();x.arc(q[0],q[1],6,0,Math.PI*2);x.fillStyle=opts.stroke||'#55cf9d';x.fill()});
  const labels=pts(1.18);
  x.textAlign='center';x.textBaseline='middle';x.font=opts.font||'700 18px sans-serif';x.fillStyle=opts.text||'#26302c';
  labels.forEach((q,i)=>x.fillText(profile.dims[i].label,q[0],q[1]));
  x.textAlign='left';x.textBaseline='alphabetic';
}

function renderPersonality(){
  const p=personalityProfile();
  drawRadar($('#radarCanvas'),p,{background:'#fffdf9'});
  $('#personalityTitle').textContent=p.title;
  $('#personalityDesc').textContent=p.desc;
  $('#personalityScores').innerHTML=p.dims.map(d=>`<span><b>${d.label}</b><em>${d.score}</em></span>`).join('');
  return p;
}

function simpleHash(text){
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(36).toUpperCase().padStart(7,'0').slice(0,7);
}

function pawPassportNumber(data){
  const name=$('#petName').value.trim()||'PET';
  const seed=[name,data?.breeds?.[0]?.name||'',data?.traits?.coatColor||'',$('#petAge').value,$('#petWeight').value].join('|');
  return 'PAW-'+simpleHash(seed);
}

async function drawPetPassport(data){
  const c=$('#petPassportCanvas'),x=c.getContext('2d'),name=$('#petName').value.trim()||'毛孩子';
  const sup=supplementValues(),p=personalityProfile(),no=pawPassportNumber(data);
  const portrait=await PawIDAI.makePassport(photos[0].file,data.primary,'#f3ead8',1024);
  x.clearRect(0,0,900,1200);
  const g=x.createLinearGradient(0,0,900,1200);g.addColorStop(0,'#173d36');g.addColorStop(1,'#0c2925');
  x.fillStyle=g;x.fillRect(0,0,900,1200);
  x.strokeStyle='#d7ba69';x.lineWidth=3;x.strokeRect(34,34,832,1132);
  x.strokeStyle='#d7ba6977';x.lineWidth=1;x.strokeRect(48,48,804,1104);
  x.textAlign='center';
  x.fillStyle='#d7ba69';x.font='900 22px sans-serif';x.fillText('PAWID PET PASSPORT',450,92);
  x.fillStyle='#fff7de';x.font='900 44px sans-serif';x.fillText('毛 球 护 照',450,146);
  x.fillStyle='#8ecdb3';x.font='600 15px sans-serif';x.fillText('MEOWBUILD LAB · NON-OFFICIAL KEEPSAKE',450,178);
  x.textAlign='left';

  x.save();x.beginPath();x.roundRect(74,232,350,350,26);x.clip();x.drawImage(portrait,74,232,350,350);x.restore();
  x.strokeStyle='#d7ba69';x.lineWidth=2;x.strokeRect(74,232,350,350);

  x.fillStyle='#d7ba69';x.font='700 14px sans-serif';x.fillText('NAME / 姓名',468,250);
  x.fillStyle='#fff';x.font='900 42px sans-serif';x.fillText(name,468,292);
  x.fillStyle='#d7ba69';x.font='700 14px sans-serif';x.fillText('PAWID NO.',468,344);
  x.fillStyle='#fff7de';x.font='800 24px monospace';x.fillText(no,468,377);
  x.fillStyle='#d7ba69';x.font='700 14px sans-serif';x.fillText('SPECIES / 物种',468,426);
  x.fillStyle='#fff';x.font='800 22px sans-serif';x.fillText(data.traits.species,468,456);
  x.fillStyle='#d7ba69';x.font='700 14px sans-serif';x.fillText('APPEARANCE MATCH / 外观最相似',468,500);
  x.fillStyle='#fff';x.font='800 21px sans-serif';x.fillText(data.breeds[0]?.name||'—',468,530);
  x.fillStyle='#9dd8c1';x.font='700 16px sans-serif';x.fillText(`${Math.round((data.breeds[0]?.similarity||0)*100)}% 外观相似度`,468,558);

  x.fillStyle='#fff7de';x.font='900 22px sans-serif';x.fillText('IDENTITY PROFILE',74,652);
  const rows=[
    ['年龄', $('#petAge').value.trim()||'未填写'],
    ['体重', $('#petWeight').value?`${$('#petWeight').value} kg`:'未填写'],
    ['被毛', data.traits.coatColor],
    ['毛长', sup.coatLength],
    ['眼睛', sup.eyeColor],
    ['耳型', sup.earShape],
    ['脸型', sup.faceShape],
    ['性格称号', p.title]
  ];
  rows.forEach((r,i)=>{
    const col=i<4?0:1,row=i%4,px=74+col*390,py=704+row*74;
    x.fillStyle='#8fb6a8';x.font='600 14px sans-serif';x.fillText(r[0],px,py);
    x.fillStyle='#fff';x.font='800 19px sans-serif';x.fillText(r[1],px,py+27);
  });

  x.save();x.translate(694,930);x.rotate(-0.16);
  x.strokeStyle='#d7ba69';x.lineWidth=5;x.beginPath();x.arc(0,0,82,0,Math.PI*2);x.stroke();
  x.beginPath();x.arc(0,0,62,0,Math.PI*2);x.stroke();
  x.fillStyle='#d7ba69';x.font='900 18px sans-serif';x.textAlign='center';x.fillText('PAWID',0,-8);x.font='800 13px sans-serif';x.fillText('VERIFIED',0,17);x.fillText('🐾',0,46);x.restore();
  x.textAlign='left';

  x.fillStyle='#f4e5b2';x.font='700 15px sans-serif';
  wrapText(x,'这是一张由 PawID 根据本地 AI 外观分析与主人填写信息生成的纪念分享卡，不是官方旅行、检疫或血统证件。',74,1045,720,23,3);
  x.fillStyle='#8ecdb3';x.font='700 13px sans-serif';x.fillText('照片本地处理 · PawID v0.4 · 喵造实验室 008',74,1133);
}

async function drawPersonalityCard(data){
  const c=$('#personalityCardCanvas'),x=c.getContext('2d'),p=personalityProfile(),name=$('#petName').value.trim()||'毛孩子';
  const portrait=await PawIDAI.makePassport(photos[0].file,data.primary,'#d8f7e9',1024);
  x.clearRect(0,0,900,1200);
  x.fillStyle='#f7f1e6';x.fillRect(0,0,900,1200);
  x.fillStyle='#171b22';x.fillRect(0,0,900,250);
  x.fillStyle='#6cddb1';x.font='900 44px sans-serif';x.fillText('PawID',58,70);
  x.fillStyle='#fff';x.font='900 34px sans-serif';x.fillText('毛球性格卡',58,118);
  x.fillStyle='#a7b2ad';x.font='600 15px sans-serif';x.fillText('OWNER-OBSERVED PERSONALITY · v0.4',58,154);
  x.fillStyle='#f2c84b';x.font='900 49px sans-serif';x.fillText(p.title,58,215);

  x.save();x.beginPath();x.arc(745,126,85,0,Math.PI*2);x.clip();x.drawImage(portrait,660,41,170,170);x.restore();

  const tmp=document.createElement('canvas');tmp.width=650;tmp.height=500;
  drawRadar(tmp,p,{background:'#f7f1e6',grid:'#d7d8d2',stroke:'#55cf9d',fill:'rgba(85,207,157,.20)',text:'#26302c',font:'700 17px sans-serif'});
  x.drawImage(tmp,125,285,650,500);

  x.fillStyle='#171b22';x.font='900 24px sans-serif';x.fillText(name+' 的五维画像',58,820);
  p.dims.forEach((d,i)=>{
    const y=870+i*44;
    x.fillStyle='#3a443f';x.font='700 16px sans-serif';x.fillText(d.label,58,y);
    x.fillStyle='#e1e1da';x.beginPath();x.roundRect(180,y-15,560,14,7);x.fill();
    x.fillStyle=['#55cf9d','#789bff','#f2c84b','#f29a91','#7d6ccf'][i];x.beginPath();x.roundRect(180,y-15,Math.max(8,560*d.score/100),14,7);x.fill();
    x.fillStyle='#28302c';x.font='900 16px sans-serif';x.fillText(String(d.score),768,y);
  });

  x.fillStyle='#fff';x.beginPath();x.roundRect(58,1090,784,70,22);x.fill();
  x.fillStyle='#59615d';x.font='600 15px sans-serif';wrapText(x,p.desc,82,1120,730,22,2);
  x.fillStyle='#9a927f';x.font='500 12px sans-serif';x.fillText('性格结果来自主人观察问卷，不是医学、行为学诊断，也不是 AI 看脸推断。',58,1187);
}

async function buildPassports(data){
  const grid=$('#passportGrid');grid.innerHTML='';
  for(const [label,bg] of passportColors){
    const c=await PawIDAI.makePassport(photos[0].file,data.primary,bg,1024);
    const wrap=document.createElement('div');wrap.className='passport';wrap.append(c);
    const s=document.createElement('span');s.textContent=label;wrap.append(s);
    wrap.onclick=()=>{const a=document.createElement('a');a.download=`PawID-${$('#petName').value.trim()||'pet'}-${label}.png`;a.href=c.toDataURL('image/png');a.click()};
    grid.append(wrap);
  }
}

async function refreshShareAssets(){
  if(!lastAnalysis || !photos.length)return;
  const img=await loadImg(photos[0].url);
  drawIdCard(img,lastAnalysis);
  await drawReport(lastAnalysis);
  renderPersonality();
  await drawPetPassport(lastAnalysis);
  await drawPersonalityCard(lastAnalysis);
}

['coatLength','eyeColor','earShape','faceShape','petName','petAge','petWeight'].forEach(id=>{
  $('#'+id)?.addEventListener('change',()=>refreshShareAssets());
});

personalityKeys.forEach(id=>{
  const el=$('#'+id),out=$('#'+id+'v');
  const saved=localStorage.getItem('pawid-personality-'+id);
  if(saved) el.value=saved;
  out.textContent=el.value;
  el.addEventListener('input',()=>{
    out.textContent=el.value;
    localStorage.setItem('pawid-personality-'+id,el.value);
    renderPersonality();
    refreshShareAssets();
  });
});
renderPersonality();

$('#analyzeBtn').addEventListener('click',async()=>{
  if(!photos.length){toast('先上传一张毛孩子照片喵');return}
  const btn=$('#analyzeBtn'); btn.disabled=true; btn.textContent='AI 正在分析…';
  try{
    const data=await PawIDAI.analyze(photos.map(p=>p.file),{species:$('#species').value,name:$('#petName').value.trim()},updateAIStatus);
    lastAnalysis=data;
    ['resultPanel','visualPanel','supplementPanel','personalityPanel','petPassportPanel','personalityCardPanel','reportPanel','idPanel','passportPanel'].forEach(id=>$('#'+id).hidden=false);
    renderAnalysis(data); renderVisualProfile(data);
    const img=await loadImg(photos[0].url);
    drawIdCard(img,data);
    renderPersonality();
    await drawPetPassport(data);
    await drawPersonalityCard(data);
    await drawReport(data);
    await buildPassports(data);
    $('#resultPanel').scrollIntoView({behavior:'smooth',block:'start'});
    toast('PawID v0.4 身份报告生成完成 😼');
  }catch(err){
    console.error(err);
    $('#aiStatus').textContent='AI 模型加载失败';
    $('#aiProgressText').textContent='请检查网络后重试';
    toast('AI 分析失败：'+err.message);
  }finally{
    btn.disabled=false; btn.innerHTML='重新进行本地 AI 身份分析 <span>→</span>';
  }
});

$('#downloadPassportBtn').addEventListener('click',async()=>{
  await refreshShareAssets();
  const a=document.createElement('a');a.download=`PawID-${$('#petName').value.trim()||'pet'}-毛球护照.png`;a.href=$('#petPassportCanvas').toDataURL('image/png');a.click();
});

$('#downloadPersonalityBtn').addEventListener('click',async()=>{
  await refreshShareAssets();
  const a=document.createElement('a');a.download=`PawID-${$('#petName').value.trim()||'pet'}-性格卡.png`;a.href=$('#personalityCardCanvas').toDataURL('image/png');a.click();
});

$('#downloadIdBtn').addEventListener('click',async()=>{
  await refreshShareAssets();
  const a=document.createElement('a');a.download=`PawID-${$('#petName').value.trim()||'pet'}-身份卡.png`;a.href=$('#idCanvas').toDataURL('image/png');a.click();
});

$('#downloadReportBtn').addEventListener('click',async()=>{
  await refreshShareAssets();
  const a=document.createElement('a');a.download=`PawID-${$('#petName').value.trim()||'pet'}-身份鉴定报告.png`;a.href=$('#reportCanvas').toDataURL('image/png');a.click();
});

if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
