/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Dynamic filtering reads the server-only question bank.
  // Explicit file tracing makes serverless deployments include this data file.
  outputFileTracingIncludes: {'/*': ['./data/bank.json']},
  // Deployment requires a Node runtime because questions are filtered on the server.
};
export default nextConfig;
