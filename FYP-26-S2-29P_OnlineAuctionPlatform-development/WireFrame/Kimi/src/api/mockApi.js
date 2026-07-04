import { auctions, users, bids, categories, adminCases, auditLogs } from '../data/mockData'

const wait = (payload, ms = 180) => new Promise((resolve) => setTimeout(() => resolve(payload), ms))

export const mockApi = {
  getAuctions: () => wait(auctions),
  getAuction: (id) => wait(auctions.find((a) => String(a.id) === String(id))),
  getUsers: () => wait(users),
  getBids: () => wait(bids),
  getCategories: () => wait(categories),
  getCases: () => wait(adminCases),
  getAuditLogs: () => wait(auditLogs),
}
