# Sign-in

Without `OIDC_ISSUER` the app is open to anyone who can reach it. With it, every page asks for a
sign-in through your provider (Pocket ID, Authentik, Authelia, Keycloak, ...). Register a
confidential client with the redirect URL `<ORIGIN>/auth/callback`. Sessions last 30 days and
renew while in use.

Set `OIDC_ALLOWED_EMAILS` unless the provider already restricts who can use this client. With a
provider anyone can sign up to, leaving it unset lets anyone in.
