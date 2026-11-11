# Pass: details

Pull out two things the documents state, for each child and for the system as a whole. Call `report_details`.

- `given`: specific values and facts: loads, dimensions, materials, quantities, coordinates. Only what is stated. Quote the numbers and units as the documents give them.
- `intent`: what the documents say about how an item is built, what is inside it, and how it connects to other items. Write it so the agent beneath can work without the original documents. For a system, include everything the documents say about its insides, however many levels down it goes.
- `node` is a child's name exactly as listed, or `this system` for something about the system as a whole.
- Leave out anything the documents do not say. If a child has nothing stated, write nothing for it.
