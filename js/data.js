// ── ALPHA VISIT TRACKING ─────────────────────────────────────
// Reads UTM params + ?ref from the URL, persists them to localStorage,
// and inserts one row into alpha_visits. Deduplicates: only fires once
// per browser session (sessionStorage gate) so refreshes don't flood the table.
async function trackAlphaVisit(){
  if(!sb) return;
  if(sessionStorage.getItem('juke_tracked')) return;
  sessionStorage.setItem('juke_tracked','1');

  const p = new URLSearchParams(location.search);
  const utm = {
    utm_source:   p.get('utm_source')   || null,
    utm_medium:   p.get('utm_medium')   || null,
    utm_campaign: p.get('utm_campaign') || null,
    utm_content:  p.get('utm_content')  || null,
    ref:          p.get('ref')          || null,
  };

  // Persist UTM to localStorage so it survives navigation within the app
  if(Object.values(utm).some(Boolean)){
    localStorage.setItem('juke_utm', JSON.stringify(utm));
  } else {
    // Fall back to a previously captured UTM if no params on this URL
    try{ Object.assign(utm, JSON.parse(localStorage.getItem('juke_utm')||'{}')); }catch(e){}
  }

  // Nothing worth tracking — organic direct visit with no UTM context
  if(!Object.values(utm).some(Boolean)) return;

  await sb.from('alpha_visits').insert({
    ...utm,
    landing_url: location.href,
    user_agent:  navigator.userAgent,
    user_id:     (await sb.auth.getUser())?.data?.user?.id || null,
  });
}

// ── LOCAL STORAGE HELPERS ────────────────────────────────────
// In preview mode the iframe uses sessionStorage (per-tab, starts blank) so it
// never reads the admin's cached localStorage data for another athlete.
function _ls(){ return window.PREVIEW_USER_ID ? sessionStorage : localStorage; }
function lsGet(k){try{return JSON.parse(_ls().getItem(k))||{}}catch(e){return{}}}
function lsSet(k,v){try{_ls().setItem(k,JSON.stringify(v))}catch(e){}}

// ── PERSISTED APP STATE ──────────────────────────────────────
let statusData   = lsGet('juke_status');
let adminNotes   = lsGet('juke_notes');
let adminForms   = lsGet('juke_forms');
let costOverrides= lsGet('juke_cost');
let offersData   = lsGet('juke_offers');

// ── FINDER STATE ─────────────────────────────────────────────
let fitScores    = {};
let filtered     = [];
let sortCol      = '_fit';
let sortAsc      = false;
let view         = 'table';
let compareSet   = new Set();
let adminUnlocked= false;
const ADMIN_PW   = 'juke2027';

// ── PIPELINE DRAG STATE ──────────────────────────────────────
let _pd={card:null,clone:null,ox:0,oy:0,over:null,moved:false};
let playerData=lsGet('juke_player');

// ── BOARD DATA LAYER ─────────────────────────────────────────
// In-memory cache: { schoolName: { ppId, stage, attrs, lastContactDate, nextAction, nextActionDate } }
let _boardCache={};

// Resolve or create the player_programs row for a given school name.
// Returns the row id (ppId) or null if not logged in / program not found.
async function _resolvePPId(schoolName){
  if(!sb||!currentUser) return null;
  if(window.PREVIEW_USER_ID) return _boardCache[schoolName]?.ppId || null;
  if(_boardCache[schoolName]?.ppId) return _boardCache[schoolName].ppId;
  // Look up program id
  const {data:prog}=await sb.from('programs').select('id').eq('school',schoolName).maybeSingle();
  if(!prog) return null;
  // Upsert player_programs row
  const stage=statusData[schoolName]||'saved';
  const {data:pp}=await sb.from('player_programs')
    .upsert({user_id:currentUser.id,program_id:prog.id,stage},{onConflict:'user_id,program_id'})
    .select('id').single();
  if(!pp) return null;
  _boardCache[schoolName]=Object.assign(_boardCache[schoolName]||{},{ppId:pp.id});
  return pp.id;
}

// Load the full player_programs row for a school (attrs, contact fields, etc.)
async function loadBoardRecord(schoolName){
  if(!sb||!currentUser) return null;
  const ppId=await _resolvePPId(schoolName);
  if(!ppId) return null;
  const {data}=await sb.from('player_programs').select('*').eq('id',ppId).single();
  if(data) _boardCache[schoolName]=Object.assign(_boardCache[schoolName]||{},data,{ppId:data.id});
  return data;
}

// Persist card attribute toggles for a school to Supabase + localStorage.
async function saveBoardAttrs(schoolName,attrs){
  if(window.PREVIEW_USER_ID) return;
  // Merge into localStorage cache immediately (optimistic)
  const cur=lsGet('juke_card_attrs');
  cur[schoolName]=Object.assign(cur[schoolName]||{},attrs);
  lsSet('juke_card_attrs',cur);
  // Persist to Supabase
  const ppId=await _resolvePPId(schoolName);
  if(!ppId) return;
  await sb.from('player_programs').update({
    is_dream_school: cur[schoolName].is_dream_school||false,
    is_top_choice:   cur[schoolName].is_top_choice||false,
    is_in_state:     cur[schoolName].is_in_state||false,
    scholarship_opp: cur[schoolName].scholarship_opp||false,
    academic_match:  cur[schoolName].academic_match||false,
    is_christian:    cur[schoolName].is_christian||false,
    updated_at: new Date().toISOString()
  }).eq('id',ppId);
}

