---
title: Simple Module Equivalent Conditions
---

Let $R$ be a ring and $M$ be a non-zero $R$-module. The following are equivalent:

:::enumerate{style="(i)"}
1. $M$ is [simple](def:simple-module);
2. $M = Rm$ for every non-zero $m \in M$; and
3. $M \cong R/I$ for some maximal [left ideal](def:left-ideal) $I \subseteq R$.
:::

:::proof
Assume $M$ is simple and let $m \in M$ be non-zero. Then, $Rm$ is non-zero $R$-submodule of $M$, so $Rm = M$ since $M$ is simple.

Conversely, assume $M = Rm$ for every non-zero $m \in M$. Then, any non-zero $R$-submodule $N \subseteq M$ contains at least one non-zero $m \in M$, so 
$$
M = Rm \subseteq N \subseteq M.
$$
Thus, $N = M$ and $M$ is simple. This proves that (i) and (ii) are equivalent.

Assume again that $M$ is simple, so $M$ satisfies (i) and (ii). Let $m \in M$ be non-zero; $M = Rm$ by (ii). The $R$-module homomorphism $\varphi \colon R \to Rm$ defined by $r \mapsto rm$ is manifestly surjective. Thus,
$$
R/{\ker(\varphi)} \cong Rm = M
$$
by the [First Isomorphism Theorem](thm:module-first-isomorphism). By the [Correspondence Theorem](thm:module-correspondence), the $R$-submodules of $R/{\ker(\varphi)} \cong M$ are in bijection with the left ideals of $R$ containing $\ker(\varphi)$. However, $M$ is simple, so this means that $\ker(\varphi)$ is maximal. Therefore, (i) implies (iii). 

Finally, assume that $M \cong R/I$ for some maximal left ideal $I \subseteq R$. Then, the [Correspondence Theorem](thm:module-correspondence) says that the $R$-submodules of $M$ are in bijection with the left ideals of $R$ containing $I$. Since $I$ is maximal, there are only two such left ideals, meaning $M$ is simple. This shows that (iii) implies (i).
:::
