/** Private benchmark: essay only enters the reader; published reviews stay local.
 * Uses Essence's prompt, model chain, parser, recovery and reading acceptance.
 * Does not write to the application database or train a model.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { MODE_A_SYSTEM } from "../src/lib/ai/systemPrompt";
import { buildModeAPrompt, buildRecoveryPrompt, type SeasonContext } from "../src/lib/ai/modeAPrompt";
import { parseModeAReport, parseSpotCards, locateQuote } from "../src/lib/ai/parseReport";
import { anchorReaderAssessment } from "../src/lib/ai/readerAssessment";
import { normaliseReportMarkers } from "../src/lib/ai/reportMarkers";
import { findUncardedCandidates } from "../src/lib/ai/coverageGaps";
import { geminiChain, geminiRequestTimeout, GEMINI_HTTP_OPTIONS } from "../src/lib/ai/gemini";
import type { Essay } from "../src/lib/types";

interface Reference { id:string; title:string; draft:string; group:string; wordLimit:number|null }
const arg=(name:string,fallback="")=>{const i=process.argv.indexOf(`--${name}`);return i<0?fallback:process.argv[i+1]??fallback;};
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const context:SeasonContext={facts:[],otherEssays:[],previouslyResolved:[],setAside:[],round:1,previousReadiness:null,draftUnchanged:false,previousSpotKeys:[]};
async function main(){
  const out=arg("out","eval-out/published-reviews");mkdirSync(out,{recursive:true});
  const systems={before:readFileSync(arg("before"),"utf8"),after:MODE_A_SYSTEM};
  for(const [version,system] of Object.entries(systems))writeFileSync(join(out,version+".txt"),system);
  const input=JSON.parse(readFileSync(arg("corpus"),"utf8")) as Reference[];
  const ids=new Set(arg("cases").split(",").filter(Boolean));
  const cases=ids.size?input.filter(e=>ids.has(e.id)):input;
  if(ids.size&&cases.length!==ids.size)throw Error("Unknown case");
  const versions=arg("versions","before,after").split(",");
  if(versions.some(v=>v!=="before"&&v!=="after"))throw Error("Unknown version");
  const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
  const override=arg("model");
  const chain=override?[override]:geminiChain("diagnostic");
  const manifest:unknown[]=[];let failures=0;
  for(const [index,e] of cases.entries()){
    const order=index%2?["after","before"]:["before","after"];
    // Hide source/title/author/review/outcome. No target school fit is presumed.
    const essay:Essay={id:e.id,user_id:"eval",title:"Untitled",prompt_text:null,word_limit:e.wordLimit,current_draft:e.draft,essay_kind:"personal_statement",school:null,last_feedback_at:null,revision_count:0,archived_at:null,archived_reason:null,created_at:"2026-10-12",updated_at:"2026-10-12"};
    const prompt=buildModeAPrompt(essay,e.draft,context);
    for(const version of order.filter(v=>versions.includes(v)) as Array<keyof typeof systems>){
      const file=join(out,`${e.id}-${version}.json`);
      if(existsSync(file)){
        const saved=JSON.parse(readFileSync(file,"utf8"));
        if(saved.inputHash===hash(prompt)&&saved.systemHash===hash(systems[version])&&saved.status==="complete"){
          manifest.push({...saved,id:e.id,raw:undefined,report:undefined,prompt:undefined});console.log(`${e.id} ${version}: reused`);continue;
        }
      }
      const attempts:Array<{model:string;status:number|null;elapsedMs:number}>=[];
      let raw="",servedModel:string|null=null,requestedModel:string|null=null;
      for(const [modelIndex,model] of chain.entries()){
        const start=Date.now();
        try{
          const timeout=geminiRequestTimeout("diagnostic",model,modelIndex);
          const result=await ai.models.generateContent({model,contents:prompt,config:{systemInstruction:systems[version],temperature:0.6,abortSignal:AbortSignal.timeout(timeout),httpOptions:{...GEMINI_HTTP_OPTIONS,timeout}}});
          raw=result.text??"";if(!raw.trim())throw Error("Empty response");
          servedModel=result.modelVersion??null;requestedModel=model;attempts.push({model,status:200,elapsedMs:Date.now()-start});break;
        }catch(error){
          const status=(error as {status?:number}).status??null;attempts.push({model,status,elapsedMs:Date.now()-start});
          console.log(`${e.id} ${version}: ${model} ${status??"unavailable"}`);
          if(status===401||status===403)break;
        }
      }
      const report=raw?parseModeAReport(raw):null;
      const truncated=raw? !normaliseReportMarkers(raw).includes("<<<END>>>"):null;
      let recoveryRaw:string|null=null,recoveryModel:string|null=null,recoveryStatus:string|null=null;
      if(report&&!truncated){
        const gaps=findUncardedCandidates(e.draft,report.scan.candidates,report.scan.dropped,report.spots.map(s=>s.quoted_text));
        if(gaps.length){
          // One separate recovery attempt mirrors the route's narrow second pass.
          const model=geminiChain("conversation")[0];
          try{
            const timeout=geminiRequestTimeout("conversation",model,0);
            const r=await ai.models.generateContent({model,contents:buildRecoveryPrompt(e.draft,gaps),config:{systemInstruction:systems[version],temperature:0.4,abortSignal:AbortSignal.timeout(timeout),httpOptions:{...GEMINI_HTTP_OPTIONS,timeout}}});
            recoveryRaw=r.text??"";recoveryModel=r.modelVersion??model;recoveryStatus="complete";
            report.spots.push(...parseSpotCards(recoveryRaw).filter(s=>locateQuote(e.draft,s.quoted_text)));
          }catch(error){recoveryStatus=`failed:${(error as {status?:number}).status??"unavailable"}`;}
        }
      }
      const reading=report?anchorReaderAssessment(report.reader_assessment,e.draft,report.spots):null;
      const status=raw?"complete":"failed";
      const result={id:e.id,version,status,requestedModel,servedModel,attempts,temperature:0.6,inputHash:hash(prompt),systemHash:hash(systems[version]),prompt,raw,report,truncated,readingAccepted:!!reading,acceptedReading:reading,recoveryRaw,recoveryModel,recoveryStatus,researchModelOverride:override||null};
      writeFileSync(file,JSON.stringify(result,null,2));
      manifest.push({...result,prompt:undefined,raw:undefined,report:undefined,recoveryRaw:undefined,acceptedReading:undefined});
      writeFileSync(join(out,"manifest.json"),JSON.stringify(manifest,null,2));
      console.log(`${e.id} ${version}: ${status}; ${report?.spots.length??0} cards; accepted=${!!reading}`);
      failures=raw?0:failures+1;
      if(failures>=Number(arg("max-failures","2"))){console.log("Stopped after consecutive transport failures. Remaining cases not run.");process.exitCode=1;return;}
    }
  }
}
main().catch(()=>{console.error("Benchmark setup failed. Check local paths and configuration.");process.exitCode=1;});
