---
name: Debugging approach
description: How user expects Claude to debug problems before implementing solutions
type: feedback
---

Before implementing any fix, read ALL relevant existing code to understand what it does. Do not guess at data structures or API response formats — look at the actual code or ask the user to show the raw data first. When debugging an API issue, identify the exact failure point from code inspection before writing any solution. Do not propose multiple different solutions in sequence — pick the right one based on evidence. The user finds it extremely frustrating when Claude implements something without understanding the data format first.
