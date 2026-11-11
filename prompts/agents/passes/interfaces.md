# Pass: interfaces

For each child, say what it needs from elsewhere and what it must give. Call `report_interfaces` with one entry per child.

- An input is a quantity the child needs before it can be designed. `from` names the sibling that provides it, `above` if the design above hands it to this system, or `requirement N` if a requirement sets it.
- An output is a quantity another item or the end result needs from the child, such as the load it carries or a dimension another part attaches to.
- Names are variable-style: letters, digits and underscores, starting with a letter (`loadPerStrut`). Use the same name for an output and for the input that uses it.
- Work out the dependencies from the physics and the documents. If one item's design depends on another's result, record it as an input.
- Do not give values. Give the unit in the note if the documents state one.
