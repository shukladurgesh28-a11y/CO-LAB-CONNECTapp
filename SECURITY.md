# Security

## Secret handling

- Store secrets only in local `.env` files or the deployment platform's secret store.
- Never commit `.env`, database URLs with passwords, Firebase credentials, private keys, JWT keys, payment keys, or service-role keys.
- Generate separate, high-entropy `SECRET_KEY` and `JWT_SECRET_KEY` values for every environment.
- Keep Supabase service-role credentials on the backend only. Frontend variables must contain only intentionally public values.
- If a credential has been committed or shared, revoke and rotate it immediately. Removing it in a later commit is not enough.

## GitHub protections

Enable secret scanning and push protection in the repository settings. The repository workflow also runs a dependency and secret scan on pushes and pull requests.

## Reporting

Do not open a public issue containing credentials or exploit details. Contact the project maintainer privately and include reproduction steps without sensitive values.