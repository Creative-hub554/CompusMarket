# Phase 3: Release Verification

**Goal**: Validate that www.champey.com is production-ready through comprehensive testing covering CI/CD, user journeys, i18n, performance, and security.

**Success Gate**: All verification tests pass + sign-off from product, engineering, and security leads.

---

## 1. CI/CD Pipeline Validation

### 1.1 GitHub Actions Workflow Verification
Confirm `.github/workflows/ci.yml` runs successfully on main branch:

```bash
# Manual trigger via GitHub UI:
# - Actions tab → ci.yml → "Run workflow" → main branch
# 
# Expected: All jobs pass within 30 minutes
# - Node 20 + pnpm 9 environment loads
# - prisma generate succeeds (no schema drift)
# - pnpm build compiles all 3 apps + 2 packages without errors
# - ESLint: 0 errors, warnings logged but non-blocking
# - turbo run test: all vitest suites pass (backend excludes *.e2e-spec.ts)
# - Build artifacts cached for deployment

# Artifact expectations:
# - /apps/backend/.next/ or dist/ directory (NestJS compiled)
# - /apps/frontend/.next/ build directory (Next.js 15 exported)
# - /apps/admin/.next/ build directory
# - Package manager lockfile up-to-date (pnpm-lock.yaml)
```

**Acceptance Criteria**:
- [ ] CI passes on current main branch (green checkmark on last commit)
- [ ] No uncommitted schema.prisma changes detected
- [ ] Build takes <30 minutes (not >60)
- [ ] Artifact retention policy in place (30 days)
- [ ] All required status checks enforced (merge only if green)

---

## 2. User Journey Testing

### 2.1 Frontend Public Flows

#### 2.1.1 Authentication Flow
```
Scenario: New user signs up, logs in, and accesses account

Steps:
1. Navigate to /km/auth/register (Khmer locale, registration page)
2. Fill form: email, password (min 8 chars), confirm password
3. Submit → expect email verification or immediate login
4. Verify JWT token issued (check browser DevTools: Application → Cookies → check auth/session cookie)
5. Navigate to /km/user/profile → Profile page should load with user data
6. Verify profile metadata matches registered email
7. Log out → redirected to /km/auth/login with success message
8. Log in with registered credentials
9. Verify redirected to /km/ (home) with session restored
10. Open DevTools Console → no 401 errors during page load

Expected: Zero 401 errors, page <2s load time, no auth loops
```

#### 2.1.2 Product Browsing & Cart Flow
```
Scenario: Buyer adds items to cart and views checkout (without payment)

Steps:
1. Navigate to /km/products (Khmer)
2. Verify product grid loads with images, titles, prices (from /api/products public endpoint)
3. Click 1+ products → product detail page (/km/products/[id])
4. Verify reviews, ratings, stock status display correctly
5. Click "Add to Cart" → toast notification appears
6. Navigate to /km/cart
7. Verify cart shows all added items with correct prices
8. Verify subtotal, tax (if applicable), and total calculate correctly
9. Verify quantity increment/decrement works
10. Remove an item → item disappears, total updates

Expected: Cart operations <500ms, no missing product data, UI feedback on every action
```

#### 2.1.3 Search & Filtering
```
Scenario: Search and filter products by category, price, rating

Steps:
1. Navigate to /km/products/search (or use search box)
2. Type product name → results appear in <2s (Meilisearch or fallback to Prisma)
3. Filter by category (e.g., "Electronics") → results update immediately
4. Filter by price range (min 1000 KHR, max 50,000 KHR) → results narrow
5. Filter by rating (4+ stars) → only high-rated items shown
6. Combine filters (category + price + rating) → all filters apply
7. Clear filters → full product list returns
8. Click a filtered result → product detail page loads with filter context preserved

Expected: Filter responses <1s, no empty states without reason, UI shows active filter badges
```

#### 2.1.4 Community Features (if enabled)
```
Scenario: Browse groups and join discussion

Steps:
1. Navigate to /km/community/groups
2. Verify group list loads (public or user's joined groups)
3. Click a group → group detail page shows members, posts, description
4. If public: "Join" button appears → click to join
5. Navigate to group posts feed → latest posts display with timestamps
6. Attempt to create a post → if member, post form appears; if non-member, login/join prompt shows
7. Post a message → posted by user, appears in feed immediately
8. Like a post → like count increments, icon highlights
9. Comment on a post → comment appears in thread

Expected: Real-time updates via WebSocket (chat/posts), no permission errors, post latency <2s
```

