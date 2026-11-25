# OHS Player Reference Web Portal

Monorepo for the **OHS Player Web** portal: the publishable **`ohs-player-web-core`** library (OIDC Authorization Code + PKCE, RBAC, a unified FHIR client, feature flags, theming, i18n, SDC forms and Radix-based behaviour), the **`ohs-player-web-shell`** package (the portal frame, primitive kit and extension host), and the applications built on them.

## Layout

- [`apps/ohs-player-web`](apps/ohs-player-web) — Vite + React reference portal (users, locations, organizations, care teams, setup wizard, FHIR viewer).
- [`apps/ohs-player-web-example`](apps/ohs-player-web-example) — A second application on the shell, with one extension (`schedules`).
- [`packages/ohs-player-web-core`](packages/ohs-player-web-core) — Library published as `ohs-player-web-core`.
- [`packages/ohs-player-web-shell`](packages/ohs-player-web-shell) — Portal frame, primitive kit and extension host, published as `ohs-player-web-shell`.
- [`docker-compose.yml`](docker-compose.yml) — Local HAPI FHIR R4, Keycloak (realm import), optional nginx dev gateway in front of FHIR.
- [`docs/`](docs/) — [Architecture overview](docs/ARCHITECTURE.md), [`CORE_PUBLIC_API.md`](docs/CORE_PUBLIC_API.md) (full `ohs-player-web-core` public API), [quickstart](docs/QUICKSTART.md), [customization tour](docs/CUSTOMIZING.md), [extension guide](docs/EXTENDING.md), [theming](docs/THEMING.md) and [deployment](docs/DEPLOYMENT.md).

## Quickstart

See [docs/QUICKSTART.md](docs/QUICKSTART.md).

## User group assignment

The create and edit drawers send IAM membership as `groupIds` to `/api/users`.
The edit and details drawers load current membership from
`GET /api/users/{PractitionerId}/groups`, independently of practitioner details.
This requires the backend user-groups endpoint; practitioner details are not a
membership source. Group roles are shown only with `groups.view`.

Deploy [backend PR #107](https://github.com/ohs-foundation/ohs-player-reference-backend/pull/107)
before deploying these frontend changes.

An omitted `groupIds` leaves membership unchanged; an empty array removes every
group. If membership cannot be loaded, the edit drawer shows an error and omits
`groupIds`, allowing profile changes without replacing unknown membership.

Backend failures distinguish an unchanged user from a saved profile with incomplete
group changes. The drawer keeps the selected groups available for retry and lists
failed group IDs. If creation partially succeeds, it also shows the new Practitioner
ID and sends subsequent saves through `PUT` for that user, avoiding a second `POST`.
Closing the drawer discards the local retry state; edit the existing user to retry
later. Incomplete group syncs are audited as incomplete, rather than as completed
membership changes.

## License

See [LICENSE](LICENSE).
