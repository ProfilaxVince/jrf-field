import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  /**
   * Empreinte du build, affichée dans Réglages.
   * Sans elle, impossible de distinguer « le site n'est pas à jour » de
   * « mon navigateur montre une vieille copie » — on cherche alors au hasard.
   * `COMMIT_REF` est fourni par Netlify ; en local la valeur vaut "local".
   */
  env: {
    NEXT_PUBLIC_BUILD_REF: (process.env.COMMIT_REF ?? "local").slice(0, 7),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