### 2.2 Admin Dashboard Flows

#### 2.2.1 Admin Login & Product Management
```
Scenario: Admin logs in and modifies product

Steps:
1. Navigate to /admin (localhost:3001 or production admin URL)
2. Login with ADMIN or INVENTORY_MANAGER role
3. Verify redirected to admin dashboard (not login page)
4. Navigate to Products → verify grid/list loads with current products
5. Click a product → detail/edit page opens
6. Edit fields: title, description, price, stock
7. Click Save → success notification appears
8. Verify changes persist (refresh page, data still updated)
9. Attempt to add a new product → form appears with all required fields
10. Submit → product appears in product list

Expected: Edit latency <500ms, no permission errors (should not reach NestJS ADMIN checks if SellerProfile rejects), data persistence verified
```

#### 2.2.2 Order & Inventory Management
```
Scenario: View orders and manage inventory

Steps:
1. In admin, navigate to Orders
2. Verify orders list displays with status (pending, paid, shipped, delivered)
3. Click an order → detail page shows customer info, items, shipping address
4. Update order status (e.g., Pending → Shipped) → status changes
5. Navigate to Inventory
6. Verify stock levels display accurately
7. Edit stock for an item → stock updates
8. Verify inventory changes are reflected in product detail (lag <30s)

Expected: Order operations <1s, inventory syncs to frontend within 30s, no stale data
```

### 2.3 Real-time Features

#### 2.3.1 Chat/Messaging
```
Scenario: Send and receive messages in real-time

Steps:
1. User A (frontend) opens /km/messages or chat sidebar
2. User A selects a 1:1 thread with User B (or creates one)
3. User A types a message and sends it
4. User B (different browser/device if possible) receives message within <2s (WebSocket)
5. User B replies → User A receives reply in <2s
6. Verify message history loads when opening thread
7. Send sticker (if enabled): Type :emoji: → sticker appears
8. Send slash command: /shrug → message displays formatted command
9. Verify typing indicator appears (if implemented)

Expected: Message delivery <2s, no message loss, history loads completely, WebSocket stays open
```

#### 2.3.2 Notifications
```
Scenario: User receives notifications in real-time

Steps:
1. User A follows User B (if social features enabled)
2. User B creates a post / goes online / posts in mutual group
3. User A receives notification within <5s
4. Verify notification badge increments in navbar
5. Click notification → navigated to relevant context (post, profile, group)
6. Mark notification as read → badge decrements
7. Test notification across multiple notification types (order status, chat, follow, group activity)

Expected: Notifications <5s delivery, UI badge syncs, click destination correct, no duplicates
```

---

## 3. Internationalization (i18n) Testing

### 3.1 Language Switching
```
Scenario: User switches between Khmer and English

Steps:
1. Navigate to /km/products (default Khmer locale)
2. Verify all UI text in Khmer (brand name, buttons, labels)
3. Verify URLs show /km/ prefix
4. Click language switcher (if present) or manually navigate to /en/products
5. Verify all UI text now in English
6. Verify URLs show /en/ prefix
7. Verify URLs maintain route structure (/en/products, /en/auth/login, etc.)
8. Navigate to product detail in English → detail page also in English
9. Switch back to Khmer → Khmer text returns
10. Verify breadcrumbs, notifications, and system messages all switch language

Expected: Language switch instant, no URL bouncing through middleware, all text switches (no English fallback)
```

### 3.2 Message Key Completeness
```
Scenario: Verify both en.json and km.json have 100% feature parity

Process:
- Compare apps/frontend/messages/en.json and km.json key-by-key
- Ensure no missing keys (if en.json has key, km.json must too)
- Run next-intl validation (if available) or manual key audit

Command:
$ cd apps/frontend && npm run i18n:validate (if script exists) or manual audit

Acceptance:
- [ ] en.json and km.json have identical key structure
- [ ] No untranslated strings (no English fallback in Khmer locale)
- [ ] Special characters (Khmer script) render correctly
- [ ] Date formatting respects locale (DD/MM/YYYY for Khmer, MM/DD/YYYY for US English)
- [ ] Currency displays locale-correct (KHR in Khmer, USD in English if applicable)
```

