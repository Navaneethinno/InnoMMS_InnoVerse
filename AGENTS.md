# Frontend responsibility

Read and follow `CODING.md` before adding or changing features.

- Preserve backend-provided data, labels, language, validation rules, permissions, and business behavior as supplied.
- Do not silently translate, replace, reinterpret, or work around a suspected backend mistake in the frontend.
- Flag suspected backend issues to the user with the observed behavior and supporting evidence. Obtain explicit direction before introducing an override.
- Fix frontend-owned UI text, rendering, and state handling within the frontend's responsibility.

# Astra Polaris portal: do not sync

A separate copy of this portal for Astra Polaris (institution 19) lives in
`E:\InnoVerse\AstraPolaris\merchant-portal` (repo `AstraPolaris_MerchantPortal`).

- **Never update, merge, pull or push changes from this repo into the Astra
  Polaris portal unless the owner explicitly says so for that change.**
- Work in this repo stays in this repo.
