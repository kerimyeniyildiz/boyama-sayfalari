#!/usr/bin/env tsx

import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function main() {
  const cliPassword = process.argv[2];

  let password = cliPassword;

  if (!password) {
    const rl = createInterface({ input, output });
    password = await rl.question(
      "Yeni yönetici şifresini girin (girdi görünür olacaktır): "
    );
    rl.close();
  }

  if (!password) {
    console.error("Şifre boş olamaz.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  console.log("\nAşağıdaki hash'i .env dosyanıza ADMIN_PASSWORD_HASH olarak ekleyin:\n");
  console.log(hash);
  console.log("\nÖrnek: ADMIN_PASSWORD_HASH=" + hash);
}

main().catch((error) => {
  console.error("Hash üretimi başarısız:", error);
  process.exit(1);
});
