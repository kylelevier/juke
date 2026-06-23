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
function _ls(){ return window.PREVIEW_TARGET_USER_ID ? sessionStorage : localStorage; }
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
// ── PIPELINE DRAG STATE ──────────────────────────────────────
let _pd={card:null,clone:null,ox:0,oy:0,over:null,moved:false};
let playerData=lsGet('juke_player');

// ── BOARD DATA LAYER ─────────────────────────────────────────
// In-memory cache: { schoolName: { ppId, stage, attrs, lastContactDate, nextAction, nextActionDate } }
let _boardCache={};

function _boardSaveError(message,error){
  const detail=error?.message?`: ${error.message}`:'';
  console.error(`JUKE board save failed: ${message}`, error||'');
  showToast?.(`${message}${detail}`);
}

function _pipelineFromBoardMeta(meta){
  const pipeline={};
  Object.entries(meta||{}).forEach(([school,row])=>{
    if(row?.stage) pipeline[school]=row.stage;
  });
  return pipeline;
}

function _samePipeline(a,b){
  const ak=Object.keys(a||{}).sort();
  const bk=Object.keys(b||{}).sort();
  if(ak.length!==bk.length) return false;
  return ak.every((k,i)=>k===bk[i]&&(a||{})[k]===(b||{})[k]);
}

async function migrateLocalBoardDraftIfNeeded(playerDataPipeline){
  if(!sb||!currentUser||window.PREVIEW_TARGET_USER_ID) return playerDataPipeline||{};
  const local=lsGet('juke_status')||{};
  const hasLocal=Object.keys(local).length>0;
  const meta=await loadAllBoardRecords({silent:true});
  const relational=_pipelineFromBoardMeta(meta||{});
  const cloud=Object.keys(relational).length ? relational : (playerDataPipeline||{});
  if(!hasLocal) return cloud;
  if(!Object.keys(cloud).length){
    for(const [school,stage] of Object.entries(local)){
      if(stage&&stage!=='none') await saveBoardStage(school,stage);
    }
    showToast?.('Local draft saved to your account.');
    return _pipelineFromBoardMeta(await loadAllBoardRecords({silent:true})||{});
  }
  if(!_samePipeline(local,cloud)){
    lsSet('juke_status_draft_backup',{saved_at:new Date().toISOString(),pipeline:local});
    const useLocal=typeof confirm==='function' && confirm('This device has a local board draft, but your saved board already has programs. Use this device draft to update your board? Cancel keeps the saved board and backs up this draft.');
    if(useLocal){
      for(const [school,stage] of Object.entries(local)){
        if(stage&&stage!=='none') await saveBoardStage(school,stage);
      }
      showToast?.('Local draft merged into your saved board.');
      return _pipelineFromBoardMeta(await loadAllBoardRecords({silent:true})||{});
    }
    showToast?.('Saved board loaded. Local draft backed up.');
  }
  return cloud;
}

