import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("Cicci2023", 10);
  await prisma.dipendente.upsert({
    where: { nome_cognome: { nome: "Anna", cognome: "Lorusso" } },
    update: { role: "ADMIN", password: hashed },
    create: {
      password: hashed,
      nome: "Anna",
      cognome: "Lorusso",
      role: "ADMIN",
    },
  });
  console.log("Seed ok. Admin: Nome Anna, Cognome Lorusso, Password Cicci2023");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
