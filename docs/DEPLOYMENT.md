# GitHub Pages Deployment

## Repository settings

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Set the source to **GitHub Actions**.
4. Push to `main` or run the workflow manually.

The included `.github/workflows/pages.yml` uploads the repository as a static Pages artifact and deploys it.

## Base path handling

GitHub project Pages sites are normally hosted under:

```text
https://OWNER.github.io/REPOSITORY/
```

Application URLs must remain relative. Avoid root-relative references such as `/css/app.css`; use `./css/app.css` so the site works both under a repository path and a custom domain.

## HTTPS and geolocation

GitHub Pages provides HTTPS, satisfying the secure-context requirement for service workers and browser geolocation.

## Custom domain

A custom domain may later be configured in Pages settings. Add a `CNAME` file only after the domain has been selected.
