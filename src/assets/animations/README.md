# Animation assets

- `dashboard-loading.lottie`: the existing post-login dashboard loading animation.

Import assets using the Vite URL suffix, for example:

```js
import animationUrl from "@/assets/animations/dashboard-loading.lottie?url";
```

Use the installed Lottie player, respect reduced motion, and stop loading animations when the associated request completes or fails.
