# Pass: structure

Decide the systems and parts directly beneath this location, and nothing deeper. Call `report_structure`.

- A system contains other items. A part is a single designed component.
- `count` is the number of identical instances (three identical rods: one entry, count 3).
- `purpose` is one sentence: what it is for.
- List the children in the order they must be designed, so nothing comes before what it needs. Work this out from the physics and the documents; do not wait for the documents to describe the process.
- If the design above describes a child that this location does not contain, or says nothing about what is inside and the documents say nothing either, do not invent a breakdown. Return no children and put what is missing in `openQuestions`.
- Do not assign requirements, interfaces or details here. Those are separate passes.
