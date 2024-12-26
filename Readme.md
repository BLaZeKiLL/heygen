# Mock HeyGen Lib
Mock Heygen client lib to fetch status of running jobs

## Project Structure
- `heygen-api` : NestJS backend simulating long running jobs basked on the `JOB_TIME` env variable. exposes the following endpoints
    - `POST /create` : Creates a job and return's it's ID
    - `GET /status/:id` : Returns the status of a given job
    - `SSE /status`: Server side event endpoint for job status multiplexing multiple jobs over single connection
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

### Heygen API

### Errors

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

### Performance : Zero Dependency, Event Based

### Secure : UUID

### Cost Control : SSE vs Polling

### Compatibility, Resiliency and Ease of Use
