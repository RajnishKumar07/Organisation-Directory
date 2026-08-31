# Technical Decisions

## Mock API: HTTP Interceptor vs Service

### Decision

I chose an Angular `HttpInterceptorFn` to implement the mock API instead of putting the logic inside an `OrganisationService`.

The interceptor handles requests for `/api/organisations` and simulates API behaviour:

- 400–900 ms network latency
- Approximately 15% random API failures
- 5 requests per minute rate limit
- Maximum 25 records per request
- Server-side search
- Server-side status filtering
- Server-side pagination

The interceptor loads the configured local fixture through the Angular HTTP pipeline and transforms the response before it reaches `httpResource`.

### Why

These behaviours represent **HTTP/API behaviour**, rather than application or UI logic.

This allows the application to communicate with `/api/organisations` as if a real backend existed. The component and `httpResource` do not need to know that the data comes from a local fixture.

It also keeps the mock backend behaviour isolated, making the transition to a real API simpler.

### What I rejected

I rejected putting the mock API behaviour inside `OrganisationService`.

That would make the service responsible for both API communication and backend simulation such as latency, rate limiting, filtering and pagination.

### Trade-off

In a real application, filtering, pagination and rate limiting would normally be handled by the backend.

The interceptor is used here because the assessment requires the application to work without a backend.

---

## Organisation List

### Decision

I chose Angular `httpResource` directly in the List component for loading organisation data.

The component manages:

- Search
- Status filter
- Current page
- Accumulated grid data

`httpResource` manages the request lifecycle:

- Loading
- Success
- Error
- Retry

### Search & Filter

Search is debounced before making the request to avoid unnecessary API calls.

Search and status are also reflected in the URL so a filtered view can be shared.

Example:

`/organisation?search=globex&status=active`

Changing either filter resets pagination to page 1.

### Pagination & Infinite Scroll

The API remains page-based, but the UI uses infinite scrolling.

The first page replaces `rowData`, while subsequent pages are appended:

```text
Page 1 → replace
Page 2 → append
Page 3 → append
```
## Conflict 1 — Pagination vs "Show Everything"

### Decision

I chose **paginated API requests with infinite scrolling** instead of loading all organisations at once.

The API allows a maximum of **25 records per request**, with **137 total records** and a limit of **5 requests per minute**.

The UI therefore loads the first 25 records and automatically loads the next page when the user reaches the end of the list. Previously loaded records remain visible.

### Why

This respects the API contract and avoids making a large number of requests at once.

Infinite scrolling also addresses the ops team's concern about repeatedly clicking "Next" while keeping the API's page-size and rate-limit constraints.

### Trade-off

The user does not receive all 137 records in the initial response, but they can continuously scroll through the complete dataset without manually changing pages.

---

## Conflict 2 — Status Colour vs Accessibility

### Decision

I chose a **coloured status dot with an accessible label and tooltip**.

The status text is not displayed visually, as requested by the designer. However, the status is still available through `aria-label` and the tooltip.

### Why

This keeps the table visually clean while ensuring that status information is not communicated through colour alone.

Supported statuses are represented visually by different colours, while assistive technologies receive the actual status:

* Active
* Inactive
* Suspended
* Unknown status

### Trade-off

The visible UI contains no status text, so users who cannot distinguish the colours rely on the accessible label or tooltip to understand the status.

---

## AI (ChatGPT) Uses

* To generate the static `organisations.json` fixture
* To design the mock API interceptor
* To implement infinite scrolling with AG Grid
