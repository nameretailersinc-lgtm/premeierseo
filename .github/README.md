# CI/CD

`workflows/ci-cd.yml` checks pull requests targeting `main`, pushes to `main`, and
manual runs. It uses Node 22, `npm ci`, lint, content validation, SEO regressions,
production build and type checking. Require **Quality checks** in the main branch
ruleset to prevent merging failing changes.

After checks pass on `main`, the workflow builds the existing Dockerfile, starts
the resulting standalone container, checks four HTTP routes and publishes the
tested image as `ghcr.io/<lowercase-owner>/<lowercase-repository>:sha-<full-commit>`.
It never deploys the production server. PRs receive no package-write permission
and cannot publish images. Dependabot proposes weekly action updates.

Set optional repository Actions variables `NEXT_PUBLIC_GA_ID`,
`NEXT_PUBLIC_GSC_VERIFICATION` and `NEXT_PUBLIC_BING_VERIFICATION` before building.
These public values are baked into the image. Keep `REPORT_WEBHOOK_URL`,
`PAGESPEED_API_KEY` and `IPINFO_TOKEN` only in the server runtime environment.

To activate, commit and push the workflow to the intended GitHub repository's
`main` branch and ensure Actions is enabled. Two remotes exist: `origin` and
`nameretailers`. Publication follows whichever GitHub repository runs the workflow.
The first GHCR package may be private; grant the server read access or explicitly
choose package visibility in GitHub. No personal token is needed for publication;
the workflow uses its scoped `GITHUB_TOKEN`.

Production deployment must be configured for the chosen server separately. The
existing compose file still builds locally and binds host port 3200; merely
publishing a GHCR image does not update it. No workflow has yet run on GitHub from
this local editing session, and repository settings were not changed.
