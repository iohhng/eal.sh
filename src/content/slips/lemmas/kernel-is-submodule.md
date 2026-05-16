---
title: Kernel is Submodule
---

Let $R$ be a ring and $f \colon M \to N$ be an $R$-module [homomorphism](def:module-homomorphism). Then, 
$$
\ker(f) \coloneqq \{ m \in M : f(m) = 0 \}
$$
is an $R$-submodule of $M$. 

:::proof
Let $m \in \ker(f)$ and $r \in R$. Then,
$$
f(r \cdot m) = r \cdot f(m) = r \cdot 0 = 0
$$
so $r \cdot m \in \ker(f)$ as well. Thus, $\ker(f)$ is an $R$-submodule of $M$. 
:::
