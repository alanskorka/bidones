import app from "./app";

const port = Number(process.env.PORT ?? 3030);

app.listen(port, "0.0.0.0", () => {
  console.log(`Bidones app en http://0.0.0.0:${port}`);
});

