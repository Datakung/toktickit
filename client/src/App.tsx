import { useCallback, useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { AUTHENTICATION_LOST, ApiError, clearAuthentication, isAuthenticationRequired, changePassword, getCurrentUser, login, logout, type CurrentUser } from "./api.js";
import "./app.css";
import { CreateTicketPage } from "./CreateTicketPage.js";
import { MyTicketsPage } from "./MyTicketsPage.js";
import { TicketDetailPage } from "./TicketDetailPage.js";
import { AdminUsersPage } from "./AdminUsersPage.js";
import { StaffTicketQueuePage } from "./StaffTicketQueuePage.js";

const homeFor = (user: CurrentUser) => user.role === "ADMINISTRATOR" ? "/admin/users" : user.role === "IT_STAFF" ? "/staff/tickets" : "/tickets";

function ticketIdFromPath(path: string) { return path.match(/^\/tickets\/([^/]+)$/)?.[1] ?? null; }
function LoginPage({ onLogin }: { onLogin:(user:CurrentUser)=>void }) {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [showPassword,setShowPassword]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function submit(event:FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { onLogin(await login(email,password)); } catch (reason) { setPassword(""); setError(reason instanceof ApiError ? reason.message : "Sign in is unavailable. Try again."); } finally { setBusy(false); } }
  return <main className="selection-page"><section className="selection-card" aria-labelledby="login-title"><p className="eyebrow">TokTickIT IT Service Desk</p><h1 id="login-title">Sign in</h1><p>Use your TokTickIT account to continue.</p>{error&&<div className="feedback-panel feedback-panel-error" role="alert"><h2>Sign in failed</h2><p>{error}</p><p>Contact your TokTickIT administrator if you cannot sign in.</p></div>}<form className="selection-form" onSubmit={submit} aria-busy={busy}><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" required maxLength={320} value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor="password">Password</label><input id="password" type={showPassword?"text":"password"} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><button className="text-button" type="button" aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{showPassword?"Hide password":"Show password"}</button><button className="primary-button" disabled={busy}>{busy?"Signing in…":"Sign in"}</button></form></section></main>;
}
function ChangePasswordPage({ user,onChanged,onLogout }:{user:CurrentUser;onChanged:(u:CurrentUser)=>void;onLogout:()=>void}) {
  const [current,setCurrent]=useState(""); const [next,setNext]=useState(""); const [confirm,setConfirm]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError("");try{onChanged(await changePassword(current,next,confirm));}catch(reason){setCurrent("");setNext("");setConfirm("");setError(reason instanceof ApiError?reason.message:"Password change is unavailable. Try again.");}finally{setBusy(false)}}
  return <main className="selection-page"><section className="selection-card"><p className="eyebrow">{user.mustChangePassword ? "Initial account security" : "Account security"}</p><h1>Change your password</h1><p>{user.mustChangePassword ? `${user.displayName}, create a private password before using TokTickIT.` : `${user.displayName}, update your account password.`}</p>{error&&<div className="feedback-panel feedback-panel-error" role="alert"><p>{error}</p></div>}<form className="selection-form" onSubmit={submit} aria-busy={busy}><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" required value={current} onChange={e=>setCurrent(e.target.value)}/><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={next} onChange={e=>setNext(e.target.value)}/><p className="helper-text">12–128 characters. Spaces and Unicode are allowed.</p><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/><button className="primary-button" disabled={busy}>{busy?"Changing password…":"Change password"}</button><button className="text-button" type="button" onClick={onLogout}>Sign out</button></form></section></main>;
}
function AppShell({user,currentPath,onNavigate,onLogout,onAuthenticationLost}:{user:CurrentUser;currentPath:string;onNavigate:(p:string)=>void;onLogout:()=>void;onAuthenticationLost:()=>void}) {
  const [menu,setMenu]=useState(false); const ticketId=ticketIdFromPath(currentPath);
  function link(event:MouseEvent<HTMLAnchorElement>,path:string){event.preventDefault();setMenu(false);onNavigate(path)}
  const unavailable=onAuthenticationLost;
  return <div className="app-layout"><header className="app-header"><a className="brand" href="/tickets" aria-label="TokTickIT home" onClick={e=>link(e,"/tickets")}><span>TokTickIT</span><small>IT Service Desk</small></a><button className="mobile-nav-toggle secondary-button" type="button" aria-expanded={menu} aria-controls="primary-navigation" onClick={()=>setMenu(!menu)}>Menu</button><nav className={`primary-navigation${menu?" primary-navigation-open":""}`} id="primary-navigation" aria-label="Primary navigation"><a href="/tickets" aria-current={currentPath==="/tickets"?"page":undefined} onClick={e=>link(e,"/tickets")}>My Tickets</a><a href="/tickets/new" aria-current={currentPath==="/tickets/new"?"page":undefined} onClick={e=>link(e,"/tickets/new")}>Create Ticket</a></nav><div className="requester-context"><button className="text-button" onClick={() => onNavigate("/change-password")}>Change password</button><span className="context-label">Signed in · Requester</span><strong>{user.displayName}</strong><button className="text-button" type="button" onClick={onLogout}>Sign out</button></div></header><main className="app-content">{currentPath==="/tickets/new"?<CreateTicketPage requester={user} onRequesterUnavailable={unavailable}/>:ticketId?<TicketDetailPage key={ticketId} requester={user} ticketId={ticketId} onNavigate={onNavigate} onRequesterUnavailable={unavailable}/>:<MyTicketsPage requester={user} onNavigate={onNavigate} onRequesterUnavailable={unavailable}/>}</main></div>;
}
export default function App() {
  const [state, setState] = useState<"loading" | "anonymous" | "ready">("loading");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [path, setPath] = useState(window.location.pathname);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useCallback((next: string, replace = false) => {
    if (location.pathname !== next) history[replace ? "replaceState" : "pushState"]({}, "", next);
    setPath(next);
  }, []);
  const authenticationLost = useCallback(() => {
    clearAuthentication();
    setUser(null);
    setState("anonymous");
    setLogoutError("");
    navigate("/login", true);
  }, [navigate]);
  useEffect(() => {
    window.addEventListener(AUTHENTICATION_LOST, authenticationLost);
    let active = true;
    getCurrentUser().then(u => { if (active) { setUser(u); setState("ready"); } })
      .catch(() => { if (active) authenticationLost(); });
    return () => { active = false; window.removeEventListener(AUTHENTICATION_LOST, authenticationLost); };
  }, [authenticationLost]);
  useEffect(() => {
    const pop = () => setPath(location.pathname);
    addEventListener("popstate", pop);
    return () => removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (state === "anonymous" && path !== "/login") navigate("/login", true);
    if (state === "ready" && user && !user.mustChangePassword && ["/", "/login"].includes(path)) navigate(homeFor(user), true);
    if (user?.mustChangePassword && path !== "/change-password") navigate("/change-password", true);
  }, [state, user, path, navigate]);
  async function signedOut() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try { await logout(); authenticationLost(); }
    catch (error) {
      if (isAuthenticationRequired(error)) authenticationLost();
      else setLogoutError("Sign out failed. Your session may still be active. Try again.");
    } finally { setLoggingOut(false); }
  }
  if (state === "loading") return <main className="selection-page"><section className="selection-card" aria-busy="true"><h1>Loading TokTickIT…</h1></section></main>;
  if (state === "anonymous" || !user) return <LoginPage onLogin={u => {
    setUser(u); setState("ready"); navigate(u.mustChangePassword ? "/change-password" : homeFor(u));
  }}/>;
  const passwordPage = user.mustChangePassword || path === "/change-password";
  return <>
    {logoutError && <div className="feedback-panel feedback-panel-error" role="alert">
      <p>{logoutError}</p><button className="secondary-button" disabled={loggingOut} onClick={() => void signedOut()}>Retry sign out</button>
    </div>}
    {loggingOut && <p role="status">Signing out…</p>}
    {!user.mustChangePassword && passwordPage && <nav aria-label="Account navigation">
      {passwordPage ? <button className="text-button" onClick={() => navigate(homeFor(user))}>Back to workspace</button>
        : <button className="text-button" onClick={() => navigate("/change-password")}>Change password</button>}
    </nav>}
    {passwordPage ? <ChangePasswordPage user={user} onChanged={u => { setUser(u); navigate(homeFor(u)); }} onLogout={() => void signedOut()}/>
      : ((path.startsWith("/admin") && user.role !== "ADMINISTRATOR") || (path.startsWith("/staff") && user.role === "REQUESTER") || (path.startsWith("/tickets") && user.role !== "REQUESTER")) ? <main className="selection-page"><section className="selection-card"><h1>Access denied</h1><p>Your role cannot open this page.</p><button className="primary-button" onClick={() => navigate(homeFor(user))}>Go to my workspace</button></section></main>
      : (user.role === "ADMINISTRATOR" || user.role === "IT_STAFF") ? <div className="app-layout"><header className="app-header"><a className="brand" href={homeFor(user)} onClick={e => { e.preventDefault(); navigate(homeFor(user)); }}><span>TokTickIT</span><small>IT Service Desk</small></a><nav className="admin-actions" aria-label="Staff navigation">{user.role === "ADMINISTRATOR" && <button className="text-button" onClick={() => navigate("/admin/users")}>Users</button>}<button className="text-button" onClick={() => navigate("/staff/tickets")}>Ticket Queue</button></nav><div className="requester-context"><button className="text-button" onClick={() => navigate("/change-password")}>Change password</button><span className="context-label">Signed in · {user.role === "ADMINISTRATOR" ? "Administrator" : "IT Staff"}</span><strong>{user.displayName}</strong><button className="text-button" disabled={loggingOut} onClick={() => void signedOut()}>Sign out</button></div></header><main className="app-content">{path.startsWith("/admin") ? <AdminUsersPage currentUser={user} onSelfChanged={(saved, revoked) => { if (revoked) authenticationLost(); else setUser(saved); }}/> : /^\/staff\/tickets\/[1-9]\d*$/.test(path) ? <section><h1>Ticket Detail</h1><p>Ticket operations will be available after Issue #29 is completed.</p><button className="secondary-button" onClick={() => navigate("/staff/tickets")}>Back to Ticket Queue</button></section> : <StaffTicketQueuePage onNavigate={navigate}/>}</main></div>
      : <AppShell user={user} currentPath={path.startsWith("/tickets") ? path : "/tickets"} onNavigate={navigate} onLogout={() => void signedOut()} onAuthenticationLost={authenticationLost}/>}
  </>;
}