### 3.3 Locale-Specific Navigation
```
Scenario: Verify i18n navigation middleware preserves locale

Steps:
1. In browser, navigate to http://localhost:3000/products (no locale prefix)
2. Expect middleware redirects to /km/products (Khmer default)
3. Verify URL updates to /km/products, no full-page flicker
4. Navigate to http://localhost:3000/en/products
5. Verify URL stays /en/products, page loads in English
6. Use browser back button → returns to previous locale context
7. Click internal Link component (from @/i18n/navigation) → locale prefix preserved

Expected: No bouncing through multiple redirects, locale sticky in session, back button works
```

---

## 4. Performance Testing

### 4.1 Frontend Page Load (p95)
Test with Lighthouse or WebPageTest:

```
Target: <2s (p95 across all main routes)

Routes to measure:
- /km/ (home)
- /km/products (listing, with filter/pagination)
- /km/products/[id] (product detail)
- /km/auth/login
- /km/user/profile
- /km/cart
- /km/orders (if logged in)
- /km/community/groups (if enabled)
- /admin (admin dashboard)

Metrics:
- First Contentful Paint (FCP): <1s
- Largest Contentful Paint (LCP): <2s
- Cumulative Layout Shift (CLS): <0.1
- Time to Interactive (TTI): <3s

Command:
$ npx lighthouse https://staging.champey.com/km/ --output=html --output-path=./lighthouse-report.html
(Replace with staging environment URL)

Acceptance:
- [ ] All routes achieve Lighthouse score ≥90
- [ ] LCP <2s for all routes
- [ ] FCP <1s for all routes
```

### 4.2 Backend API Response Time (p95)
```
Target: <500ms (p95 across API endpoints)

Key endpoints to measure:
- GET /api/products (list, default 20 items)
- GET /api/products/search (search via Meilisearch)
- GET /api/categories
- GET /api/cart
- POST /api/cart/add
- GET /api/orders
- POST /api/auth/login
- GET /api/threads (chat list)
- POST /api/threads/[id]/messages (send message)

Command (from apps/backend):
$ npx vitest run --config vitest.e2e.config.ts (runs end-to-end specs with timing)

Or manual testing with curl:
$ time curl -H "Authorization: Bearer <token>" https://api.champey.com/api/products
(Check timing in output)

Acceptance:
- [ ] 95th percentile response time <500ms for GET endpoints
- [ ] 95th percentile response time <800ms for POST/PATCH endpoints (creation, updates)
- [ ] Database query time <200ms (log slow queries if >200ms)
- [ ] No N+1 query problems (Prisma + select optimization)
```

### 4.3 Database Query Performance
```
Scenario: Verify no slow queries on common operations

Steps:
1. Enable slow query log in PostgreSQL:
   SET log_min_duration_statement = 200; (log queries >200ms)
2. Run load test or replay production-like traffic
3. Check logs for queries >500ms
4. For each slow query, add index or optimize SELECT fields

Acceptance:
- [ ] No queries >500ms on read operations
- [ ] CREATE/UPDATE operations <1s
- [ ] JOIN operations properly indexed (foreign keys have indexes)
```

---

## 5. Security Verification

### 5.1 HTTPS & TLS
```
Scenario: Verify SSL/TLS certificates and HTTPS enforcement

Steps:
1. Navigate to https://champey.com → connection secure (green lock in browser)
2. Check certificate validity:
   $ openssl s_client -connect champey.com:443 </dev/null 2>/dev/null | openssl x509 -noout -dates
   Expected: notBefore=..., notAfter=... (future date)
3. Verify certificate chain:
   $ openssl s_client -connect champey.com:443 -showcerts </dev/null 2>/dev/null | grep -i "subject"
   Expected: Subject matches domain
4. Test HTTP redirect:
   $ curl -I http://champey.com
   Expected: 301/302 redirect to https://

Acceptance:
- [ ] SSL certificate valid and not self-signed
- [ ] HTTPS enforced (HTTP → HTTPS redirect)
- [ ] Mixed content warnings absent (all resources over HTTPS)
```

