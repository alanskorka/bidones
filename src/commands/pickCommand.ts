import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { executePickFlow } from "../services/pickFlow";
import { isValidIsoDate, todayIsoDate } from "../utils/date";

export async function pickCommand(params: {
  prisma: PrismaClient;
  date?: string;
  listFile: string;
}): Promise<void> {
  const date = params.date ?? todayIsoDate();
  if (!isValidIsoDate(date)) {
    throw new Error(`Fecha inválida: ${date}. Formato esperado YYYY-MM-DD.`);
  }

  const rawListText = await readFile(params.listFile, "utf8");
  const result = await executePickFlow({
    prisma: params.prisma,
    date,
    rawListText
  });

  if (!result.ok) {
    if (result.reason === "empty-list") {
      console.error("La lista está vacía luego del parseo.");
      process.exitCode = 1;
      return;
    }

    console.error("Nombres sin mapear:");
    for (const name of result.unresolvedNames) {
      console.error(`- ${name}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Elegido: ${result.selectedName}`);
  console.log(result.message);
  if (process.env.BIDONES_DEBUG_SELECTION === "1" && "selectionDebug" in result) {
    console.log(JSON.stringify(result.selectionDebug, null, 2));
  }
}