// Resolve or create the player_programs row for a given school name.
// Returns the row id (ppId) or null if not logged in / program not found.
async function _resolvePPId(schoolName){
  if(!sb||!currentUser) return null;
  if(window.PREVIEW_TARGET_USER_ID) return _boardCache[schoolName]?.ppId || null;
  if(_boardCache[schoolName]?.ppId) return _boardCache[schoolName].ppId;
  // Look up program id
  const {data:prog,error:progError}=await sb.from('programs').select('id').eq('school',schoolName).maybeSingle();
  if(progError){_boardSaveError('Could not find this program',progError);return null;}
  if(!prog){_boardSaveError('Could not find this program');return null;}
  const {data:existing,error:existingError}=await sb.from('player_programs')
    .select('id,stage')
    .eq('user_id',currentUser.id)
    .eq('program_id',prog.id)
    .maybeSingle();
  if(existingError){_boardSaveError('Could not load board record',existingError);return null;}
  if(existing){
    _boardCache[schoolName]=Object.assign(_boardCache[schoolName]||{},{ppId:existing.id,stage:existing.stage});
    return existing.id;
  }
  // Create a player_programs row only when it does not exist.
  const stage=statusData[schoolName]||'saved';
  const {data:pp,error}=await sb.from('player_programs')
    .insert({user_id:currentUser.id,program_id:prog.id,stage})
    .select('id').single();
  if(error){_boardSaveError('Could not create board record',error);return null;}
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
  if(window.PREVIEW_TARGET_USER_ID) return {data:null,error:{message:'Preview mode is read-only'}};
  const cur=lsGet('juke_card_attrs');
  cur[schoolName]=Object.assign(cur[schoolName]||{},attrs);
  if(!sb||!currentUser){lsSet('juke_card_attrs',cur);return {data:null,error:null,local:true};}
  // Persist to Supabase
  const ppId=await _resolvePPId(schoolName);
  if(!ppId) return {data:null,error:{message:'Board record not found'}};
  const {data,error}=await sb.from('player_programs').update({
    is_dream_school: cur[schoolName].is_dream_school||false,
    is_top_choice:   cur[schoolName].is_top_choice||false,
    is_in_state:     cur[schoolName].is_in_state||false,
    scholarship_opp: cur[schoolName].scholarship_opp||false,
    academic_match:  cur[schoolName].academic_match||false,
    is_christian:    cur[schoolName].is_christian||false,
    updated_at: new Date().toISOString()
  }).eq('id',ppId).select().single();
  if(error){_boardSaveError('Could not save board attributes',error);return {data:null,error};}
  lsSet('juke_card_attrs',cur);
  _boardCache[schoolName]=Object.assign(_boardCache[schoolName]||{},cur[schoolName]);
  return {data,error:null};
}

// Update stage in Supabase after a drag-drop move.
async function saveBoardStage(schoolName,stage){
  if(window.PREVIEW_TARGET_USER_ID) return {data:null,error:{message:'Preview mode is read-only'}};
  if(!sb||!currentUser){
    if(stage==='none') delete statusData[schoolName];
    else statusData[schoolName]=stage;
    lsSet('juke_status',statusData);
    return {data:null,error:null,local:true};
  }
  const prevStage=statusData[schoolName];
  statusData[schoolName]=stage;
  const ppId=await _resolvePPId(schoolName);
  if(!ppId){
    if(prevStage) statusData[schoolName]=prevStage;
    else delete statusData[schoolName];
    return {data:null,error:{message:'Board record not found'}};
  }
  const {data,error}=await sb.from('player_programs').update({stage,updated_at:new Date().toISOString()}).eq('id',ppId).select().single();
  if(error){
    if(prevStage) statusData[schoolName]=prevStage;
    else delete statusData[schoolName];
    _boardSaveError('Could not save board stage',error);
    return {data:null,error};
  }
  lsSet('juke_status',statusData);
  _boardCache[schoolName]=Object.assign(_boardCache[schoolName]||{},{stage,ppId});
  return {data,error:null};
}

async function removeBoardProgram(schoolName){
  if(window.PREVIEW_TARGET_USER_ID) return {error:{message:'Preview mode is read-only'}};
  if(!sb||!currentUser){
    delete statusData[schoolName];
    lsSet('juke_status',statusData);
    return {error:null,local:true};
  }
  const ppId=await _resolvePPId(schoolName);
  if(!ppId) return {error:{message:'Board record not found'}};
  const {error}=await sb.from('player_programs').delete().eq('id',ppId);
  if(error){_boardSaveError('Could not remove program from board',error);return {error};}
  delete statusData[schoolName];
  delete _boardCache[schoolName];
  lsSet('juke_status',statusData);
  return {error:null};
}