// Update stage in Supabase after a drag-drop move.
async function saveBoardStage(schoolName,stage){
  if(window.PREVIEW_USER_ID) return;
  statusData[schoolName]=stage;
  lsSet('juke_status',statusData);
  const ppId=await _resolvePPId(schoolName);
  if(!ppId) return;
  await sb.from('player_programs').update({stage,updated_at:new Date().toISOString()}).eq('id',ppId);
}

// Update next action / last contact date fields.
async function saveBoardContact(schoolName,{lastContactDate,nextAction,nextActionDate}){
  if(window.PREVIEW_USER_ID) return;
  const ppId=await _resolvePPId(schoolName);
  if(!ppId) return;
  const patch={updated_at:new Date().toISOString()};
  if(lastContactDate!==undefined) patch.last_contact_date=lastContactDate;
  if(nextAction!==undefined)      patch.next_action=nextAction;
  if(nextActionDate!==undefined)  patch.next_action_date=nextActionDate;
  await sb.from('player_programs').update(patch).eq('id',ppId);
  _boardCache[schoolName]=Object.assign(_boardCache[schoolName]||{},patch);
}

// ── Generic section loaders ───────────────────────────────────
async function loadBoardSection(schoolName, table){
  const ppId=await _resolvePPId(schoolName);
  if(!ppId) return [];
  const {data}=await sb.from(table).select('*').eq('player_program_id',ppId).order('created_at',{ascending:false});
  return data||[];
}

async function addBoardItem(schoolName, table, payload){
  if(window.PREVIEW_USER_ID) return null;
  const ppId=await _resolvePPId(schoolName);
  if(!ppId) return null;
  const {data}=await sb.from(table).insert({player_program_id:ppId,...payload}).select().single();
  return data;
}

async function updateBoardItem(table, id, patch){
  if(window.PREVIEW_USER_ID) return null;
  const {data}=await sb.from(table).update({...patch,updated_at:new Date().toISOString()}).eq('id',id).select().single();
  return data;
}

async function deleteBoardItem(table, id){
  if(window.PREVIEW_USER_ID) return;
  await sb.from(table).delete().eq('id',id);
}

// ── Conversation ↔ Program linking ───────────────────────────
// Sets player_program_id on a conversation row so threads have school context.
async function linkConversationToProgram(convId, ppId){
  if(window.PREVIEW_USER_ID) return;
  if(!sb||!convId||!ppId) return;
  await sb.from('conversations').update({player_program_id:ppId}).eq('id',convId);
}

// Returns the conversation row for a given player_program_id, or null.
// Used by messaging to check if a school thread already exists before creating a new one.
async function getConversationByProgram(ppId){
  if(!sb||!ppId) return null;
  const {data}=await sb.from('conversations')
    .select('id,participant_a,participant_b,last_message_at,last_message_preview,player_program_id')
    .eq('player_program_id',ppId)
    .maybeSingle();
  return data||null;
}

// ── Bulk load board records for the board render ──────────────
// Returns {schoolName: {ppId, stage, last_contact_date, next_action, next_action_date,
//                       is_dream_school, is_top_choice, is_in_state, scholarship_opp,
//                       academic_match, is_christian}}
// ── RECOMMENDATION REQUESTS ──────────────────────────────
// Writes to `recommendation_requests` table so HS/club coaches can see pending requests.
// Table schema (run once in Supabase SQL editor):
//   create table recommendation_requests (
//     id bigint generated always as identity primary key,
//     athlete_user_id uuid references auth.users not null,
//     athlete_name text, coach_name text not null,
//     coach_school text, coach_title text, note text,
//     status text default 'pending',
//     requested_at timestamptz default now()
//   );
//   alter table recommendation_requests enable row level security;
//   create policy "Athletes manage own requests" on recommendation_requests
//     for all using (auth.uid() = athlete_user_id);
async function saveRecommendationRequest(payload){
  if(!sb||!currentUser) return null;
  if(window.PREVIEW_USER_ID) return null;
  const {data,error}=await sb.from('recommendation_requests').insert({
    athlete_user_id: currentUser.id,
    athlete_name:    payload.athleteName||null,
    coach_name:      payload.coachName,
    coach_school:    payload.coachSchool||null,
    coach_title:     payload.coachTitle||null,
    note:            payload.coachNote||null,
    status:          'pending',
  }).select('id').single();
  if(error) console.warn('recommendation_requests write failed — run the SQL migration:',error.message);
  return data;
}

async function loadAllBoardRecords(){
  if(!sb||!currentUser) return {};
  const {data}=await sb.from('player_programs')
    .select('id,stage,last_contact_date,next_action,next_action_date,is_dream_school,is_top_choice,is_in_state,scholarship_opp,academic_match,is_christian,programs(school,state)')
    .eq('user_id',currentUser.id);
  const result={};
  (data||[]).forEach(row=>{
    const name=row.programs?.school;
    if(!name) return;
    result[name]={
      ppId:row.id, stage:row.stage,
      last_contact_date:row.last_contact_date, next_action:row.next_action, next_action_date:row.next_action_date,
      is_dream_school:row.is_dream_school, is_top_choice:row.is_top_choice,
      is_in_state:row.is_in_state, scholarship_opp:row.scholarship_opp,
      academic_match:row.academic_match, is_christian:row.is_christian
    };
    _boardCache[name]=result[name];
  });
  return result;
}
