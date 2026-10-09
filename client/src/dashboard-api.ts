import { getJson, type CurrentUser, type TicketStatus, type RequestedPriority } from "./api.js";
export interface DashboardTicket { id: number; ticketNumber: string; summary: string; status: TicketStatus; itPriority: RequestedPriority; owner: { id: number; displayName: string } | null; updatedAt: string }
export interface DashboardAction { id: number; actionNumber: number; ticketId: number; ticketNumber: string; summary: string; state: string; performedAt: string }
interface Snapshot { asOf: string; recentFrom: string; recentTickets: DashboardTicket[] }
export interface RequesterDashboardData extends Snapshot { metrics: { activeTickets: number; waitingForMe: number; recentlyUpdated: number; recentlyResolved: number }; attentionTickets: DashboardTicket[]; drillDown: Record<"activeTickets" | "waitingForMe" | "recentlyUpdated" | "recentlyResolved" | "recentTickets" | "attentionTickets", string> }
export interface StaffDashboardData extends Snapshot { metrics: { unassignedTickets: number; myTickets: number; myAssignedActions: number; statusCounts: Record<TicketStatus, number>; priorityCounts: Record<RequestedPriority, number> }; recentPerformedActions: DashboardAction[]; drillDown: { unassignedTickets: string; myTickets: string; myAssignedActions: string; statusCounts: Record<TicketStatus, string>; priorityCounts: Record<RequestedPriority, string>; recentTickets: string; recentPerformedActions: string } }
export interface WorkQuery { assignedTo: string; performedBy: string; stateGroup: string; state: string; performedSince: string; performedUntil: string; page: number; pageSize: number }
export interface WorkItem extends Omit<DashboardAction, "performedAt"> { assignee: { id: number; displayName: string } | null; performedBy: { id: number; displayName: string } | null; cycle: number; ticketStatus: TicketStatus; version: number; performedAt: string | null }
export interface WorkPage { items: WorkItem[]; page: number; pageSize: number; total: number; totalPages: number }
export const getRequesterDashboard = () => getJson<RequesterDashboardData>("/api/dashboard/requester");
export const getStaffDashboard = () => getJson<StaffDashboardData>("/api/dashboard/staff");
export const getActionWork = (q: WorkQuery) => getJson<WorkPage>(`/api/staff/actions?${new URLSearchParams(Object.entries(q).filter(([, value]) => value !== "").map(([key, value]) => [key, String(value)]))}`);
export type DashboardProps = { user: CurrentUser; onNavigate: (path: string) => void };
