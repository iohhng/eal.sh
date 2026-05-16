# Authoring Guide

This project is built around **slips**: small mathematical units with stable semantic handles. You write with human-readable keys like `def:module` or `lem:schur`; the site assigns compact display labels like `Definition 0003` or `Lemma 0007`.

## Slip Files

Put slips in:

```text
src/content/slips/definitions/
src/content/slips/examples/
src/content/slips/theorems/
src/content/slips/propositions/
src/content/slips/lemmas/
```

The folder determines the kind and namespace:

```text
definitions/foo.md   -> def:foo
examples/foo.md      -> ex:foo
theorems/foo.md      -> thm:foo
propositions/foo.md  -> prop:foo
lemmas/foo.md        -> lem:foo
```

The filename is the handle. Use lowercase kebab-case:

```text
kernels-are-submodules.md
simple-module.md
```

## Frontmatter

All fields are optional except the file itself.

```yaml
---
title: Schur
aliases: ['schur-lemma']
depends_on: ['lem:kernel-is-submodule', 'lem:image-is-submodule']
generalizes: ['lem:special-case']
example_of: ['def:module']
---
```

Available fields:

```text
title       Display title. Optional.
aliases     Extra handles for references.
depends_on  Hidden proof/body dependencies. Creates dependency graph edges.
generalizes Relations where this slip generalizes listed slips.
example_of  Relations where this slip is an example of listed slips.
```

Inline arrays and block arrays both work:

```yaml
depends_on: ['def:module', 'def:module-homomorphism']
```

```yaml
depends_on:
  - def:module
  - def:module-homomorphism
```

## Labels

The site assigns each slip a global Crockford/base-32 label:

```text
0001
0002
000A
```

The registry lives at:

```text
src/data/slip-labels.json
```

You normally do not edit this. New slips get new labels automatically. References still use semantic keys, not labels.

If needed, you can manually edit the registry, but keep labels unique and preferably four characters.

## References

Use normal Markdown links with slip keys.

Custom text:

```md
[simple module](def:simple-module)
```

If the target exists, this becomes a clickable link. If it does not exist yet, it renders as plain text:

```text
simple module
```

Auto-reference:

```md
By [](lem:schur), ...
```

If the target exists, this renders with the generated label:

```text
By Lemma 0007, ...
```

If the target does not exist yet, it renders as a plain fallback:

```text
By [schur], ...
```

Use auto-references for citation-style prose. Use custom text when grammar demands it.

## Hidden Dependencies

Use `depends_on` when the graph should record a dependency but the prose should not explicitly cite it.

```yaml
depends_on: ['lem:kernel-is-submodule', 'lem:image-is-submodule']
```

These create dependency edges just like inline references, but nothing appears in the rendered body.

Unresolved `depends_on` entries are allowed. They simply do not create edges until the target exists.

## Semantic Relations

`generalizes` means the current slip is more general than the listed slips.

```yaml
generalizes: ['lem:finite-dimensional-case']
```

`example_of` means the current slip is an example of the listed slip.

```yaml
example_of: ['def:module']
```

These relations are separate from dependency. Use them only when the relation is mathematically meaningful.

## Bodies And Proofs

Definitions and examples just have a body.

Results can have a proof:

```md
Let $M$ be a simple $R$-module. Then every nonzero endomorphism of $M$ is an isomorphism.

:::proof
The kernel and image are submodules. Since $M$ is simple, they are forced to be trivial or all of $M$.
:::
```

Proof rules:

```text
Only theorems, propositions, and lemmas may have proofs.
Proof must be top-level.
Proof must be the final content in the slip.
```

The QED marker is inserted automatically.

## Enumerated Lists

Use the `enumerate` directive for mathematical lists:

```md
:::enumerate{style="(i)"}
1. First condition.
2. Second condition.
:::
```

Supported styles:

```text
(i), i, roman, lower-roman
(a), a, alpha, lower-alpha
(1), 1, decimal
```

You can also set a start value:

```md
:::enumerate{style="(a)" start="3"}
1. Starts at c.
:::
```

For nested directives, Markdown requires the outer fence to use more colons than the inner fence.

## Math And Typst

Use standard Markdown math:

```md
$\Hom_R(M,N)$

$$
0 \to A \to B \to C \to 0
$$
```

Typst diagrams use fenced code blocks:

````md
```typst
#align(center, diagram({
  node((0, 0), [$A$])
  node((1, 0), [$B$])
  edge((0, 0), (1, 0), [$f$], "->")
}))
```
````

## Search And Completion Data

The site emits:

```text
/slip-manifest.json
```

It contains keys, labels, kinds, titles, aliases, and URLs. This is intended to power editor completion later.

## Practical Workflow

1. Create a slip in the appropriate folder.
2. Give it a descriptive filename.
3. Add a title if it helps, but do not stress.
4. Write references freely, even to slips that do not exist yet.
5. Use `[](key)` for automatic citation labels.
6. Use `[custom text](key)` when prose needs custom grammar.
7. Use `depends_on` for silent mathematical dependencies.
8. Let the system manage labels.
