const SUPABASE_URL='https://mjyuwmqnmzdhpvpnvsik.supabase.co';
const SUPABASE_KEY='sb_publishable_JeT3zymWaxbpQezfudnQWw_QLQvrLyw';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let session=null,profile=null,items=[],authMode='login';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const toast=(message,error=false)=>{const el=$('#toast');el.textContent=message;el.className=error?'show error':'show';setTimeout(()=>el.className='',3500)};
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt=d=>new Date(d+'T12:00:00').toLocaleDateString('pt-BR');

function setAuthMode(mode){authMode=mode;$$('.auth-tab').forEach(b=>b.classList.toggle('active',b.dataset.auth===mode));$('#name-row').classList.toggle('hidden',mode==='login');$('#auth-submit').textContent=mode==='login'?'Entrar com segurança':'Criar conta';$('#password').autocomplete=mode==='login'?'current-password':'new-password'}
$$('.auth-tab').forEach(b=>b.onclick=()=>setAuthMode(b.dataset.auth));

$('#auth-form').onsubmit=async e=>{e.preventDefault();const email=$('#email').value.trim().toLowerCase();const password=$('#password').value;if(!email.endsWith('@uern.br')||email.endsWith('@alu.uern.br'))return toast('Use um e-mail institucional @uern.br autorizado.',true);$('#auth-submit').disabled=true;
  try{if(authMode==='signup'){const {error}=await db.auth.signUp({email,password,options:{data:{full_name:$('#name').value.trim()}}});if(error)throw error;toast('Verifique seu e-mail para confirmar a conta.');setAuthMode('login')}else{const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error}}
  catch(err){toast(err.message==='Invalid login credentials'?'E-mail ou senha inválidos.':err.message,true)}finally{$('#auth-submit').disabled=false}
};

async function authorize(userSession){session=userSession;const email=session.user.email.toLowerCase();const {data,error}=await db.from('authorized_users').select('full_name,is_admin,active').eq('email',email).maybeSingle();if(error||!data?.active){await db.auth.signOut();session=null;throw new Error('Este e-mail não está na lista de acesso do DECB.')}profile=data;$('#user-name').textContent=data.full_name;$('#user-email').textContent=email;$('#professor').value=data.full_name;$('#auth-view').classList.add('hidden');$('#app-view').classList.remove('hidden');await loadActivities();}

db.auth.onAuthStateChange(async(_event,newSession)=>{if(newSession){try{await authorize(newSession)}catch(err){toast(err.message,true)}}else{$('#app-view').classList.add('hidden');$('#auth-view').classList.remove('hidden')}});
$('#logout').onclick=()=>db.auth.signOut();

function showPage(id){$$('.page').forEach(p=>p.classList.toggle('hidden',p.id!==id));$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===id));$('.sidebar').classList.remove('open');if(id==='register'){$('#date').value||=new Date().toISOString().slice(0,10);$('#professor').value=profile?.full_name||''}}
$$('[data-view]').forEach(b=>b.onclick=()=>showPage(b.dataset.view));$$('[data-go]').forEach(b=>b.onclick=()=>showPage(b.dataset.go));$('#menu').onclick=()=>$('.sidebar').classList.toggle('open');

async function loadActivities(){const {data,error}=await db.from('activities').select('*').order('activity_date',{ascending:false}).order('created_at',{ascending:false});if(error)return toast('Não foi possível carregar as atividades.',true);items=data||[];render()}
function card(a){const mine=a.owner_id===session?.user?.id;return `<article class="activity"><div><span class="tag">${esc(a.activity_type)}</span><h4>${esc(a.title)}</h4><p>${fmt(a.activity_date)} · ${esc(a.professor_name)}</p><div class="activity-meta">${a.participants!=null?`<span>${a.participants} participantes</span>`:''}${a.duration_hours!=null?`<span>${a.duration_hours} h</span>`:''}</div></div>${mine||profile?.is_admin?`<div class="activity-actions"><button data-delete="${a.id}" aria-label="Excluir ${esc(a.title)}">Excluir</button></div>`:''}</article>`}
function render(){const total=items.length,participants=items.reduce((s,a)=>s+(a.participants||0),0),hours=items.reduce((s,a)=>s+Number(a.duration_hours||0),0);$('#stat-total').textContent=total;$('#stat-participants').textContent=participants.toLocaleString('pt-BR');$('#stat-hours').textContent=`${hours.toLocaleString('pt-BR')} h`;$('#recent-list').innerHTML=total?items.slice(0,5).map(card).join(''):'<div class="empty">Ainda não há atividades registradas.</div>';filterList();bindDeletes()}
function filterList(){const q=$('#search').value.trim().toLowerCase(),type=$('#filter-type').value;const filtered=items.filter(a=>(!type||a.activity_type===type)&&(!q||a.title.toLowerCase().includes(q)||a.professor_name.toLowerCase().includes(q)));$('#all-list').innerHTML=filtered.length?filtered.map(card).join(''):'<div class="empty">Nenhuma atividade encontrada.</div>';bindDeletes()}
$('#search').oninput=filterList;$('#filter-type').onchange=filterList;
function bindDeletes(){$$('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir esta atividade?'))return;const {error}=await db.from('activities').delete().eq('id',b.dataset.delete);if(error)return toast('Não foi possível excluir.',true);toast('Atividade excluída.');await loadActivities()})}

$$('input[name="hasProduct"]').forEach(r=>r.onchange=()=>$('#product-fields').classList.toggle('hidden',r.value==='false'));
$('#product-type').onchange=()=>{$('#product-detail-label').textContent=$('#product-type').value==='Virtual'?'Endereço eletrônico':'Localização';$('#product-detail').type=$('#product-type').value==='Virtual'?'url':'text'};
async function upload(file,kind){if(!file)return null;if(file.size>10*1024*1024)throw new Error('Cada anexo deve ter no máximo 10 MB.');const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${session.user.id}/${crypto.randomUUID()}-${safe}`;const {error}=await db.storage.from('activity-attachments').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;return path}

$('#activity-form').onsubmit=async e=>{e.preventDefault();const btn=$('#save-activity');btn.disabled=true;btn.textContent='Salvando…';try{const has=$('input[name="hasProduct"]:checked').value==='true',pt=has?$('#product-type').value:null,detail=$('#product-detail').value.trim();const [photoPath,pdfPath]=await Promise.all([upload($('#photo').files[0],'photo'),upload($('#pdf').files[0],'pdf')]);const payload={title:$('#title').value.trim(),activity_type:$('#type').value,activity_date:$('#date').value,professor_name:profile.full_name,professor_email:session.user.email.toLowerCase(),description:$('#description').value.trim(),participants:$('#participants').value?Number($('#participants').value):null,duration_hours:$('#duration').value?Number($('#duration').value):null,has_product:has,product_type:pt,product_location:has&&pt==='Físico'?detail:null,product_url:has&&pt==='Virtual'?detail:null,photo_path:photoPath,pdf_path:pdfPath};const {error}=await db.from('activities').insert(payload);if(error)throw error;toast('Atividade registrada com sucesso.');e.target.reset();$('#date').value=new Date().toISOString().slice(0,10);$('#professor').value=profile.full_name;$('#product-fields').classList.add('hidden');await loadActivities();showPage('dashboard')}catch(err){toast(err.message||'Não foi possível salvar.',true)}finally{btn.disabled=false;btn.textContent='Salvar atividade'}};

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
