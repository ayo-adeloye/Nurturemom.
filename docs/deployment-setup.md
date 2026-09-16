# NurtureMom automatic deployment preparation

Status: prepared, NOT enabled or deployed. Inspected September 16, 2026.

## Verified findings

- Connected GitHub account: ayo-adeloye.
- Repository: https://github.com/ayo-adeloye/Nurturemom. (the trailing period is part of its name).
- Default branch: main. Inspected commit: 51906c1e7a22bd726a4c053f1e4da3958de2a01f.
- Six files: index.html, config.js, sw.js, CNAME, DEPLOY.txt, README.md.
- No package manifest, build system, workflow, Cloudflare configuration, or server code in that tree.
- DEPLOY.txt instructs a manual upload and preservation of existing notification configuration.
- CNAME contains mynurturemom.com.
- The browser successfully loaded https://mynurturemom.com/. Its title is "NurtureMom — Your recovery, your village" and it displays onboarding with Create my space and Sign in.
- Repository index.html has title "NurtureMom — My Village" and starts with the village screen. It is not the same entry page as the working site.
- Repository code references manifest.webmanifest, icon.svg and accept.html, none of which exist in the inspected tree.
- The user confirmed Cloudflare is the host. DNS also resolves through Cloudflare. The exact product (Pages or Workers), project and deployment mode remain unverified.
- The available Cloudflare browser session requires login. Account, project, deployment mode, bindings and production files could not be inspected.
- No live app, domain, database, production branch, or hosting settings were changed.

## Choose the existing host's path

1. Sign into Cloudflare and inspect Workers & Pages. Locate the project serving mynurturemom.com and record its name, account ID, production branch, custom domains, source mode, bindings and latest successful deployment.
2. If it is an existing Pages Direct Upload project, use the prepared GitHub Actions workflow with that SAME project. Cloudflare does not support converting a Direct Upload project to Git integration. Keeping the project avoids a domain migration.
3. If it is already Git-integrated Pages, prefer its native push deployments. Connect the correct repository only after recovering the full production source. Use main, framework None, build command "exit 0", and output directory "site" for a verified prebuilt static app. Do not enable two competing deployment systems.
4. If it is a Worker or another origin, do not activate the Pages workflow. Inspect that target's source and configuration first and adapt the pipeline to it.

## Recover the working app before activation

Obtain the complete source or last working deployment package from the original development folder or deployment archive. Compare it with the live deployment. Put the complete public static assets in site/; keep build sources and private credentials outside that folder. Do not copy the current incomplete repository root into site/ merely to satisfy the check.

Preserve production API URLs, public runtime configuration, notification setup, domain and backend configuration. If the actual app includes Pages Functions, a Worker, a framework build or additional assets, adapt the workflow to package them correctly before use; the prepared workflow is specifically for a complete prebuilt static app. Do not reconstruct private backend code from the visible page.

Validate the recovered app in a separate preview deployment first, with appropriate access controls and approved authentication redirect URLs. Check onboarding, sign-in, village invitations, care routines, manifest/icons and notifications as applicable. Record the existing production deployment ID for rollback. No emails or push notifications were sent during this inspection.

## Activate the prepared Pages workflow after verification

- Keep NURTUREMOM_DEPLOY_ENABLED unset until source recovery and preview verification are complete.
- Create a Cloudflare API token with Account / Cloudflare Pages / Edit, scoped to the account containing the existing project. Enter it directly into GitHub secrets; do not paste it into chat or commit it.
- In repository Settings > Secrets and variables > Actions, add secrets CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
- Add repository variable CLOUDFLARE_PAGES_PROJECT with the exact existing project name.
- Verify the project production branch is main and its custom domains include mynurturemom.com. The workflow checks both and stops on a mismatch.
- Review and merge the prepared changes plus the recovered site/ files.
- Set repository variable NURTUREMOM_DEPLOY_ENABLED to true.
- Run the workflow once from Actions on main and verify the deployment URL and live app. A variable change alone does not trigger a run.
- After a successful first run, each push to main deploys automatically. No local CMD or manual host upload is required.
- Set NURTUREMOM_DEPLOY_ENABLED to false to stop future runs; cancel any already running deployment separately. Use the host's previous known-good production deployment for rollback if needed.

The workflow uses read-only repository permission, deploys only site/, serializes production runs, and does not run on pull requests. It is deliberately disabled by default. GitHub may require workflow-write permission to accept the workflow file even when ordinary repository writes are allowed.

## Validation and remaining limits

The repository tree and referenced assets were inspected. The live entry page was visually inspected in a browser. The deployment workflow has not run against Cloudflare: the host and credentials remain unverified, and the production source is not yet in the repository. Activation is not complete.

## Official references

- Direct Upload restrictions: https://developers.cloudflare.com/pages/get-started/direct-upload/
- GitHub Actions deployment and token permissions: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
- Static HTML setup: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
