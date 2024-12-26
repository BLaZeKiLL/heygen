# Mock HeyGen Lib
Mock Heygen client lib to fetch status of running jobs, be sure to read till the end especially the [Library Design](#library-design) part.

>Full documentation with API documentation is hosted [here]()

## Project Structure
- `heygen-api` : NestJS backend simulating long running jobs basked on the `JOB_TIME` env variable. exposes the following endpoints
    - `POST /create` : Creates a job and return's it's ID
    - `GET /status/:id` : Returns the status of a given job
    - `SSE /status`: Server sent event endpoint for job status multiplexing multiple jobs over single connection
- `heygen-lib` : Zero dependency npm client library for Browsers and NodeJS, bundled using Vite
    > NodeJS doesn't support EventSource API yet, to use the SSE backend, [eventsource](https://www.npmjs.com/package/eventsource) must be installed and exposed globally before library initialization
    ```js
    // Globally define EventSource for NodeJS
    import {EventSource} from 'eventsource';
    global.EventSource = EventSource;

    const heygen = new HeyGenAPI({
        url: BASE_URL,
        mode: HeyGenStatusListenerMode.AUTO
    });
    ```
- `heygen-cli` : Integration test for the above api and library, starts the server, creates jobs and waits for them to complete with well structured logs. this project depends on the `heygen-lib` project visible in the [package.json](https://github.com/BLaZeKiLL/heygen/blob/main/heygen-cli/package.json)
    ```json
    "dependencies": {
        "eventsource": "^3.0.2",
        "heygen-lib": "file:../heygen-lib",
        "tree-kill": "^1.2.2"
    }
    ```
    > The integration test creates 5 jobs and if using the default job time of 3000 when the third job is created network change is artificially simulated and the library switches from SSE to POLL which transferring over the listeners giving users are seamless fallback experience.

## Library Usage
The library exposes one main class to interface with Heygen API tactfully named `HeyGenAPI`

### Heygen API
Start by constructing an instance of the class `HeyGenAPI`, as for the options, two are required
- `url` : base url of heygen-api server instance
- `mode` : status listener mode, should be set as `AUTO` for maximum compatibility or `SSE` if you can ensure the `EventSource` API is available for minimum cost
    > AUTO is not set as a default to make the user cognitive of the choice as it has a direct impact on the cost, if using POLL adjust the pollInterval according to the budget, Look at library design decisions to better understand the thought process

There are three more options and their defaults
- `logging` : `false` : enable logging from within the client library
- `fallback` : `false` : auto fallback to POLL of SSE connection disruption, maintains the active listeners
- `pollInterval` : `1000ms` : polling interval for the POLL listener should be changed according to the budget

Example creation of HeyGenAI
```ts
const heygen = new HeyGenAPI({
    url: BASE_URL,
    logging: true,
    mode: HeyGenStatusListenerMode.AUTO
});
```

Once the HeyGenAPI instance is created, you can use the `create()` method to create a job on the backend
```ts
const job_id = await heygen.createJob();
```

To wait for the completion of the above job just call the `waitForJob()` method, which returns a `Promise<void>` that resolves when the job is completed
```ts
await heygen.waitForJob(job_id);
```

Make sure to call `dispose()` when done working with the HeyGenAPI
```ts
heygen.dispose();
```

`listen(job_id: number, callback: StatusCallback)` and `stop(job_id: number)` can be called to start listening and stop listening for all status changes. There are also used internally by `waitForJob()`

Finally `changeBackend(mode)` can be called manually to switch the backend while maintaining the active listeners, but it's better to set `fallback` as true in options to handle fallbacks on network disruptions. This can also be used to upgrade POLL to SSE while maintaining active listeners.

### Errors

At anytime the library can throw errors due to illegal operations and network issue, while fallback mechanism tries to handle some of the network issue not all issues can be handled at library level

Here are some of the possible errors
- `SSEError` : Server Sent Event connection error, fallback will be attempted if configured else thrown to the user application.
- `JobNotFoundError` : User tried to access a job that doesn't exist on the server or user doesn't have authorization for it
- `MessageParseError` : JSON parse error for server messages at the client side
- `ListenerNotFoundError` : User tried to stop a non-active listener

## Running Integration Tests
Integration tests for this mock setup can be run in 3 ways

### Github Actions (Recommended)
Github actions are setup to run the integration test, providing a zero-config way to test the library

#### Steps
- Head over to the [action page](https://github.com/BLaZeKiLL/heygen/actions/workflows/ci.yml), make sure you are on the `Heygen Integration Test` action
- Click on `Run Workflow` at the top right, you can change the time it takes for the `heygen-api` to complete a job here, it defaults to 3000
- Refresh the page if required to see the workflow scheduled, and you can go check the logs of the `main` job.

Here are the [logs](https://github.com/BLaZeKiLL/heygen/actions/runs/12498126508/job/34871539132) of a previous run for an example.

### Docker
For convenience docker images are built using Github Actions and hosted using Github Container Registry, these can be pulled using the following commands depending on your OS Arch.

#### Linux/ARM64
```sh
docker pull ghcr.io/blazekill/heygen:main-4e277b5-arm64
```

#### Linux/AMD64
```bash
docker pull ghcr.io/blazekill/heygen:main-4e277b5-amd64
```

#### Build from source
These images can be built locally by cloning the repository and building the [Dockerfile](https://github.com/BLaZeKiLL/heygen/blob/main/Dockerfile) at the root of the repository.

You can also run the [Docker build github action](https://github.com/BLaZeKiLL/heygen/actions/workflows/cd.yml) to build and push new images to the github container registry which are visible [here](https://github.com/BLaZeKiLL/heygen/pkgs/container/heygen)

### Running Locally
Follow the following steps to run the integration test locally

- clone the repository
    ```sh
    git clone https://github.com/BLaZeKiLL/heygen.git
    ```
- cd into `heygen-cli`
    ```sh
    cd heygen-cli
    ```
- Yarn install : the way scripts in the [package.json](https://github.com/BLaZeKiLL/heygen/blob/main/heygen-cli/package.json) are setup they will install and build the other two projects when the cli project is installed
    ```sh
    yarn install
    ```
- Yarn start : you can use the `JOB_TIME` env var to change the time it takes for heygen-api to complete a job. Now you should see the job logs with timestamps which should be as accurate as NodeJS can be
    ```sh
    yarn start
    ```

## Library Design
The original problem statement stated
> If the status is fetched very frequently then it has a cost, if it's fetched too slowly it might cause unnecessary delays in getting the status.

Keeping this as the top priority I added a few other constraints Focusing on Performance, Security and Compatibility

### Cost Control : SSE vs Polling
Job scheduling is an asynchronous process and usually involves a distributed queue to coordinate and signal completion of the job at the backend, To get this information to the frontend, Polling a status endpoint is the simplest approach.

A better approach is to use [Server Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) which operate similarly as a GET request but keep the connection alive and can respond multiple times, asynchronously.

A single connection can multiplex for multiple jobs and any number of job status can be deliverer at the cost of single connection (assuming per invocation costing model) providing the user with minimum cost and most accurate status.

But it comes with downside of maintaining an active tcp connection and may not be compatible with old browsers.

To handle that the library comes with a fallback polling backend with a configurable polling interval so the user can budget it accordingly.

The library can query the platform for capabilities and decide if SSE can be used giving the best possible experience to the user.

Given a choice SSE should be preferred over Polling in this scenario, especially when we have short running jobs which won't require the connections to be open for hours (Heygen video translation takes few minutes, source Google)

### Performance : Zero Dependency

Size of a frontend library is very important as it can impact startup time of applications and third party libraries shouldn't add any extra time than required

For this reason I made sure the library doesn't have any runtime dependency and outputs a small `4kb` minified bundle

Built purely using browser and standard api's ❤️

### Secure : UUID

In a real application the library and the server would integrate a proper authentication and authorization mechanism, but I believe anonymous authorization can be used in few cases and is very simple to implement

The library tags each request with a uuid generated once when the library is initialized (this uuid can be stored in local storage for more persistence)

All resource in the backend are accessed after verification of the UUID

### Resiliency and Ease of Use

`EventSource` has a wide compatibility according to [MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventSource#browser_compatibility) but network disruptions can hamper long open connections hence a fallback mechanism is crucial as accurate status of jobs is very important

Tough the accuracy of status in polling mode depends on the poll interval which comes with a cost it gives users at least an option better than no status

The library takes care of moving to this fallback and transferring over all the registered listeners to the new backend, promoting ease of use.

On the point of each of use, callbacks are hard to manage hence the library exposes utility functions like `waitForJob()` which wrap callbacks in promises so that they can be used with the async/await syntax.