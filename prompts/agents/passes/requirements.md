# Pass: requirements

Say who each requirement applies to. Call `assign_requirements` with exactly one entry for every requirement id you were given.

- `all`: it applies to this location and to everything beneath it (a minimum factor of safety).
- `system`: it applies to this system as a whole and is not passed down (a total mass limit that is checked here, not in each part).
- `children`: it applies only to the children you name in `children`. A requirement can apply to more than one child. Do not name a child it does not apply to.
- Do not write or restate requirements. Cite them by id.
