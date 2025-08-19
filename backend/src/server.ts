import { makeApp } from "./app";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set");

makeApp().listen(port, () => {
  console.log(`API on :${port}`);
});
