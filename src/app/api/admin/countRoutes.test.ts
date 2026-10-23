import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({user:vi.fn(),applicants:vi.fn(),inquiries:vi.fn()}));
vi.mock("@/lib/auth",()=>({getCurrentUser:mocks.user}));
vi.mock("@/lib/db",()=>({countPendingApplicants:mocks.applicants,countOpenInquiries:mocks.inquiries}));
import { GET as applicants } from "./applicants/count/route";
import { GET as inquiries } from "./inquiries/count/route";
beforeEach(()=>{vi.clearAllMocks();mocks.applicants.mockResolvedValue(3);mocks.inquiries.mockResolvedValue(2);});
describe("admin count route authorization",()=>{
 it.each([null,{role:"APPLICANT",adminTier:null},{role:"ADMIN",adminTier:"BASIC"}])("blocks applicant counts for unauthorized roles: %j",async user=>{
  mocks.user.mockResolvedValue(user);expect((await applicants()).status).toBe(403);expect(mocks.applicants).not.toHaveBeenCalled();
 });
 it.each(["PRO","MASTER"])("allows %s applicant counts without caching",async adminTier=>{
  mocks.user.mockResolvedValue({role:"ADMIN",adminTier});const res=await applicants();expect(await res.json()).toEqual({count:3});expect(res.headers.get("Cache-Control")).toBe("no-store");
 });
 it.each([null,{role:"APPLICANT"}])("blocks inquiry counts for non-admins: %j",async user=>{
  mocks.user.mockResolvedValue(user);expect((await inquiries()).status).toBe(401);expect(mocks.inquiries).not.toHaveBeenCalled();
 });
 it.each(["BASIC","PRO","MASTER"])("allows %s inquiry counts without caching",async adminTier=>{
  mocks.user.mockResolvedValue({role:"ADMIN",adminTier});const res=await inquiries();expect(await res.json()).toEqual({count:2});expect(res.headers.get("Cache-Control")).toBe("no-store");
 });
});
