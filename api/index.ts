// Vercel's Hono preset discovers functions from api/. Keep this entry tiny so
// the same serverless bridge remains the single source of truth.
export { default } from "../server/vercel/entry";
