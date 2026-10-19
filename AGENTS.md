# Frontend responsibility

- Preserve backend-provided data, labels, language, validation rules, permissions, and business behavior as supplied.
- Do not silently translate, replace, reinterpret, or work around a suspected backend mistake in the frontend.
- Flag suspected backend issues to the user with the observed behavior and supporting evidence. Obtain explicit direction before introducing an override.
- Fix frontend-owned UI text, rendering, and state handling within the frontend's responsibility.
