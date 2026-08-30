## Mock API: HTTP Interceptor vs Service

### Decision

I chose an Angular `HttpInterceptorFn` to implement the mock API behavior instead of putting it inside the `OrganisationService`.

The interceptor intercepts requests to `/api/organisations`, forwards the request to the local fixture at `/assets/organisations.json` using `next()`, and transforms the response in the RxJS pipeline.

It is responsible for simulating API-level behavior:

* 400–900 ms network latency
* approximately 15% random API failures
* 5 requests per minute rate limit
* maximum 25 records per request
* server-side search
* server-side status filtering
* server-side pagination

### Why

The interceptor is a better fit because these behaviors represent **HTTP/API behavior**, rather than application or UI logic.

It also allows the rest of the application to communicate with `/api/organisations` as if a real backend existed. The component and `httpResource` do not need to know that the data is actually coming from a local JSON fixture.

The interceptor can use `next()` to let Angular load the configured asset and then use the HTTP response pipeline to transform the response before it reaches `httpResource`.

This keeps the mock backend behavior isolated from the application code and makes the eventual transition to a real API simpler.

### What I rejected

I rejected implementing the mock API behavior directly inside `OrganisationService`.

That would make the service responsible for both communicating with the API and simulating backend behavior such as rate limiting, latency, filtering and pagination.

I wanted the service/application layer to remain focused on application-level concerns while the interceptor represents the API boundary.

### Trade-off

The interceptor contains more logic than a typical production interceptor because it is acting as a mock backend for this assessment.

In a real application, the filtering, pagination and rate limiting would normally be handled by the backend rather than by an Angular interceptor.

This approach is specifically chosen because the assessment requires no backend and asks for the fixture to be served locally or through a mock server.





---
### AI(ChatGPT) Uses:
- To generate static organisations.json
- To create interceptor to simulate api.