### 5.2 CORS & Auth Headers
```
Scenario: Verify CORS policy and authentication headers

API Tests:
1. Verify CORS headers allow frontend origins:
   $ curl -H "Origin: https://champey.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Authorization" \
     -X OPTIONS https://api.champey.com/api/products -v
   Expected: Access-Control-Allow-Origin header includes https://champey.com

2. Verify Authorization header required for protected endpoints:
   $ curl https://api.champey.com/api/cart (no auth header)
   Expected: 401 Unauthorized or 403 Forbidden
   
3. Verify protected endpoints accept valid JWT:
   $ TOKEN=$(curl -X POST https://api.champey.com/auth/login -d '{"email":"user@test.com", "password":"..."}' | jq -r '.access_token')
   $ curl -H "Authorization: Bearer $TOKEN" https://api.champey.com/api/cart
   Expected: 200 OK with cart data

Acceptance:
- [ ] CORS allows frontend, rejects other origins
- [ ] Protected endpoints return 401 without token
- [ ] Valid JWT grants access
- [ ] Invalid/expired JWT returns 401
```

### 5.3 Rate Limiting
```
Scenario: Verify rate limiting prevents brute force

Steps:
1. Send 50 login attempts in <10 seconds:
   $ for i in {1..50}; do curl -X POST https://api.champey.com/auth/login -d '{"email":"attacker@test.com", "password":"wrong"}'; done
   Expected: First N requests (e.g., 5) succeed/fail normally, then 429 Too Many Requests for remainder

2. Verify rate limit header:
   $ curl -v https://api.champey.com/auth/login
   Expected: Headers include:
   - RateLimit-Limit: 5
   - RateLimit-Remaining: X
   - RateLimit-Reset: timestamp

3. Verify rate limit expires:
   - Wait 60 seconds, retry login attempts
   - Expected: Requests succeed again

Acceptance:
- [ ] Rate limiting active on /auth/login (5–10 attempts per minute per IP)
- [ ] Rate limiting active on /auth/register (5 per 10 minutes per IP)
- [ ] Rate limit headers present
- [ ] No infinite lockout (limits reset after window expires)
```

### 5.4 Input Validation & XSS
```
Scenario: Verify input validation and XSS protection

Steps:
1. Attempt SQL injection in search:
   $ curl "https://api.champey.com/api/products/search?q=test'; DROP TABLE products;--"
   Expected: Query treated as literal string, no error, results if match found

2. Attempt XSS in comment/post (if enabled):
   - Navigate to /km/community or create comment with HTML: <script>alert('xss')</script>
   - Expected: Script not executed, text displayed as-is (or sanitized HTML)
   - Check page source: script tags removed or escaped

3. Attempt CSV injection in export (if applicable):
   - Export product list as CSV with malicious formula: =cmd|'/c calc'!A1
   - Expected: Formula neutralized (leading = removed or quoted)

Acceptance:
- [ ] No SQL injection vulnerabilities (queries parameterized via Prisma)
- [ ] No XSS vulnerabilities (output sanitized, DOMPurify in place if storing HTML)
- [ ] No CSV injection (leading formulas neutralized)
```

### 5.5 Sensitive Data Protection
```
Scenario: Verify passwords and tokens not logged/exposed

Steps:
1. Check backend logs for leaked credentials:
   $ grep -r "password\|token\|secret" apps/backend/src --include="*.ts" | grep console.log
   Expected: No matches (or only in comments explaining why logs are safe)

2. Verify environment variables not exposed:
   $ curl https://api.champey.com/health (or public endpoint)
   Expected: Response does not include DATABASE_URL, JWT_SECRET, API_KEYS, etc.

3. Verify auth cookies are HttpOnly:
   - Login, check browser DevTools: Application → Cookies
   - Expected: Cookies have "HttpOnly" flag set (not accessible via JavaScript)

Acceptance:
- [ ] No credentials in logs or responses
- [ ] JWT tokens not exposed in URLs or localStorage (use HttpOnly cookies or sessionStorage)
- [ ] Environment variables stay private
```

---

## 6. Verification Checklist

Before declaring Phase 3 complete, verify:

### Pre-Launch Sign-Off
- [ ] **Engineering Lead**: All CI/CD tests pass, no merge conflicts, build succeeds
- [ ] **Product Lead**: All critical user journeys tested and working (auth, browse, cart, orders)
- [ ] **Security Lead**: HTTPS, auth, rate limiting, XSS/SQL injection tested
- [ ] **DevOps/Ops Lead**: Performance benchmarks met (FCP <1s, LCP <2s, API <500ms)
- [ ] **Localization Lead**: All strings in both en.json and km.json, language switching works, no fallbacks
- [ ] **QA Lead**: All test scenarios above pass, screenshot/video evidence collected

