import app from "./app";

const port = Number(process.env.PORT ?? 3030);

app.listen(port, () => {
  console.log(`Bidones app en http://localhost:${port}`);
});

