import { makeApp } from "./app";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
makeApp().listen(port, () => {
  console.log(`API on :${port}`);
});