// Update next action / last contact date fields.
async function saveBoardContact(schoolName,{lastContactDate,nextAction,nextActionDate}){
  if(window.PREVIEW_TARGET_USER_ID) return {data:null,error:{message:'Preview mode is read-only'}};
  const ppId=await _resolvePPId(schoolName);
  if(!ppId) return {data:null,error:{message:'Board record not found'}};
  const patch={updated_at:new Date().toISOString()};
  if(lastContactDate!==undefined) patch.last_contact_date=lastContactDate;
  if(nextAction!==undefined)      patch.next_action=nextAction;
  if(nextActionDate!==undefined)  patch.next_action_date=nextActionDate;
  const {data,error}=await sb.from('player_programs').update(patch).eq('id',ppId).select().single();
  if(error){_boardSaveError('Could not save board contact details',error);return {data:null,error};}
  _boardCache[schoolName]=Object.assign(_boardCache[schoolName]||{},patch);
  return {data,error:null};
}

// ── Generic section loaders ───────────────────────────────────
async function loadBoardSection(schoolName, table){
  if(window.PREVIEW_TARGET_USER_ID){
    const sections = window.PREVIEW_BUNDLE?.board_sections || {};
    const schoolSections = sections[schoolName] || {};
    return schoolSections[table] || [];
  }
  const ppId=await _resolvePPId(schoolName);
  if(!ppId) return [];
  const {data,error}=await sb.from(table).select('*').eq('player_program_id',ppId).order('created_at',{ascending:false});
  if(error){_boardSaveError('Could not load board details',error);return [];}
  return data||[];
}

async function addBoardItem(schoolName, table, payload){
  if(window.PREVIEW_TARGET_USER_ID) return null;
  const ppId=await _resolvePPId(schoolName);
  if(!ppId) return null;
  const {data,error}=await sb.from(table).insert({player_program_id:ppId,...payload}).select().single();
  if(error){_boardSaveError('Could not save board item',error);return null;}
  return data;
}

async function updateBoardItem(table, id, patch){
  if(window.PREVIEW_TARGET_USER_ID) return null;
  const {data,error}=await sb.from(table).update({...patch,updated_at:new Date().toISOString()}).eq('id',id).select().single();
  if(error){_boardSaveError('Could not update board item',error);return null;}
  return data;
}

async function deleteBoardItem(table, id){
  if(window.PREVIEW_TARGET_USER_ID) return;
  const {error}=await sb.from(table).delete().eq('id',id);
  if(error){_boardSaveError('Could not delete board item',error);return {error};}
  return {error:null};
}

// ── Conversation ↔ Program linking ───────────────────────────
// Sets player_program_id on a conversation row so threads have school context.
async function linkConversationToProgram(convId, ppId){
  if(window.PREVIEW_TARGET_USER_ID) return;
  if(!sb||!convId||!ppId) return;
  const {error}=await sb.from('conversations').update({player_program_id:ppId}).eq('id',convId);
  if(error) _boardSaveError('Could not link conversation to program',error);
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
// Production flow is backend-owned. The RPC validates active users, recipient
// eligibility, ownership, and RLS rather than trusting localStorage.
async function saveRecommendationRequest(payload){
  if(!sb||!currentUser) return {data:null,error:{message:'Sign in required'}};
  if(window.PREVIEW_TARGET_USER_ID) return {data:null,error:{message:'Preview mode is read-only'}};
  return sb.rpc('create_recommendation_request', {
    coach_name: payload.coachName,
    coach_school: payload.coachSchool||null,
    coach_title: payload.coachTitle||null,
    note: payload.coachNote||null
  });
}

async function loadAllBoardRecords(opts){
  if(!sb||!currentUser) return {};
  if(window.PREVIEW_TARGET_USER_ID){
    const rows = window.PREVIEW_BUNDLE?.board_records || window.PREVIEW_BUNDLE?.player_programs || [];
    const result = {};
    rows.forEach(row=>{
      const name = row.school || row.programs?.school;
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
  const {data,error}=await sb.from('player_programs')
    .select('id,stage,last_contact_date,next_action,next_action_date,is_dream_school,is_top_choice,is_in_state,scholarship_opp,academic_match,is_christian,programs(school,state)')
    .eq('user_id',currentUser.id);
  if(error){
    if(window.PREVIEW_USER_ID) console.warn('JUKE preview board load failed:', error.message);
    else if(!opts?.silent) _boardSaveError('Could not load your board',error);
    return null;
  }
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