### Documentation
- [ ] Known issues documented in RELEASE-NOTES.md or GitHub Issues
- [ ] Breaking changes (if any) listed with migration guide
- [ ] Deployment runbook reviewed and approved (from PHASE-4-LAUNCH.md)
- [ ] Rollback procedures tested and documented

### Infrastructure
- [ ] Staging environment mirrors production (same DB engine, versions, scaling)
- [ ] Load balancer health checks configured and tested
- [ ] DNS records reviewed (A records, TXT records for email, etc.)
- [ ] CDN (if used) cache headers validated
- [ ] Backups tested on staging (restore drill completed)

---

## 7. Test Results Log

Use this section to record results as you execute tests:

```markdown
### Test Execution Date: [DATE]
### Executed By: [NAME]
### Environment: staging.champey.com

#### CI/CD Pipeline
- [ ] Status: PASS / FAIL / BLOCKED
- Build time: __ minutes
- Notes: __________

#### Frontend Public Flows
- Auth flow: PASS / FAIL / BLOCKED — Notes: __________
- Browse & cart: PASS / FAIL / BLOCKED — Notes: __________
- Search & filter: PASS / FAIL / BLOCKED — Notes: __________
- Community (if enabled): PASS / FAIL / BLOCKED — Notes: __________

#### Admin Dashboard
- Login & products: PASS / FAIL / BLOCKED — Notes: __________
- Orders & inventory: PASS / FAIL / BLOCKED — Notes: __________

#### Real-time
- Chat: PASS / FAIL / BLOCKED — Notes: __________
- Notifications: PASS / FAIL / BLOCKED — Notes: __________

#### i18n
- Language switching: PASS / FAIL / BLOCKED — Notes: __________
- Message completeness: PASS / FAIL / BLOCKED — Notes: __________
- Locale navigation: PASS / FAIL / BLOCKED — Notes: __________

#### Performance
- Frontend (Lighthouse): PASS / FAIL / BLOCKED — Score: __ / 100
- Backend API (p95): PASS / FAIL / BLOCKED — Median: __ ms
- Database queries: PASS / FAIL / BLOCKED — Slowest: __ ms

#### Security
- HTTPS & TLS: PASS / FAIL / BLOCKED — Notes: __________
- CORS & auth: PASS / FAIL / BLOCKED — Notes: __________
- Rate limiting: PASS / FAIL / BLOCKED — Notes: __________
- Input validation & XSS: PASS / FAIL / BLOCKED — Notes: __________
- Sensitive data: PASS / FAIL / BLOCKED — Notes: __________

#### Sign-Off
- Engineering: __ (initials/date)
- Product: __ (initials/date)
- Security: __ (initials/date)
- DevOps: __ (initials/date)
- Localization: __ (initials/date)
- QA: __ (initials/date)

#### Issues Found
- Issue 1: [TITLE] — Severity: P1/P2/P3 — Resolved: YES/NO
- Issue 2: [TITLE] — Severity: P1/P2/P3 — Resolved: YES/NO

#### Overall Result
**Status**: READY FOR LAUNCH / NEEDS FIXES / BLOCKED

Next steps: __________
```

---

## 8. Phase 3 Gate

**Success Criteria**:
1. ✅ All CI/CD workflows pass on staging
2. ✅ All critical user journeys complete without errors
3. ✅ i18n fully tested (both languages complete, no fallbacks)
4. ✅ Performance benchmarks met (FCP <1s, LCP <2s, API <500ms)
5. ✅ Security controls verified (HTTPS, auth, rate limiting, input validation)
6. ✅ All team leads sign off (engineering, product, security, devops, localization, QA)

**When complete**: Move to Phase 4 (Launch Procedures)

---

## Appendix: Test Data & Credentials

Use the following for testing (create/update as needed):

```
Admin account:
- Email: admin@champey.com
- Password: AdminTest123!

Test customer account:
- Email: customer@test.com
- Password: CustomerTest123!

Test Seller account (if applicable):
- Email: seller@test.com
- Password: SellerTest123!

Test products (should exist in seed):
- Product 1: MacBook Pro (high price, images, reviews)
- Product 2: Mouse (low price, no reviews initially)
- Product 3: USB Cable (multiple in stock)

Test categories:
- Electronics
- Accessories
- Books

Test group (if applicable):
- Group name: QA Test Group
- Members: admin, test-customer, test-seller
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-09-01  
**Maintained By**: DevOps / QA Lead  
**Next Review**: After Phase 3 completion or phase gate revision
