---
title: Schur
---

Let $R$ be a ring and $M, N$ be [simple](def:simple-module) $R$-modules. 

:::enumerate{style="(i)"}
1. Any $R$-module homomorphism $f \colon M \to N$ is either an isomorphism or the zero homomorphism.
2. The endomorphism ring $\End_{R}(M)$ is a division ring.
:::

::::proof
Let $f \colon M \to N$ be an $R$-module homomorphism. Since $M$ is simple, $\ker(f) = 0$ or $\ker(f) = M$. If $\ker(f) = M$, then $f$ is the zero homomorphism.

Otherwise, if $\ker(f) = 0$, then $f$ is injective. Since $N$ is also simple, $\im(f) = 0$ or $\im(f) = N$. As $f$ is injective, $\im(f) = N$, so $f$ is surjective thus an isomorphism.
::::
