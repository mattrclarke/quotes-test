import prisma from "../app/db.server.js";

async function cleanupSessions() {
  const shop = "dev-hydrogen-2.myshopify.com";
  
  console.log(`Deleting old sessions for ${shop}...`);
  
  const result = await prisma.session.deleteMany({
    where: {
      shop: shop,
    },
  });
  
  console.log(`Deleted ${result.count} session(s)`);
  
  await prisma.$disconnect();
}

cleanupSessions().catch(console.error);
