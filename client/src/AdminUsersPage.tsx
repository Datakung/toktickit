import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, createAdminUser, editAdminUser, getAdminUsers, resetAdminPassword, type AdminUser, type CurrentUser, type UserInput, type UserRole } from "./api.js";

export const roleLabel = (role: UserRole) => ({ REQUESTER: "Requester", IT_STAFF: "IT Staff", ADMINISTRATOR: "Administrator" })[role];
const empty: UserInput = { displayName: "", email: "", role: "REQUESTER", isActive: true };
type Editor = { mode: "create" | "edit" | "reset"; target: AdminUser | null };
export function AdminUsersPage({ currentUser, onSelfChanged }: { currentUser: CurrentUser; onSelfChanged: (user: AdminUser, revoked: boolean) => void }) {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [draft, setDraft] = useState<UserInput>(empty);
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState("");
  const generation = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setLoadError("");
    try {
      const response = await getAdminUsers(query, role, status);
      if (current === generation.current) setItems(response.items);
    } catch (reason) {
      if (current === generation.current) setLoadError(reason instanceof ApiError && reason.status === 403 ? "Administrator access is required." : "Users could not be loaded. Try again.");
    } finally { if (current === generation.current) setLoading(false); }
  }, [query, role, status]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    if (editor) panelHeading.current?.focus();
    else if (trigger.current?.isConnected) trigger.current.focus();
  }, [editor]);
  useEffect(() => { if (error) errorSummary.current?.focus(); }, [error]);
  function open(mode: Editor["mode"], target: AdminUser | null = null) {
    trigger.current = document.activeElement as HTMLElement;
    setDraft(target ? { displayName: target.displayName, email: target.email, role: target.role, isActive: target.isActive } : { ...empty });
    setPassword(""); setConfirmed(false); setError(null); setSuccess(""); setEditor({ mode, target });
  }
  function close() { setEditor(null); setPassword(""); setError(null); }
  async function reloadAccount() {
    if (!editor?.target || busy) return;
    setBusy(true);
    try {
      const fresh = (await getAdminUsers()).items.find(u => u.id === editor.target!.id);
      if (!fresh) throw new ApiError(404, "USER_NOT_FOUND", "This account is unavailable.");
      setEditor({ ...editor, target: fresh });
      setDraft({ displayName: fresh.displayName, email: fresh.email, role: fresh.role, isActive: fresh.isActive });
      setPassword(""); setConfirmed(false); setError(null);
    } catch { setError(new ApiError(500, "RELOAD_FAILED", "Could not reload this account. Try again.")); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!editor || busy) return;
    setBusy(true); setError(null); setSuccess("");
    try {
      let saved: AdminUser;
      if (editor.mode === "create") saved = await createAdminUser({ ...draft, initialPassword: password });
      else if (editor.mode === "reset") saved = await resetAdminPassword(editor.target!.id, { initialPassword: password, version: editor.target!.version });
      else saved = await editAdminUser(editor.target!.id, { ...draft, version: editor.target!.version });
      const reset = editor.mode === "reset";
      const revoked = reset || !saved.isActive || saved.role !== currentUser.role;
      setSuccess(reset ? `Initial password reset for ${saved.displayName}. Communicate it securely; password change is required at next login.` : `Account saved for ${saved.displayName}.`);
      close();
      if (saved.id === currentUser.id) onSelfChanged(saved, revoked);
      if (!(saved.id === currentUser.id && revoked)) await load();
    } catch (reason) {
      setPassword(""); setConfirmed(false);
      setError(reason instanceof ApiError ? reason : new ApiError(500, "REQUEST_FAILED", "The account could not be saved. Try again."));
    } finally { setBusy(false); }
  }
  const label = editor?.mode === "create" ? "Create user" : editor?.mode === "reset" ? "Reset initial password" : "Edit user";
  const fields = error?.fields ?? {};
  return <section className="admin-page" aria-labelledby="users-heading">
    <p className="eyebrow">Administration</p>
    <h1 id="users-heading" ref={heading} tabIndex={-1}>Users</h1>
    <p className="page-intro">Manage accounts and access. Each account has one role.</p>
    {success && <div className="feedback-panel" role="status">{success}</div>}
    <form className="admin-toolbar" aria-label="Search users" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); }}>
      <div><label htmlFor="user-search">Name or email</label><input id="user-search" maxLength={120} value={search} onChange={e => setSearch(e.target.value)}/></div>
      <div><label htmlFor="user-role-filter">Role filter</label><select id="user-role-filter" value={role} onChange={e => setRole(e.target.value)}><option value="">All roles</option>{(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const).map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></div>
      <div><label htmlFor="user-status-filter">Status filter</label><select id="user-status-filter" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select></div>
      <button className="secondary-button">Search</button>
      <button className="text-button" type="button" onClick={() => { setSearch(""); setQuery(""); setRole(""); setStatus(""); }}>Clear filters</button>
      <button className="primary-button" type="button" disabled={!!editor} onClick={() => open("create")}>Create user</button>
    </form>
    {editor && <section className="admin-editor" aria-labelledby="user-editor-heading">
      <h2 id="user-editor-heading" ref={panelHeading} tabIndex={-1}>{label}{editor.target ? `: ${editor.target.displayName}` : ""}</h2>
      {error && <div className="feedback-panel feedback-panel-error" role="alert" tabIndex={-1} ref={errorSummary}>
        <p>{error.message}</p>
        {Object.entries(fields).map(([key, message]) => <p key={key}>{message}</p>)}
        {["VERSION_CONFLICT", "RELOAD_FAILED"].includes(error.code) && <><p>Your input is retained. Reloading replaces it with the current account values. Review them before submitting again.</p><button type="button" className="secondary-button" disabled={busy} onClick={() => void reloadAccount()}>Reload account</button></>}
      </div>}
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy}>
          <legend className="visually-hidden">{label}</legend>
          {editor.mode !== "reset" && <div className="admin-fields">
            <div><label htmlFor="user-name">Name</label><input id="user-name" required maxLength={120} value={draft.displayName} aria-invalid={!!fields.displayName} aria-describedby={fields.displayName ? "name-error" : undefined} onChange={e => setDraft({ ...draft, displayName: e.target.value })}/>{fields.displayName && <p id="name-error" className="field-error">{fields.displayName}</p>}</div>
            <div><label htmlFor="user-email">Email</label><input id="user-email" type="email" required maxLength={320} value={draft.email} aria-invalid={!!fields.email} aria-describedby={fields.email ? "email-error" : undefined} onChange={e => setDraft({ ...draft, email: e.target.value })}/>{fields.email && <p id="email-error" className="field-error">{fields.email}</p>}</div>
            <div><label htmlFor="user-role">Role</label><select id="user-role" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as UserRole })}>{(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const).map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></div>
            <div><label htmlFor="user-status">Status</label><select id="user-status" value={String(draft.isActive)} onChange={e => setDraft({ ...draft, isActive: e.target.value === "true" })}><option value="true">Active</option><option value="false">Inactive</option></select></div>
          </div>}
          {editor.mode !== "edit" && <div className="admin-password"><label htmlFor="initial-password">Initial password</label><input id="initial-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} aria-invalid={!!fields.initialPassword} aria-describedby="initial-password-help" onChange={e => setPassword(e.target.value)}/><p id="initial-password-help" className="helper-text">12–128 characters. Communicate this password securely outside the app. The user must change it after signing in.</p></div>}
          {editor.mode === "edit" && <p className="helper-text">Deactivation and role changes sign the user out. Deactivation or changing to Requester also unassigns their owned tickets; ticket history is preserved.</p>}
          {(editor.mode === "reset" || (editor.mode === "edit" && (!draft.isActive || draft.role !== editor.target?.role))) && <label className="admin-confirm"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>I confirm this access change and its session consequences.</label>}
          <div className="admin-actions"><button className="primary-button">{busy ? "Saving…" : editor.mode === "reset" ? "Confirm password reset" : "Save user"}</button><button type="button" className="secondary-button" onClick={close}>Cancel</button></div>
        </fieldset>
      </form>
    </section>}
    {loading ? <p role="status">Loading users…</p> : loadError ? <div className="feedback-panel feedback-panel-error" role="alert"><p>{loadError}</p><button className="secondary-button" onClick={() => void load()}>Retry loading users</button></div>
      : items.length === 0 ? <p role="status">{query || role || status ? "No users match these filters." : "No users available."}</p>
      : <table className="admin-table"><caption>{items.length} accounts</caption><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>{items.map(user => <tr key={user.id}>
        <td data-label="Name">{user.displayName}{user.id === currentUser.id && <small> (you)</small>}</td><td data-label="Email">{user.email}</td><td data-label="Role">{roleLabel(user.role)}</td><td data-label="Status"><span className={`admin-status${user.isActive ? "" : " admin-inactive"}`}>{user.isActive ? "Active" : "Inactive"}</span></td><td data-label="Actions"><div className="admin-actions"><button className="secondary-button" disabled={!!editor} aria-label={`Edit ${user.displayName}`} onClick={() => open("edit", user)}>Edit</button><button className="text-button" disabled={!!editor} aria-label={`Reset password for ${user.displayName}`} onClick={() => open("reset", user)}>Reset password</button></div></td>
      </tr>)}</tbody></table>}
  </section>;
}
