import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, getInternalNotes, getPublicComments, postInternalNote, postPublicComment, type CommunicationEntry } from "./api.js";

const formatTime = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function CommunicationPanel({ ticketId, kind }: { ticketId: number; kind: "comments" | "notes" }) {
  const notes = kind === "notes", title = notes ? "Internal Notes" : "Public Comments";
  const [items,setItems]=useState<CommunicationEntry[]>([]),[body,setBody]=useState(""),[loading,setLoading]=useState(true),[loadFailed,setLoadFailed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const heading=useRef<HTMLHeadingElement>(null);
  const load=useCallback(async()=>{setLoading(true);setLoadFailed(false);setError("");try{const page=await (notes?getInternalNotes(ticketId):getPublicComments(ticketId));setItems(page.items)}catch(reason){setLoadFailed(true);setError(reason instanceof ApiError?reason.message:`${title} could not be loaded. Try again.`)}finally{setLoading(false)}},[notes,ticketId,title]);
  useEffect(()=>{void load()},[load]);
  async function submit(event:FormEvent){event.preventDefault();const trimmed=body.trim();if(!trimmed||trimmed.length>4000){setError("Write between 1 and 4000 characters.");return}setBusy(true);setError("");try{const entry=await(notes?postInternalNote(ticketId,trimmed):postPublicComment(ticketId,trimmed));setItems(old=>[...old,entry]);setBody("")}catch(reason){setError(reason instanceof ApiError?reason.message:`The ${notes?"Internal Note":"Public Comment"} could not be posted. Try again.`)}finally{setBusy(false)}}
  return <section className={`detail-panel communication-panel${notes?" internal-notes":""}`} aria-labelledby={`${kind}-heading`}>
    <h2 id={`${kind}-heading`} ref={heading}>{title}</h2>
    <p>{notes?"Visible only to IT Staff and Administrators.":"Visible to the Requester and service desk."} Entries are permanent.</p>
    {loading?<p role="status">Loading {title}…</p>:items.length===0?<p>No {title.toLowerCase()} yet.</p>:<ol className="communication-list">{items.map(item=><li key={item.id}><p>{item.body}</p><small>{item.author.displayName} · {formatTime(item.createdAt)}</small></li>)}</ol>}
    {error&&<div className="feedback-panel feedback-panel-error" role="alert"><p>{error}</p>{loadFailed&&<button className="secondary-button" onClick={()=>void load()}>Retry</button>}</div>}
    <form className="communication-form" onSubmit={submit} aria-busy={busy}>
      <label htmlFor={`${kind}-body`}>Add {notes?"an Internal Note":"a Public Comment"}</label>
      <textarea id={`${kind}-body`} rows={4} maxLength={4000} value={body} onChange={e=>{setBody(e.target.value);setError("")}} />
      <small>{body.trim().length}/4000 characters</small>
      <button className="primary-button" disabled={busy}>{busy?"Posting…":"Post"}</button>
    </form>
  </section>;
}
